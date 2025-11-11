package main

import (
	"errors" // NEW: For token validation
	"net/http"
	"strings" // NEW: For splitting the "Bearer" token
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// --- Mock Databases ---
var userDB = make(map[string]User)
var eventDB = []Event{} // NEW: Mock database for events
var nextEventID = 1     // NEW: To simulate auto-incrementing IDs

var jwtKey = []byte("my_secret_key")

// --- Struct Definitions ---
type User struct {
	Email    string `json:"email"`
	Password string `json:"password"` // This will be the hashed password
	Role     string `json:"role"`     // "Organizer" or "Volunteer"
}

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// NEW: Event struct, as per SRS [cite: 45]
type Event struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Date        string `json:"date"`
	Description string `json:"description"`
	CreatedBy   string `json:"createdBy"` // Email of the organizer
}

func main() {
	r := gin.Default()

	// NEW: Updated CORS config to allow Authorization header
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// --- Public Routes ---
	r.POST("/register", RegisterHandler)
	r.POST("/login", LoginHandler)

	// NEW: Public route to get all events for the feed
	r.GET("/events", GetEventsHandler)

	// --- Protected Routes ---
	// NEW: Group for routes that require authentication
	protected := r.Group("/")
	protected.Use(AuthMiddleware()) // Apply our auth middleware
	{
		// NEW: Protected route for creating an event
		protected.POST("/events", CreateEventHandler)
	}

	// Start the server
	r.Run(":8080") // Runs on http://localhost:8080
}

// NEW: AuthMiddleware validates the JWT token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		// Check if it's a "Bearer" token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			return
		}

		// Parse and validate the token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Check the signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Token is valid. Store claims in context for handlers to use
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next() // Continue to the protected handler
	}
}

// NEW: GetEventsHandler provides the public event feed
func GetEventsHandler(c *gin.Context) {
	// In a real app, you'd fetch this from your SQL database
	c.JSON(http.StatusOK, gin.H{"events": eventDB})
}

// NEW: CreateEventHandler handles event creation for organizers
func CreateEventHandler(c *gin.Context) {
	// --- Authorization Check ---
	// Get the role from the context (set by the middleware)
	role, exists := c.Get("role")
	if !exists {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Error reading user role"})
		return
	}

	// This implements the SRS rule: "Event creation... by organizers"
	if role.(string) != "Organizer" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Only organizers can create events"})
		return
	}

	// --- Process Request ---
	var newEvent Event

	// Validate the incoming JSON
	if err := c.ShouldBindJSON(&newEvent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event data"})
		return
	}

	// Get the organizer's email from the context
	email := c.GetString("email")

	// Set server-side fields
	newEvent.ID = nextEventID
	newEvent.CreatedBy = email
	nextEventID++ // Increment the ID for the next event

	// "Save" to our mock database
	eventDB = append(eventDB, newEvent)

	// Return the created event
	c.JSON(http.StatusCreated, newEvent)
}

// --- Existing Auth Handlers (No changes needed) ---

// RegisterHandler handles new user registration
func RegisterHandler(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	if _, exists := userDB[user.Email]; exists {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
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
	storedUser, exists := userDB[creds.Email]
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(creds.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
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
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "role": storedUser.Role})
}
