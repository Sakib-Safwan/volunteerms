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
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

// ... (db, jwtKey, and all Structs are correct) ...
// NEW: A global variable for our database connection
var db *sql.DB

// NEW: Added the missing jwtKey
var jwtKey = []byte("my_secret_key")

// --- Struct Definitions (mostly unchanged) ---
// We can remove the "Password" field from User, as it's only in the DB
type User struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
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
	ID     int      `json:"id"`
	Email  string   `json:"email"`
	Skills []string `json:"skills"`
}
type Event struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Date            string `json:"date"`
	Description     string `json:"description"`
	CreatedBy       int    `json:"createdBy"`
	CreatedByEmail  string `json:"createdByEmail"`
	ImageURL        string `json:"imageUrl"`
	LocationAddress string `json:"locationAddress"`
}

// NEW: Struct for a single registration payload
type RegisterPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// ... (initDB, execOrFatal, main, AuthMiddleware are all correct) ...
// NEW: initDB initializes the database and creates tables
func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./vms.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// Create tables if they don't exist
	// We use "TEXT" for email/role for simplicity
	createUserTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL
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

	createFriendshipsTable := `
	CREATE TABLE IF NOT EXISTS friendships (
		user_id_a INTEGER,
		user_id_b INTEGER,
		PRIMARY KEY (user_id_a, user_id_b),
		FOREIGN KEY (user_id_a) REFERENCES users (id),
		FOREIGN KEY (user_id_b) REFERENCES users (id)
	);`

	createUserSkillsTable := `
	CREATE TABLE IF NOT EXISTS user_skills (
		user_id INTEGER,
		skill TEXT NOT NULL,
		PRIMARY KEY (user_id, skill),
		FOREIGN KEY (user_id) REFERENCES users (id)
	);`

	// Execute creation statements
	execOrFatal(db, createUserTable)
	execOrFatal(db, createEventsTable)
	execOrFatal(db, createRegistrationsTable)
	execOrFatal(db, createFriendshipsTable)
	execOrFatal(db, createUserSkillsTable)

	log.Println("Database initialized successfully")
}

// Helper function to execute SQL and panic on error
func execOrFatal(db *sql.DB, sql string) {
	_, err := db.Exec(sql)
	if err != nil {
		log.Fatalf("Failed to execute SQL: %v\nSQL: %s", err, sql)
	}
}

func main() {
	// NEW: Initialize the database on start
	initDB()
	// Defer closing the database connection
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
	r.GET("/events", GetEventsHandler)

	// NEW: Seeding endpoint
	r.GET("/seed-database", SeedDatabaseHandler)

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
		// Friends Endpoints
		protected.GET("/users", GetUsersHandler)
		protected.GET("/friends", GetFriendsHandler)
		protected.POST("/friends/add/:id", AddFriendHandler)
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
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil // FIXED: This line now compiles
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// --- Auth Handlers (Refactored for SQL) ---
func RegisterHandler(c *gin.Context) {
	// FIXED: Bind all data into one struct
	var payload RegisterPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		// This will now catch if email, password, OR role is missing
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input. Email, password, and role are required."})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert into database using the payload fields
	query := `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`
	res, err := db.Exec(query, payload.Email, string(hashedPassword), payload.Role)
	if err != nil {
		// This likely means UNIQUE constraint failed (user exists)
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

	// Find user in database
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

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(creds.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: storedUser.ID,
		Role:   storedUser.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey) // FIXED: This line now compiles
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "role": storedUser.Role})
}

// --- Event Handlers (Refactored for SQL) ---
func GetEventsHandler(c *gin.Context) {
	// JOIN with users table to get the organizer's email
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, e.created_by_user_id, u.email 
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
	`
	rows, err := db.Query(query)
	if err != nil {
		log.Println("GetEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail); err != nil {
			log.Println("GetEvents scan error:", err)
			continue
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

	// Parse form data
	name := c.PostForm("name")
	date := c.PostForm("date")
	description := c.PostForm("description")
	locationAddress := c.PostForm("locationAddress")

	if name == "" || date == "" || description == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data. Name, date, and description are required."})
		return
	}

	// Handle file upload
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

	// Insert into database
	query := `INSERT INTO events (name, date, description, location_address, image_url, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`
	res, err := db.Exec(query, name, date, description, locationAddress, imageURL, userID)
	if err != nil {
		log.Println("CreateEvent error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	newEventID, _ := res.LastInsertId()

	// Return the created event (we have to SELECT it again to get all fields)
	var createdEvent Event
	queryRow := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, e.created_by_user_id, u.email 
		FROM events e JOIN users u ON e.created_by_user_id = u.id
		WHERE e.id = ?
	`
	err = db.QueryRow(queryRow, newEventID).Scan(
		&createdEvent.ID, &createdEvent.Name, &createdEvent.Date, &createdEvent.Description,
		&createdEvent.LocationAddress, &createdEvent.ImageURL, &createdEvent.CreatedBy, &createdEvent.CreatedByEmail,
	)
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

	// Get all volunteers for this event
	query := `
		SELECT u.id, u.email 
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
	var volunteerIDs []interface{} // For IN query

	for rows.Next() {
		var v VolunteerInfo
		if err := rows.Scan(&v.ID, &v.Email); err != nil {
			continue
		}
		volunteersMap[v.ID] = &v
		volunteerIDs = append(volunteerIDs, v.ID)
	}

	// Now, get skills for these volunteers
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

	// Convert map back to list
	volunteerList := make([]VolunteerInfo, 0, len(volunteersMap))
	for _, v := range volunteersMap {
		volunteerList = append(volunteerList, *v)
	}

	c.JSON(http.StatusOK, gin.H{"volunteers": volunteerList})
}

// --- Dashboard Handlers (Refactored for SQL) ---
func GetOrganizerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, e.created_by_user_id, u.email 
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
		WHERE e.created_by_user_id = ?
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		log.Println("GetOrganizerEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail); err != nil {
			log.Println("GetOrganizerEvents scan error:", err)
			continue
		}
		events = append(events, e)
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}

func GetVolunteerEventsHandler(c *gin.Context) {
	userID := c.GetInt("userID")
	query := `
		SELECT e.id, e.name, e.date, e.description, e.location_address, e.image_url, e.created_by_user_id, u.email 
		FROM events e
		JOIN users u ON e.created_by_user_id = u.id
		JOIN registrations r ON e.id = r.event_id
		WHERE r.user_id = ?
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		log.Println("GetVolunteerEvents error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Name, &e.Date, &e.Description, &e.LocationAddress, &e.ImageURL, &e.CreatedBy, &e.CreatedByEmail); err != nil {
			log.Println("GetVolunteerEvents scan error:", err)
			continue
		}
		events = append(events, e)
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}

// --- Skills Handlers (Refactored for SQL) ---
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

	// Use a transaction to delete old skills and insert new ones
	tx, err := db.Begin()
	if err != nil {
		log.Println("UpdateSkills transaction begin error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// 1. Delete all old skills for this user
	_, err = tx.Exec(`DELETE FROM user_skills WHERE user_id = ?`, userID)
	if err != nil {
		tx.Rollback()
		log.Println("UpdateSkills delete error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error cleaning skills"})
		return
	}

	// 2. Insert new skills
	if len(payload.Skills) > 0 {
		query := `INSERT INTO user_skills (user_id, skill) VALUES `
		var inserts []string
		var args []interface{}
		for _, skill := range payload.Skills {
			inserts = append(inserts, "(?, ?)")
			args = append(args, userID, skill)
		}
		query += strings.Join(inserts, ",")
		_, err = tx.Exec(query, args...)
		if err != nil {
			tx.Rollback()
			log.Println("UpdateSkills insert error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error saving skills"})
			return
		}
	}

	// 3. Commit transaction
	if err := tx.Commit(); err != nil {
		log.Println("UpdateSkills commit error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error committing skills"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Skills updated successfully"})
}

// --- Friends Handlers (Refactored for SQL) ---
func GetUsersHandler(c *gin.Context) {
	myID := c.GetInt("userID")

	// Get all users who are NOT me and NOT my friends
	query := `
		SELECT id, email, role FROM users
		WHERE id != ? 
		AND id NOT IN (
			SELECT user_id_b FROM friendships WHERE user_id_a = ?
		)
	`
	rows, err := db.Query(query, myID, myID)
	if err != nil {
		log.Println("GetUsers error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	allUsers := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Role); err != nil {
			continue
		}
		allUsers = append(allUsers, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": allUsers})
}

func GetFriendsHandler(c *gin.Context) {
	myID := c.GetInt("userID")

	query := `
		SELECT u.id, u.email, u.role
		FROM users u
		JOIN friendships f ON u.id = f.user_id_b
		WHERE f.user_id_a = ?
	`
	rows, err := db.Query(query, myID)
	if err != nil {
		log.Println("GetFriends error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	myFriends := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Role); err != nil {
			continue
		}
		myFriends = append(myFriends, u)
	}
	c.JSON(http.StatusOK, gin.H{"friends": myFriends})
}

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

	// Add mutual friendship in a transaction
	tx, err := db.Begin()
	if err != nil {
		log.Println("AddFriend tx begin error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Add B to A's list
	query1 := `INSERT OR IGNORE INTO friendships (user_id_a, user_id_b) VALUES (?, ?)`
	_, err = tx.Exec(query1, myID, friendID)
	if err != nil {
		tx.Rollback()
		log.Println("AddFriend insert 1 error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error adding friend"})
		return
	}

	// Add A to B's list
	query2 := `INSERT OR IGNORE INTO friendships (user_id_a, user_id_b) VALUES (?, ?)`
	_, err = tx.Exec(query2, friendID, myID)
	if err != nil {
		tx.Rollback()
		log.Println("AddFriend insert 2 error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error adding friend"})
		return
	}

	if err := tx.Commit(); err != nil {
		log.Println("AddFriend commit error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error committing friendship"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend added successfully"})
}

// --- NEW: Seeding Endpoint Handler ---
func SeedDatabaseHandler(c *gin.Context) {
	// This function is HUGE. It inserts sample data.
	// We use "INSERT OR IGGNORE" so it can be run multiple times without error.

	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin transaction"})
		return
	}

	// --- 1. Create Users ---
	users := []struct {
		Email string
		Pass  string
		Role  string
	}{
		{"organizer@vms.com", "pass123", "Organizer"},
		{"vol1@vms.com", "pass123", "Volunteer"},
		{"vol2@vms.com", "pass123", "Volunteer"},
		{"vol3@vms.com", "pass123", "Volunteer"},
	}

	userQuery := `INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`
	userIDs := make(map[string]int)
	userIDCounter := 1

	for _, u := range users {
		hash, _ := bcrypt.GenerateFromPassword([]byte(u.Pass), bcrypt.DefaultCost)
		_, err := tx.Exec(userQuery, userIDCounter, u.Email, string(hash), u.Role)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed users", "details": err.Error()})
			return
		}
		userIDs[u.Email] = userIDCounter
		userIDCounter++
	}

	// --- 2. Create Events (by Organizer) ---
	orgID := userIDs["organizer@vms.com"]
	events := []struct {
		Name     string
		Date     string
		Desc     string
		Location string
		Img      string
	}{
		{"Chittagong Beach Cleanup", "2025-12-25", "Let's clean up Patenga Beach for the holidays!", "Patenga Beach, Chittagong", "http://localhost:8080/uploads/seed_beach.jpg"},
		{"CUET Tech Fair Volunteers", "2026-01-15", "Need volunteers to help manage stalls and guide guests for the annual tech fair.", "Chittagong University of Engineering & Technology", "http://localhost:8080/uploads/seed_cuet.jpg"},
	}

	eventQuery := `INSERT OR IGNORE INTO events (id, name, date, description, location_address, image_url, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
	eventIDs := []int{}
	eventIDCounter := 1
	for _, e := range events {
		_, err := tx.Exec(eventQuery, eventIDCounter, e.Name, e.Date, e.Desc, e.Location, e.Img, orgID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed events", "details": err.Error()})
			return
		}
		eventIDs = append(eventIDs, eventIDCounter)
		eventIDCounter++
	}

	// --- 3. Register Volunteers for Events ---
	vol1ID := userIDs["vol1@vms.com"]
	vol2ID := userIDs["vol2@vms.com"]
	vol3ID := userIDs["vol3@vms.com"]
	event1ID := eventIDs[0]
	event2ID := eventIDs[1]

	regQuery := `INSERT OR IGNORE INTO registrations (user_id, event_id) VALUES (?, ?)`
	if _, err := tx.Exec(regQuery, vol1ID, event1ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed regs 1"})
		return
	}
	if _, err := tx.Exec(regQuery, vol2ID, event1ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed regs 2"})
		return
	}
	if _, err := tx.Exec(regQuery, vol2ID, event2ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed regs 3"})
		return
	}
	if _, err := tx.Exec(regQuery, vol3ID, event2ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed regs 4"})
		return
	}

	// --- 4. Add Friendships (Mutual) ---
	friendQuery := `INSERT OR IGNORE INTO friendships (user_id_a, user_id_b) VALUES (?, ?)`
	// Vol1 <-> Vol2
	if _, err := tx.Exec(friendQuery, vol1ID, vol2ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed friends 1"})
		return
	}
	if _, err := tx.Exec(friendQuery, vol2ID, vol1ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed friends 2"})
		return
	}
	// Vol1 <-> Vol3
	if _, err := tx.Exec(friendQuery, vol1ID, vol3ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed friends 3"})
		return
	}
	if _, err := tx.Exec(friendQuery, vol3ID, vol1ID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed friends 4"})
		return
	}

	// --- 5. Add Skills ---
	skillQuery := `INSERT OR IGNORE INTO user_skills (user_id, skill) VALUES (?, ?)`
	if _, err := tx.Exec(skillQuery, vol1ID, "First Aid"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed skills 1"})
		return
	}
	if _, err := tx.Exec(skillQuery, vol1ID, "Driving"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed skills 2"})
		return
	}
	if _, err := tx.Exec(skillQuery, vol2ID, "Graphic Design"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed skills 3"})
		return
	}
	if _, err := tx.Exec(skillQuery, vol3ID, "Public Speaking"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed skills 4"})
		return
	}

	// --- Commit Transaction ---
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit seed transaction", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Database seeded successfully with sample data!"})
}
