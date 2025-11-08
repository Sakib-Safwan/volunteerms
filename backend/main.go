package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// A (mock) database for demonstration.
// Per your SRS[cite: 52], you'll replace this with SQLite or PostgreSQL.
var userDB = make(map[string]User)

// Our JWT secret key. This should be kept secret in a real app.
var jwtKey = []byte("my_secret_key")

// User struct holds user information
// Aligns with SRS "Organizer and volunteer registration" [cite: 23]
type User struct {
	Email    string `json:"email"`
	Password string `json:"password"` // This will be the hashed password
	Role     string `json:"role"`     // "Organizer" or "Volunteer"
}

// Credentials struct for login payload
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Claims struct for JWT
type Claims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func main() {
	r := gin.Default()

	// Configure CORS to allow the React frontend (running on localhost:3000)
	// to communicate with the backend.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// --- Public Routes ---
	// This could be your API endpoint for the public event feed [cite: 25] later
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Welcome to the Volunteer Management System API!"})
	})

	// --- Authentication Routes [cite: 57] ---
	r.POST("/register", RegisterHandler)
	r.POST("/login", LoginHandler)

	// Start the server
	r.Run(":8080") // Runs on http://localhost:8080
}

// RegisterHandler handles new user registration
func RegisterHandler(c *gin.Context) {
	var user User
	// Validate input [cite: 63]
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Check if user already exists
	if _, exists := userDB[user.Email]; exists {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Store user (in our mock DB)
	user.Password = string(hashedPassword)
	userDB[user.Email] = user

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

// LoginHandler handles user login
func LoginHandler(c *gin.Context) {
	var creds Credentials
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Check if user exists
	storedUser, exists := userDB[creds.Email]
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Compare passwords
	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(creds.Password)); err != nil {
		// Passwords don't match
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// --- Generate JWT  ---
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Email: storedUser.Email,
		Role:  storedUser.Role,
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

	// Send token back to the client
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "role": storedUser.Role})
}
