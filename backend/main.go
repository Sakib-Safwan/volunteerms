package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	_ "github.com/mattn/go-sqlite3" // Import sqlite3 driver
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwtKey = []byte("my_secret_key")

// --- Struct Definitions ---
type User struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Email           string `json:"email"`
	Role            string `json:"role"`
	ProfileImageURL string `json:"profileImageUrl"`
	IsFollowed      bool   `json."isFollowed"`
}
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}
type SkillsPayload struct {
	Skills []string `json:"skills"`
}
type VolunteerInfo struct {
	ID              int      `json:"id"`
	Name            string   `json:"name"`
	Email           string   `json:"email"`
	ProfileImageURL string   `json:"profileImageUrl"`
	Skills          []string `json:"skills"`
}
type Event struct {
	ID                      int      `json:"id"`
	Name                    string   `json:"name"`
	Date                    string   `json:"date"`
	Description             string   `json:"description"`
	CreatedBy               int      `json:"createdBy"`
	CreatedByEmail          string   `json:"createdByEmail"`
	CreatedByName           string   `json:"createdByName"`
	OrganizerProfilePicture string   `json:"organizerProfilePicture"`
	ImageURL                string   `json:"imageUrl"`
	LocationAddress         string   `json:"locationAddress"`
	IsRegistered            bool     `json:"isRegistered"`
	FollowersGoing          []string `json:"followersGoing"`
	FollowersGoingCount     int      `json:"followersGoingCount"`
}
type RegisterPayload struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}
type Group struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	ProfileImageURL string `json:"profileImageUrl"`
	CreatedByUserID int    `json:"createdByUserID"`
	MemberCount     int    `json:"memberCount"`
	IsMember        bool   `json:"isMember"`
}
type GroupDetails struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	ProfileImageURL   string `json:"profileImageUrl"`
	CreatedByUserID   int    `json:"createdByUserID"`
	Members           []User `json:"members"`
	IsMember          bool   `json:"isMember"`
	IsAdmin           bool   `json:"isAdmin"`
	HasPendingRequest bool   `json:"hasPendingRequest"`
}
type Invitation struct {
	ID         int    `json:"id"`
	Sender     User   `json:"sender"`
	Group      *Group `json:"group,omitempty"`
	InviteType string `json:"inviteType"`
	Status     string `json:"status"`
	CreatedAt  string `json:"createdAt"`
}

// initDB initializes the database and creates tables if they don't exist
func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./vms.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// All table creations are the same as before
	createUserTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL,
		profile_image_url TEXT
	);`
	createEventsTable := `
	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		date TEXT NOT NULL,
		description TEXT,
		location_address TEXT,
		image_url TEXT,
		created_by_user_id INTEGER,
		FOREIGN KEY (created_by_user_id) REFERENCES users (id)
	);`
	createRegistrationsTable := `
	CREATE TABLE IF NOT EXISTS registrations (
		user_id INTEGER,
		event_id INTEGER,
		PRIMARY KEY (user_id, event_id),
		FOREIGN KEY (user_id) REFERENCES users (id),
		FOREIGN KEY (event_id) REFERENCES events (id)
	);`
	createFollowsTable := `
	CREATE TABLE IF NOT EXISTS follows (
		follower_id INTEGER,
		following_id INTEGER,
		PRIMARY KEY (follower_id, following_id),
		FOREIGN KEY (follower_id) REFERENCES users (id),
		FOREIGN KEY (following_id) REFERENCES users (id)
	);`
	createUserSkillsTable := `
	CREATE TABLE IF NOT EXISTS user_skills (
		user_id INTEGER,
		skill TEXT NOT NULL,
		PRIMARY KEY (user_id, skill),
		FOREIGN KEY (user_id) REFERENCES users (id)
	);`
	createGroupsTable := `
	CREATE TABLE IF NOT EXISTS groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT,
		profile_image_url TEXT,
		created_by_user_id INTEGER,
		FOREIGN KEY (created_by_user_id) REFERENCES users (id)
	);`
	createGroupMembersTable := `
	CREATE TABLE IF NOT EXISTS group_members (
		group_id INTEGER,
		user_id INTEGER,
		role TEXT NOT NULL, -- "admin" or "member"
		PRIMARY KEY (group_id, user_id),
		FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
	);`
	createGroupJoinRequestsTable := `
	CREATE TABLE IF NOT EXISTS group_join_requests (
		group_id INTEGER,
		user_id INTEGER,
		PRIMARY KEY (group_id, user_id),
		FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
	);`
	createInvitationsTable := `
	CREATE TABLE IF NOT EXISTS invitations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sender_id INTEGER NOT NULL,
		receiver_id INTEGER NOT NULL,
		invite_type TEXT NOT NULL, -- "group" or "event"
		reference_id INTEGER NOT NULL, -- group_id or event_id
		status TEXT NOT NULL DEFAULT "pending", -- "pending", "accepted", "declined"
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
		FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
	);`

	execOrFatal(db, createUserTable)
	execOrFatal(db, createEventsTable)
	execOrFatal(db, createRegistrationsTable)
	execOrFatal(db, createFollowsTable)
	execOrFatal(db, createUserSkillsTable)
	execOrFatal(db, createGroupsTable)
	execOrFatal(db, createGroupMembersTable)
	execOrFatal(db, createGroupJoinRequestsTable)
	execOrFatal(db, createInvitationsTable)

	log.Println("Database initialized successfully")
}

func execOrFatal(db *sql.DB, sql string) {
	_, err := db.Exec(sql)
	if err != nil {
		log.Fatalf("Failed to execute SQL: %v\nSQL: %s", err, sql)
	}
}

func main() {
	initDB()
	defer db.Close()

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.Static("/uploads", "./uploads")

	// --- Public Routes ---
	r.POST("/register", RegisterHandler)
	r.POST("/login", LoginHandler)
	r.GET("/seed-database", SeedDatabaseHandler)

	// --- Protected Routes ---
	protected := r.Group("/")
	protected.Use(AuthMiddleware())
	{
		// Event
		protected.GET("/events", GetEventsHandler) // Updated
		protected.POST("/events", CreateEventHandler)
		protected.POST("/events/:id/register", RegisterForEventHandler)
		protected.GET("/events/:id/volunteers", GetVolunteersForEventHandler)
		// Dashboard
		protected.GET("/organizer/events", GetOrganizerEventsHandler) // Updated
		protected.GET("/volunteer/events", GetVolunteerEventsHandler) // Updated
		// Profile
		protected.GET("/profile/me", GetMyProfileHandler)
		protected.GET("/profile/skills", GetSkillsHandler)
		protected.POST("/profile/skills", UpdateSkillsHandler)
		protected.POST("/profile/picture", UploadProfilePictureHandler)
		// Follows
		protected.GET("/users", GetUsersHandler) // Updated
		protected.GET("/users/following", GetFollowingHandler)
		protected.GET("/users/followers", GetFollowersHandler)
		protected.POST("/users/follow/:id", FollowUserHandler)
		protected.POST("/users/unfollow/:id", UnfollowUserHandler)
		// Groups
		protected.GET("/groups", GetGroupsHandler)
		protected.POST("/groups", CreateGroupHandler)
		protected.GET("/groups/:id", GetGroupDetailsHandler)
		protected.POST("/groups/:id/leave", LeaveGroupHandler)
		protected.GET("/profile/my-groups", GetMyGroupsHandler)
		// Group Join Requests
		protected.POST("/groups/:id/request-join", RequestJoinGroupHandler)
		protected.POST("/groups/:id/cancel-request", CancelJoinRequestHandler)
		protected.GET("/groups/:id/requests", GetJoinRequestsHandler)
		protected.POST("/groups/:id/requests/approve", ApproveJoinRequestHandler)
		protected.POST("/groups/:id/requests/deny", DenyJoinRequestHandler)
		// Invitation
		protected.GET("/groups/:id/invitable-followers", GetInvitableFollowersHandler)
		protected.POST("/groups/:id/invite", CreateGroupInvitationHandler)
		protected.GET("/notifications", GetNotificationsHandler)
		protected.POST("/notifications/:id/accept", AcceptInvitationHandler)
		protected.POST("/notifications/:id/decline", DeclineInvitationHandler)
	}

	r.Run(":8080")
}

// --- Middleware (Unchanged) ---
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			return
		}
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) { return jwtKey, nil })
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// --- Auth Handlers (Unchanged) ---
func RegisterHandler(c *gin.Context) {
	var payload RegisterPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input. Name, email, password, and role are required."})
		return
	}
	if payload.Name == "" || payload.Email == "" || payload.Password == "" || payload.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input. Name, email, password, and role are required."})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	defaultPFP := fmt.Sprintf("https://placehold.co/100x100/E8F5FF/1D9BF0?text=%s", string(payload.Name[0]))
	query := `INSERT INTO users (name, email, password_hash, role, profile_image_url) VALUES (?, ?, ?, ?, ?)`
	res, err := db.Exec(query, payload.Name, payload.Email, string(hashedPassword), payload.Role, defaultPFP)
	if err != nil {
		log.Println("Register error:", err)
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}
	newID, _ := res.LastInsertId()
	log.Printf("New user registered with ID: %d", newID)
	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}
func LoginHandler(c *gin.Context) {
	var creds Credentials
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	var passwordHash string
	var storedUser User
	query := `SELECT id, role, password_hash FROM users WHERE email = ?`
	err := db.QueryRow(query, creds.Email).Scan(&storedUser.ID, &storedUser.Role, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		log.Println("Login DB error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(creds.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{UserID: storedUser.ID, Role: storedUser.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(expirationTime)}}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "role": storedUser.Role})
}

// --- Event Handlers ---

// UPDATED: GetEventsHandler - New sorting logic
func GetEventsHandler(c *gin.Context) {
	myID := c.GetInt("userID")

	// 1. Get all users the current user follows
	followingIDs := make(map[int]bool)
	followQuery := `SELECT following_id FROM follows WHERE follower_id = ?`
	followRows, err := db.Query(followQuery, myID)
	if err != nil {
		log.Println("GetEvents/Following error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	for followRows.Next() {
		var followingID int
		if err := followRows.Scan(&followingID); err == nil {
			followingIDs[followingID] = true
		}
	}
	followRows.Close()

	// 2. Get all registrations (for all users)
	eventRegistrations := make(map[int][]int)
	regQuery := `SELECT user_id, event_id FROM registrations`
	regRows, err := db.Query(regQuery)
	if err != nil {
		log.Println("GetEvents/Registrations error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	for regRows.Next() {
		var userID, eventID int
		if err := regRows.Scan(&userID, &eventID); err == nil {
			eventRegistrations[eventID] = append(eventRegistrations[eventID], userID)
		}
	}
	regRows.Close()

	// 3. Get all followed user names (for the list)
	followedUserDetails := make(map[int]string)
	if len(followingIDs) > 0 {
		var args []interface{}
		for id := range followingIDs {
			args = append(args, id)
		}
		followedNameQuery := `SELECT id, name FROM users WHERE id IN (?` + strings.Repeat(",?", len(args)-1) + `)`
		followedNameRows, err := db.Query(followedNameQuery, args...)
		if err != nil {
			log.Println("GetEvents/FollowedNames error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		for followedNameRows.Next() {
			var id int
			var name string
			if err := followedNameRows.Scan(&id, &name); err == nil {
				followedUserDetails[id] = name
			}
		}
		followedNameRows.Close()
	}

	// 4. Get all events with new sorting
	today := time.Now().Format("2006-01-02")
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, 
		       e.created_by_user_id, u.email, u.name, u.profile_image_url,
			   -- NEW: Priority column for sorting
			   CASE 
			     WHEN e.id IN (
					SELECT event_id FROM registrations WHERE user_id IN (
						SELECT following_id FROM follows WHERE follower_id = ?
					)
				 ) THEN 1
			     ELSE 2
			   END as priority
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
		WHERE e.date >= ?
		ORDER BY priority ASC, e.date ASC
	`
	rows, err := db.Query(query, myID, today)
	if err != nil {
		log.Println("GetEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		var priority int // We scan priority but don't need to send it
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail, &e.CreatedByName, &e.OrganizerProfilePicture, &priority); err != nil {
			log.Println("GetEvents scan error:", err)
			continue
		}

		// 5. Calculate social context
		registrants := eventRegistrations[e.ID]
		e.FollowersGoing = make([]string, 0)
		for _, userID := range registrants {
			if userID == myID {
				e.IsRegistered = true
			} else if followingIDs[userID] {
				e.FollowersGoingCount++
				if len(e.FollowersGoing) < 3 {
					e.FollowersGoing = append(e.FollowersGoing, followedUserDetails[userID])
				}
			}
		}
		events = append(events, e)
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}
func CreateEventHandler(c *gin.Context) {
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
	today := time.Now().Format("2006-01-02")
	if date < today {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot create an event in the past."})
		return
	}
	file, err := c.FormFile("image")
	imageURL := ""
	if err == nil {
		extension := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d-%d%s", time.Now().UnixNano(), userID, extension)
		savePath := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		imageURL = "http://localhost:8080/uploads/" + filename
	}
	query := `INSERT INTO events (name, date, description, location_address, image_url, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`
	res, err := db.Exec(query, name, date, description, locationAddress, imageURL, userID)
	if err != nil {
		log.Println("CreateEvent error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}
	newEventID, _ := res.LastInsertId()
	var createdEvent Event
	queryRow := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, 
		       e.created_by_user_id, u.email, u.name, u.profile_image_url
		FROM events e JOIN users u ON e.created_by_user_id = u.id
		WHERE e.id = ?
	`
	err = db.QueryRow(queryRow, newEventID).Scan(&createdEvent.ID, &createdEvent.Name, &createdEvent.Date, &createdEvent.Description, &createdEvent.LocationAddress, &createdEvent.ImageURL, &createdEvent.CreatedBy, &createdEvent.CreatedByEmail, &createdEvent.CreatedByName, &createdEvent.OrganizerProfilePicture)
	if err != nil {
		log.Println("CreateEvent/QueryRow error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve created event"})
		return
	}
	c.JSON(http.StatusCreated, createdEvent)
}
func RegisterForEventHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	eventIDStr := c.Param("id")
	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}
	var eventDate string
	err = db.QueryRow(`SELECT date FROM events WHERE id = ?`, eventID).Scan(&eventDate)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	today := time.Now().Format("2006-01-02")
	if eventDate < today {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot register for an event in the past."})
		return
	}
	query := `INSERT OR IGNORE INTO registrations (user_id, event_id) VALUES (?, ?)`
	res, err := db.Exec(query, userID, eventID)
	if err != nil {
		log.Println("RegisterForEvent error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Already registered"})
		return
	}
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
	query := `
		SELECT u.id, u.name, u.email, u.profile_image_url
		FROM users u 
		JOIN registrations r ON u.id = r.user_id 
		WHERE r.event_id = ? AND u.role = 'Volunteer'
	`
	rows, err := db.Query(query, eventID)
	if err != nil {
		log.Println("GetVolunteers error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	volunteersMap := make(map[int]*VolunteerInfo)
	var volunteerIDs []interface{}
	for rows.Next() {
		var v VolunteerInfo
		if err := rows.Scan(&v.ID, &v.Name, &v.Email, &v.ProfileImageURL); err != nil {
			log.Println("GetVolunteers scan error:", err)
			continue
		}
		volunteersMap[v.ID] = &v
		volunteerIDs = append(volunteerIDs, v.ID)
	}
	rows.Close()
	if len(volunteerIDs) > 0 {
		skillQuery := `SELECT user_id, skill FROM user_skills WHERE user_id IN (?` + strings.Repeat(",?", len(volunteerIDs)-1) + `)`
		skillRows, err := db.Query(skillQuery, volunteerIDs...)
		if err != nil {
			log.Println("GetVolunteers skills error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error fetching skills"})
			return
		}
		defer skillRows.Close()
		for skillRows.Next() {
			var userID int
			var skill string
			if err := skillRows.Scan(&userID, &skill); err != nil {
				continue
			}
			if v, ok := volunteersMap[userID]; ok {
				v.Skills = append(v.Skills, skill)
			}
		}
	}
	volunteerList := make([]VolunteerInfo, 0, len(volunteersMap))
	for _, v := range volunteersMap {
		volunteerList = append(volunteerList, *v)
	}
	c.JSON(http.StatusOK, gin.H{"volunteers": volunteerList})
}

// --- Dashboard Handlers (UPDATED) ---
func GetOrganizerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	today := time.Now().Format("2006-01-02")
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, 
		       e.created_by_user_id, u.email, u.name, u.profile_image_url
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
		WHERE e.created_by_user_id = ? AND e.date >= ?
		ORDER BY e.date ASC
	`
	rows, err := db.Query(query, userID, today)
	if err != nil {
		log.Println("GetOrganizerEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail, &e.CreatedByName, &e.OrganizerProfilePicture); err != nil {
			log.Println("GetOrganizerEvents scan error:", err)
			continue
		}
		events = append(events, e)
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}
func GetVolunteerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	today := time.Now().Format("2006-01-02")
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, 
		       e.created_by_user_id, u.email, u.name, u.profile_image_url
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
		JOIN registrations r ON e.id = r.event_id
		WHERE r.user_id = ? AND e.date >= ?
		ORDER BY e.date ASC
	`
	rows, err := db.Query(query, userID, today)
	if err != nil {
		log.Println("GetVolunteerEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail, &e.CreatedByName, &e.OrganizerProfilePicture); err != nil {
			log.Println("GetVolunteerEvents scan error:", err)
			continue
		}
		events = append(events, e)
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}

// --- Profile & Skills Handlers (Unchanged) ---
func GetSkillsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	query := `SELECT skill FROM user_skills WHERE user_id = ?`
	rows, err := db.Query(query, userID)
	if err != nil {
		log.Println("GetSkills error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	var skills []string
	for rows.Next() {
		var skill string
		if err := rows.Scan(&skill); err != nil {
			continue
		}
		skills = append(skills, skill)
	}
	c.JSON(http.StatusOK, gin.H{"skills": skills})
}
func UpdateSkillsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	var payload SkillsPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}
	tx, err := db.Begin()
	if err != nil {
		log.Println("UpdateSkills (tx begin) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	_, err = tx.Exec(`DELETE FROM user_skills WHERE user_id = ?`, userID)
	if err != nil {
		tx.Rollback()
		log.Println("UpdateSkills (delete) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if len(payload.Skills) > 0 {
		stmt, err := tx.Prepare(`INSERT INTO user_skills (user_id, skill) VALUES (?, ?)`)
		if err != nil {
			tx.Rollback()
			log.Println("UpdateSkills (prepare) error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		defer stmt.Close()
		for _, skill := range payload.Skills {
			_, err := stmt.Exec(userID, skill)
			if err != nil {
				tx.Rollback()
				log.Println("UpdateSkills (insert) error:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
				return
			}
		}
	}
	if err := tx.Commit(); err != nil {
		log.Println("UpdateSkills (commit) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Skills updated successfully"})
}
func GetMyProfileHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	var u User
	query := `SELECT id, name, email, role, profile_image_url FROM users WHERE id = ?`
	err := db.QueryRow(query, userID).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfileImageURL)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		log.Println("GetMyProfile error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, u)
}
func UploadProfilePictureHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	file, err := c.FormFile("profilePicture")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	extension := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("pfp-%d-%d%s", userID, time.Now().UnixNano(), extension)
	savePath := filepath.Join("uploads", filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
		return
	}
	imageURL := "http://localhost:8080/uploads/" + filename
	query := `UPDATE users SET profile_image_url = ? WHERE id = ?`
	_, err = db.Exec(query, imageURL, userID)
	if err != nil {
		log.Println("UploadPFP error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile picture"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Profile picture updated", "imageUrl": imageURL})
}

// --- Follows Handlers ---

// UPDATED: GetUsersHandler - New sorting logic
func GetUsersHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	searchTerm := c.Query("search")

	// Find my groups
	myGroupIDs := []interface{}{}
	groupRows, err := db.Query(`SELECT group_id FROM group_members WHERE user_id = ?`, myID)
	if err != nil {
		log.Println("GetUsers/MyGroups error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	for groupRows.Next() {
		var gID int
		if err := groupRows.Scan(&gID); err == nil {
			myGroupIDs = append(myGroupIDs, gID)
		}
	}
	groupRows.Close()

	var args []interface{}
	query := `
		SELECT 
			u.id, u.name, u.email, u.role, u.profile_image_url,
			CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END as isFollowed,
			-- Priority 1: In common groups. Priority 2: Everyone else.
			CASE 
				WHEN u.id IN (
					SELECT user_id FROM group_members WHERE group_id IN (?` + strings.Repeat(",?", len(myGroupIDs)-1) + `) AND user_id != ?
				) THEN 1
				ELSE 2
			END as priority
		FROM users u
		LEFT JOIN follows f ON u.id = f.follower_id AND f.following_id = ?
		WHERE u.id != ? 
		AND u.id NOT IN (
			SELECT following_id FROM follows WHERE follower_id = ?
		)
	`
	args = append(args, myGroupIDs...)
	args = append(args, myID, myID, myID, myID)

	if searchTerm != "" {
		query += " AND (u.name LIKE ? OR u.email LIKE ?)"
		likeTerm := "%" + searchTerm + "%"
		args = append(args, likeTerm, likeTerm)
	}

	query += " ORDER BY priority ASC, u.name ASC"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Println("GetUsers error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	allUsers := []User{}
	for rows.Next() {
		var u User
		var priority int
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfileImageURL, &u.IsFollowed, &priority); err != nil {
			log.Println("GetUsers scan error:", err)
			continue
		}
		allUsers = append(allUsers, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": allUsers})
}
func GetFollowingHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	query := `
		SELECT u.id, u.name, u.email, u.role, u.profile_image_url
		FROM users u
		JOIN follows f ON u.id = f.following_id
		WHERE f.follower_id = ?
	`
	rows, err := db.Query(query, myID)
	if err != nil {
		log.Println("GetFollowing error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	myFollowing := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfileImageURL); err != nil {
			log.Println("GetFollowing scan error:", err)
			continue
		}
		myFollowing = append(myFollowing, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": myFollowing})
}
func GetFollowersHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	query := `
		SELECT u.id, u.name, u.email, u.role, u.profile_image_url
		FROM users u
		JOIN follows f ON u.id = f.follower_id
		WHERE f.following_id = ?
	`
	rows, err := db.Query(query, myID)
	if err != nil {
		log.Println("GetFollowers error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	myFollowers := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfileImageURL); err != nil {
			log.Println("GetFollowers scan error:", err)
			continue
		}
		myFollowers = append(myFollowers, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": myFollowers})
}
func FollowUserHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	followIDStr := c.Param("id")
	followID, err := strconv.Atoi(followIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	if myID == followID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot follow yourself"})
		return
	}
	query := `INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`
	_, err = db.Exec(query, myID, followID)
	if err != nil {
		log.Println("FollowUser error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User followed successfully"})
}
func UnfollowUserHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	unfollowIDStr := c.Param("id")
	unfollowID, err := strconv.Atoi(unfollowIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	query := `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`
	_, err = db.Exec(query, myID, unfollowID)
	if err != nil {
		log.Println("UnfollowUser error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User unfollowed successfully"})
}

// --- Group Handlers (Unchanged) ---
func CreateGroupHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	name := c.PostForm("name")
	description := c.PostForm("description")
	if name == "" || description == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and description are required."})
		return
	}
	file, err := c.FormFile("image")
	imageURL := ""
	if err == nil {
		extension := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("group-%d-%d%s", time.Now().UnixNano(), userID, extension)
		savePath := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		imageURL = "http://localhost:8080/uploads/" + filename
	} else {
		imageURL = fmt.Sprintf("https://placehold.co/600x200/1D9BF0/FFFFFF?text=%s", string(name[0]))
	}
	tx, err := db.Begin()
	if err != nil {
		log.Println("CreateGroup (tx begin) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	query := `INSERT INTO groups (name, description, profile_image_url, created_by_user_id) VALUES (?, ?, ?, ?)`
	res, err := tx.Exec(query, name, description, imageURL, userID)
	if err != nil {
		tx.Rollback()
		log.Println("CreateGroup (insert) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}
	newGroupID, _ := res.LastInsertId()
	memberQuery := `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)`
	_, err = tx.Exec(memberQuery, newGroupID, userID, "admin")
	if err != nil {
		tx.Rollback()
		log.Println("CreateGroup (add admin) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add creator as admin"})
		return
	}
	if err := tx.Commit(); err != nil {
		log.Println("CreateGroup (commit) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": newGroupID, "name": name})
}
func GetGroupsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	searchTerm := c.Query("search")
	var args []interface{}
	args = append(args, userID)
	query := `
		SELECT g.id, g.name, g.description, g.profile_image_url, g.created_by_user_id,
		       (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as memberCount,
		       (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ?) as isMember
		FROM groups g
	`
	if searchTerm != "" {
		query += " WHERE g.name LIKE ?"
		args = append(args, "%"+searchTerm+"%")
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Println("GetGroups error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	groups := []Group{}
	for rows.Next() {
		var g Group
		var isMember sql.NullBool
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.ProfileImageURL, &g.CreatedByUserID, &g.MemberCount, &isMember); err != nil {
			log.Println("GetGroups scan error:", err)
			continue
		}
		g.IsMember = isMember.Valid && isMember.Bool
		groups = append(groups, g)
	}
	c.JSON(http.StatusOK, gin.H{"groups": groups})
}
func GetGroupDetailsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var g GroupDetails
	query := `SELECT id, name, description, profile_image_url, created_by_user_id FROM groups WHERE id = ?`
	err = db.QueryRow(query, groupID).Scan(&g.ID, &g.Name, &g.Description, &g.ProfileImageURL, &g.CreatedByUserID)
	if err != nil {
		log.Println("GetGroupDetails (info) error:", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}
	memberQuery := `
		SELECT u.id, u.name, u.email, u.role, u.profile_image_url
		FROM users u
		JOIN group_members gm ON u.id = gm.user_id
		WHERE gm.group_id = ?
	`
	rows, err := db.Query(memberQuery, groupID)
	if err != nil {
		log.Println("GetGroupDetails (members) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	g.Members = []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.ProfileImageURL); err != nil {
			log.Println("GetGroupDetails (scan member) error:", err)
			continue
		}
		g.Members = append(g.Members, u)
	}
	var userRole sql.NullString
	err = db.QueryRow(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&userRole)
	if err == nil {
		g.IsMember = true
		g.IsAdmin = (userRole.String == "admin")
	}
	var requestCount int
	err = db.QueryRow(`SELECT COUNT(*) FROM group_join_requests WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&requestCount)
	if err == nil && requestCount > 0 {
		g.HasPendingRequest = true
	}
	c.JSON(http.StatusOK, g)
}
func LeaveGroupHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var role string
	var memberCount int
	err = db.QueryRow(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&role)
	if err != nil {
		log.Println("LeaveGroup (check role) error:", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this group"})
		return
	}
	if role == "admin" {
		err = db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND role = 'admin'`, groupID).Scan(&memberCount)
		if err == nil && memberCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You are the last admin. Cannot leave group. Delete the group instead."})
			return
		}
	}
	query := `DELETE FROM group_members WHERE group_id = ? AND user_id = ?`
	_, err = db.Exec(query, groupID, userID)
	if err != nil {
		log.Println("LeaveGroup error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Left group successfully"})
}
func GetMyGroupsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	query := `
		SELECT g.id, g.name, g.description, g.profile_image_url, g.created_by_user_id,
		       (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as memberCount
		FROM groups g
		JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = ?
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		log.Println("GetMyGroups error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	groups := []Group{}
	for rows.Next() {
		var g Group
		g.IsMember = true
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.ProfileImageURL, &g.CreatedByUserID, &g.MemberCount); err != nil {
			log.Println("GetMyGroups scan error:", err)
			continue
		}
		groups = append(groups, g)
	}
	c.JSON(http.StatusOK, gin.H{"groups": groups})
}

// --- Group Join Request Handlers (Unchanged) ---
func RequestJoinGroupHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	query := `INSERT OR IGNORE INTO group_join_requests (group_id, user_id) VALUES (?, ?)`
	_, err = db.Exec(query, groupID, userID)
	if err != nil {
		log.Println("RequestJoinGroup error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Join request sent"})
}
func CancelJoinRequestHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	query := `DELETE FROM group_join_requests WHERE group_id = ? AND user_id = ?`
	_, err = db.Exec(query, groupID, userID)
	if err != nil {
		log.Println("CancelJoinRequest error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Join request cancelled"})
}
func GetJoinRequestsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var userRole string
	err = db.QueryRow(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, userID).Scan(&userRole)
	if err != nil || userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not an admin of this group"})
		return
	}
	query := `
		SELECT u.id, u.name, u.email, u.profile_image_url 
		FROM users u
		JOIN group_join_requests r ON u.id = r.user_id
		WHERE r.group_id = ?
	`
	rows, err := db.Query(query, groupID)
	if err != nil {
		log.Println("GetJoinRequests error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	requests := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.ProfileImageURL); err != nil {
			log.Println("GetJoinRequests scan error:", err)
			continue
		}
		requests = append(requests, u)
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}
func ApproveJoinRequestHandler(c *gin.Context) {
	myUserID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var payload struct {
		UserID int `json:"userId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID in request"})
		return
	}
	var myRole string
	err = db.QueryRow(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, myUserID).Scan(&myRole)
	if err != nil || myRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not an admin of this group"})
		return
	}
	tx, err := db.Begin()
	if err != nil {
		log.Println("ApproveJoin (tx begin) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	_, err = tx.Exec(`DELETE FROM group_join_requests WHERE group_id = ? AND user_id = ?`, groupID, payload.UserID)
	if err != nil {
		tx.Rollback()
		log.Println("ApproveJoin (delete) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	_, err = tx.Exec(`INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)`, groupID, payload.UserID, "member")
	if err != nil {
		tx.Rollback()
		log.Println("ApproveJoin (insert) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if err := tx.Commit(); err != nil {
		log.Println("ApproveJoin (commit) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User approved and added to group"})
}
func DenyJoinRequestHandler(c *gin.Context) {
	myUserID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var payload struct {
		UserID int `json:"userId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID in request"})
		return
	}
	var myRole string
	err = db.QueryRow(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, myUserID).Scan(&myRole)
	if err != nil || myRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not an admin of this group"})
		return
	}
	query := `DELETE FROM group_join_requests WHERE group_id = ? AND user_id = ?`
	_, err = db.Exec(query, groupID, payload.UserID)
	if err != nil {
		log.Println("DenyJoin error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User request denied"})
}

// --- Invitation Handlers (Unchanged) ---
func GetInvitableFollowersHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	query := `
		SELECT u.id, u.name, u.email, u.profile_image_url
		FROM users u
		JOIN follows f ON u.id = f.following_id
		WHERE f.follower_id = ?
		AND u.id NOT IN ( SELECT user_id FROM group_members WHERE group_id = ? )
		AND u.id NOT IN ( SELECT user_id FROM group_join_requests WHERE group_id = ? )
		AND u.id NOT IN ( SELECT receiver_id FROM invitations WHERE reference_id = ? AND status = 'pending' )
	`
	rows, err := db.Query(query, myID, groupID, groupID, groupID)
	if err != nil {
		log.Println("GetInvitableFollowers error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.ProfileImageURL); err != nil {
			log.Println("GetInvitableFollowers scan error:", err)
			continue
		}
		users = append(users, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}
func CreateGroupInvitationHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	groupIDStr := c.Param("id")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}
	var payload struct {
		ReceiverID int `json:"receiverId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid receiver ID"})
		return
	}
	var isMember int
	err = db.QueryRow(`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, myID).Scan(&isMember)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}
	query := `
		INSERT INTO invitations (sender_id, receiver_id, invite_type, reference_id, status) 
		VALUES (?, ?, 'group', ?, 'pending')
	`
	_, err = db.Exec(query, myID, payload.ReceiverID, groupID)
	if err != nil {
		log.Println("CreateGroupInvitation error:", err)
		c.JSON(http.StatusConflict, gin.H{"error": "Invitation already sent or user is already a member"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Invitation sent"})
}
func GetNotificationsHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	query := `
		SELECT i.id, i.invite_type, i.status, i.created_at, i.reference_id,
		       s.id, s.name, s.email, s.profile_image_url
		FROM invitations i
		JOIN users s ON i.sender_id = s.id
		WHERE i.receiver_id = ? AND i.status = 'pending'
		ORDER BY i.created_at DESC
	`
	rows, err := db.Query(query, myID)
	if err != nil {
		log.Println("GetNotifications error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()
	notifications := []Invitation{}
	for rows.Next() {
		var inv Invitation
		var groupID sql.NullInt64
		if err := rows.Scan(&inv.ID, &inv.InviteType, &inv.Status, &inv.CreatedAt, &groupID, &inv.Sender.ID, &inv.Sender.Name, &inv.Sender.Email, &inv.Sender.ProfileImageURL); err != nil {
			log.Println("GetNotifications scan error:", err)
			continue
		}
		if inv.InviteType == "group" && groupID.Valid {
			var g Group
			gQuery := `
				SELECT id, name, description, profile_image_url 
				FROM groups WHERE id = ?
			`
			err = db.QueryRow(gQuery, groupID.Int64).Scan(&g.ID, &g.Name, &g.Description, &g.ProfileImageURL)
			if err == nil {
				inv.Group = &g
			}
		}
		notifications = append(notifications, inv)
	}
	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}
func AcceptInvitationHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	notifIDStr := c.Param("id")
	notifID, err := strconv.Atoi(notifIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}
	var inviteType string
	var refID int
	var receiverID int
	query := `SELECT invite_type, reference_id, receiver_id FROM invitations WHERE id = ? AND status = 'pending'`
	err = db.QueryRow(query, notifID).Scan(&inviteType, &refID, &receiverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found or already handled"})
		return
	}
	if receiverID != myID {
		c.JSON(http.StatusForbidden, gin.H{"error": "This is not your invitation"})
		return
	}
	tx, err := db.Begin()
	if err != nil {
		log.Println("AcceptInvite (tx begin) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	_, err = tx.Exec(`UPDATE invitations SET status = 'accepted' WHERE id = ?`, notifID)
	if err != nil {
		tx.Rollback()
		log.Println("AcceptInvite (update) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if inviteType == "group" {
		_, err = tx.Exec(`INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)`, refID, myID, "member")
		if err != nil {
			tx.Rollback()
			log.Println("AcceptInvite (insert member) error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		log.Println("AcceptInvite (commit) error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Invitation accepted"})
}
func DeclineInvitationHandler(c *gin.Context) {
	myID := c.GetInt("userID")
	notifIDStr := c.Param("id")
	notifID, err := strconv.Atoi(notifIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}
	query := `UPDATE invitations SET status = 'declined' WHERE id = ? AND receiver_id = ? AND status = 'pending'`
	res, err := db.Exec(query, notifID, myID)
	if err != nil {
		log.Println("DeclineInvite error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found or already handled"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Invitation declined"})
}

// --- Seeder ---
func SeedDatabaseHandler(c *gin.Context) {
	log.Println("SeedDatabaseHandler pinged. Please use the 'seeder.py' script to seed the database.")
	c.JSON(http.StatusOK, gin.H{
		"message": "Seeding via this API is disabled. Please run the 'seeder.py' script in your project root.",
	})
}
