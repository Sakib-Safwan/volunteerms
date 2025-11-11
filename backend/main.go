package main

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// --- Mock Databases ---
var (
	// UPDATED: User database now uses integer IDs
	userDB         = make(map[int]User)
	emailToID      = make(map[string]int) // NEW: For fast login lookup
	eventDB        = []Event{}
	registrationDB = make(map[int][]int)    // UPDATED: map[userID] -> []eventID
	userSkillsDB   = make(map[int][]string) // UPDATED: map[userID] -> []skills
	friendshipsDB  = make(map[int][]int)    // NEW: map[userID] -> []friendUserID
	nextUserID     = 1
	nextEventID    = 1
	// --- Mutexes ---
	userDBMutex   = &sync.RWMutex{}
	eventDBMutex  = &sync.RWMutex{}
	regDBMutex    = &sync.RWMutex{}
	skillsDBMutex = &sync.RWMutex{}
	friendDBMutex = &sync.RWMutex{} // NEW
)

var jwtKey = []byte("my_secret_key")

// --- Struct Definitions ---
type User struct {
	ID       int    `json:"id"` // NEW
	Email    string `json:"email"`
	Password string `json:"-"` // Hide password from JSON
	Role     string `json:"role"`
}
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
type Claims struct {
	UserID int    `json:"userId"` // UPDATED: Use ID
	Role   string `json:"role"`
	jwt.RegisteredClaims
}
type SkillsPayload struct {
	Skills []string `json:"skills"`
}
type VolunteerInfo struct {
	ID     int      `json:"id"` // NEW
	Email  string   `json:"email"`
	Skills []string `json:"skills"`
}
type Event struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Date            string `json:"date"`
	Description     string `json:"description"`
	CreatedBy       int    `json:"createdBy"`      // UPDATED: Use ID
	CreatedByEmail  string `json:"createdByEmail"` // NEW: For display
	ImageURL        string `json:"imageUrl"`
	LocationAddress string `json:"locationAddress"`
}

func main() {
	r := gin.Default()
	r.Use(cors.New(cors.Config{ /* ... (same) ... */ }))
	r.Static("/uploads", "./uploads")

	// --- Public Routes ---
	r.POST("/register", RegisterHandler)
	r.POST("/login", LoginHandler)
	r.GET("/events", GetEventsHandler) // This will be updated later for social context

	// --- Protected Routes ---
	protected := r.Group("/")
	protected.Use(AuthMiddleware())
	{
		// Event Management
		protected.POST("/events", CreateEventHandler)
		protected.POST("/events/:id/register", RegisterForEventHandler)
		protected.GET("/events/:id/volunteers", GetVolunteersForEventHandler)

		// Dashboard Endpoints
		protected.GET("/organizer/events", GetOrganizerEventsHandler)
		protected.GET("/volunteer/events", GetVolunteerEventsHandler)

		// Profile/Skills Endpoints
		protected.GET("/profile/skills", GetSkillsHandler)
		protected.POST("/profile/skills", UpdateSkillsHandler)

		// NEW: Friends Endpoints
		protected.GET("/users", GetUsersHandler)
		protected.GET("/friends", GetFriendsHandler)
		protected.POST("/friends/add/:id", AddFriendHandler)
	}

	r.Run(":8080")
}

// --- Middleware (UPDATED) ---
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}
		// UPDATED: Store userID and role
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// --- Event Handlers (UPDATED) ---
func GetEventsHandler(c *gin.Context) {
	eventDBMutex.RLock()
	defer eventDBMutex.RUnlock()
	// Future: We will enhance this to show "friends going"
	c.JSON(http.StatusOK, gin.H{"events": eventDB})
}

func CreateEventHandler(c *gin.Context) {
	// UPDATED: Get user ID from context
	userID := c.GetInt("userID")
	role := c.GetString("role")
	if role != "Organizer" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Only organizers can create events"})
		return
	}

	name := c.PostForm("name")
	date := c.PostForm("date")
	description := c.PostForm("description")
	locationAddress := c.PostForm("locationAddress")

	if name == "" || date == "" || description == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data. Name, date, and description are required."})
		return
	}

	// Get user's email for display
	userDBMutex.RLock()
	userEmail := userDB[userID].Email
	userDBMutex.RUnlock()

	// ... (file handling is the same) ...
	file, err := c.FormFile("image")
	imageURL := ""
	if err == nil {
		extension := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d-%d%s", time.Now().UnixNano(), nextEventID, extension)
		savePath := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		imageURL = "http://localhost:8080/uploads/" + filename
	}

	eventDBMutex.Lock()
	newEvent := Event{
		ID:              nextEventID,
		Name:            name,
		Date:            date,
		Description:     description,
		CreatedBy:       userID,    // UPDATED
		CreatedByEmail:  userEmail, // NEW
		ImageURL:        imageURL,
		LocationAddress: locationAddress,
	}
	nextEventID++
	eventDB = append(eventDB, newEvent)
	eventDBMutex.Unlock()

	c.JSON(http.StatusCreated, newEvent)
}

func RegisterForEventHandler(c *gin.Context) {
	userID := c.GetInt("userID") // UPDATED
	eventIDStr := c.Param("id")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	regDBMutex.Lock()
	defer regDBMutex.Unlock()
	for _, id := range registrationDB[userID] { // UPDATED
		if id == eventID {
			c.JSON(http.StatusConflict, gin.H{"error": "Already registered"})
			return
		}
	}
	registrationDB[userID] = append(registrationDB[userID], eventID) // UPDATED
	c.JSON(http.StatusOK, gin.H{"message": "Registered successfully"})
}

func GetVolunteersForEventHandler(c *gin.Context) {
	role := c.GetString("role")
	if role != "Organizer" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	eventIDStr := c.Param("id")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	registeredUserIDs := []int{} // UPDATED
	regDBMutex.RLock()
	for userID, eventIDs := range registrationDB { // UPDATED
		for _, id := range eventIDs {
			if id == eventID {
				registeredUserIDs = append(registeredUserIDs, userID) // UPDATED
				break
			}
		}
	}
	regDBMutex.RUnlock()

	volunteerList := []VolunteerInfo{}
	userDBMutex.RLock()
	skillsDBMutex.RLock()
	for _, id := range registeredUserIDs { // UPDATED
		if user, ok := userDB[id]; ok && user.Role == "Volunteer" {
			skills := userSkillsDB[id]
			volunteerList = append(volunteerList, VolunteerInfo{
				ID:     user.ID, // NEW
				Email:  user.Email,
				Skills: skills,
			})
		}
	}
	skillsDBMutex.RUnlock()
	userDBMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{"volunteers": volunteerList})
}

func GetOrganizerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID") // UPDATED
	myEvents := []Event{}
	eventDBMutex.RLock()
	defer eventDBMutex.RUnlock()
	for _, event := range eventDB {
		if event.CreatedBy == userID { // UPDATED
			myEvents = append(myEvents, event)
		}
	}
	c.JSON(http.StatusOK, gin.H{"events": myEvents})
}

func GetVolunteerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID") // UPDATED
	regDBMutex.RLock()
	myEventIDs := registrationDB[userID] // UPDATED
	regDBMutex.RUnlock()

	myEvents := []Event{}
	eventDBMutex.RLock()
	defer eventDBMutex.RUnlock()
	for _, event := range eventDB {
		for _, id := range myEventIDs {
			if event.ID == id {
				myEvents = append(myEvents, event)
				break
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"events": myEvents})
}

func GetSkillsHandler(c *gin.Context) {
	userID := c.GetInt("userID") // UPDATED
	skillsDBMutex.RLock()
	skills, exists := userSkillsDB[userID] // UPDATED
	skillsDBMutex.RUnlock()
	if !exists {
		c.JSON(http.StatusOK, gin.H{"skills": []string{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"skills": skills})
}

func UpdateSkillsHandler(c *gin.Context) {
	userID := c.GetInt("userID") // UPDATED
	var payload SkillsPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}
	skillsDBMutex.Lock()
	userSkillsDB[userID] = payload.Skills // UPDATED
	skillsDBMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Skills updated successfully"})
}

// --- NEW Friends Handlers ---

// GET /users - List all users to add as friends
func GetUsersHandler(c *gin.Context) {
	myID := c.GetInt("userID")

	allUsers := []User{}
	userDBMutex.RLock()
	// In a real app, you'd check if they are already friends
	for id, user := range userDB {
		if id != myID {
			allUsers = append(allUsers, user)
		}
	}
	userDBMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{"users": allUsers})
}

// GET /friends - Get my friends list
func GetFriendsHandler(c *gin.Context) {
	myID := c.GetInt("userID")

	friendDBMutex.RLock()
	friendIDs := friendshipsDB[myID]
	friendDBMutex.RUnlock()

	myFriends := []User{}
	userDBMutex.RLock()
	for _, id := range friendIDs {
		if user, ok := userDB[id]; ok {
			myFriends = append(myFriends, user)
		}
	}
	userDBMutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{"friends": myFriends})
}

// POST /friends/add/:id - Add a friend
func AddFriendHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if myID == friendID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot add yourself as a friend"})
		return
	}

	// For simplicity, we make friendship mutual immediately
	friendDBMutex.Lock()
	defer friendDBMutex.Unlock()

	// Add B to A's list
	isAlreadyFriend := false
	for _, id := range friendshipsDB[myID] {
		if id == friendID {
			isAlreadyFriend = true
			break
		}
	}
	if !isAlreadyFriend {
		friendshipsDB[myID] = append(friendshipsDB[myID], friendID)
	}

	// Add A to B's list
	isAlreadyFriend = false
	for _, id := range friendshipsDB[friendID] {
		if id == myID {
			isAlreadyFriend = true
			break
		}
	}
	if !isAlreadyFriend {
		friendshipsDB[friendID] = append(friendshipsDB[friendID], myID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend added successfully"})
}

// --- Auth Handlers (UPDATED) ---
func RegisterHandler(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	userDBMutex.Lock()
	if _, exists := emailToID[user.Email]; exists {
		userDBMutex.Unlock()
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Create new user
	newID := nextUserID
	nextUserID++
	user.ID = newID
	user.Password = string(hashedPassword)

	userDB[newID] = user
	emailToID[user.Email] = newID

	userDBMutex.Unlock()

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

func LoginHandler(c *gin.Context) {
	var creds Credentials
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	userDBMutex.RLock()
	userID, emailExists := emailToID[creds.Email]
	storedUser, userExists := userDB[userID]
	userDBMutex.RUnlock()

	if !emailExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(creds.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: storedUser.ID, // UPDATED
		Role:   storedUser.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "role": storedUser.Role})
}
