import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventFeedPage from './components/EventFeedPage';
import CreateEventPage from './components/CreateEventPage';
import ProfilePage from './components/ProfilePage';
import NetworkPage from './components/NetworkPage'; // Import NetworkPage
import './App.css';
// import 'leaflet/dist/leaflet.css'; // Removed for stability

// This component checks if a user is logged in
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// This component checks if a user is an Organizer
const OrganizerRoute = ({ children }) => {
  const userRole = localStorage.getItem('role');
  return userRole === 'Organizer' ? children : <Navigate to="/events" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes WITHOUT the 3-column layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Routes WITH the 3-column layout */}
        <Route
          path="/*" // Any other route will use MainLayout
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* These are the "nested" routes that will appear in the middle column */}
          <Route index element={<Navigate to="/home" replace />} /> {/* Default route */}
          <Route path="home" element={<DashboardPage />} />
          <Route path="events" element={<EventFeedPage />} />
          <Route path="network" element={<NetworkPage />} /> {/* Add Network route */}
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="create-event"
            element={
              <OrganizerRoute>
                <CreateEventPage />
              </OrganizerRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;