Volunteer Management System (VMS)

A modern, social platform designed to connect volunteers with organizers. This web application provides a complete ecosystem for creating, discovering, and managing volunteer events, complete with a social network, user profiles, and group management features.

This project is built as part of the Industrial Attachment Program with Synesis IT.

✨ Key Features

Social Network: Users can follow other volunteers and organizers, creating a social feed of activity.

Intelligent Event Feed: The main event feed is sorted by relevance. Events that your followed users are attending appear first, followed by all other upcoming events.

Comprehensive User Profiles: Users have public profiles with a name, profile picture, role (Volunteer/Organizer), and a list of their followers and who they are following.

Skill Management: Volunteers can add specific skills (e.g., "First Aid," "Graphic Design") to their profile.

Event Creation & Management: Organizers can create new events, uploading custom event images and adding real-world locations.

Groups System:

Discover & Search: Users can search for and discover groups.

Admin & Membership: Users can create groups (becoming an admin) or send requests to join existing groups.

Admin Approval: Group admins can approve or deny pending join requests.

Invitations: Group members can invite their followers to join a group.

Notification System: Users receive notifications for group invitations and other pending actions.

Organizer Dashboards:

Organizers have a dashboard to see all events they've created.

They can click on an event to see a list of all registered volunteers and their skills.

Volunteer Dashboards: Volunteers have a dashboard to see all events they are registered for.

🛠️ Tech Stack

Backend: Go (Golang)

Framework: Gin

Database: SQLite 3

Authentication: JWT (JSON Web Tokens)

Password Hashing: bcrypt

Frontend: React

Routing: React Router

HTTP Client: Axios

Styling: Plain CSS with a Twitter-like 2-column layout

Database Seeding: A standalone Python script (seeder.py) using Faker to generate realistic sample data.

🚀 How to Run Locally

To get the project running on your local machine, you'll need to run both the backend and frontend servers.

Prerequisites

Go (1.18+ recommended)

Node.js (v16+ recommended)

Python (3.8+ recommended)

pip install faker bcrypt

1. Backend Setup

The backend server runs on http://localhost:8080.

1. Navigate to the backend folder
cd backend

2. Build the server executable
This creates a 'backend.exe' (Windows) or 'backend' (Mac/Linux)
go build

3. Run the executable to start the server
This will also create your vms.db file for the first time
./backend.exe
(or ./backend on Mac/Linux)

4. Stop the server (Ctrl+C)

5. Run the Python seeder to fill the database
(Run this from the *root* project folder, not the backend folder)
cd ..
py seeder.py

6. Re-start the backend server
cd backend
./backend.exe


Your backend is now running and seeded with data.

2. Frontend Setup

The frontend server runs on http://localhost:3000.

1. Open a *new* terminal
2. Navigate to the frontend folder
cd frontend

3. Install all dependencies
npm install

4. Start the development server
npm start


Your application should now be open and running in your browser!

📂 Project Structure

/volunteerms
  /backend
    /uploads         # Stores all user-uploaded images
    main.go          # The Go/Gin server
    vms.db           # The SQLite database file
    go.mod
  /frontend
    /src
      /components    # All React components
      /hooks         # Custom React hooks (useDebounce)
      App.css        # Main stylesheet
      App.js         # Main router
      index.js
    package.json
  seeder.py          # Python script to seed the database
  README.md          # You are here


👥 Authors

Sakib Md Safwanur Rahman

Atfan Bin Nur
