import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventFeedPage from './components/EventFeedPage';
import CreateEventPage from './components/CreateEventPage';
import ProfilePage from './components/ProfilePage';
import NetworkPage from './components/NetworkPage';
import LandingPage from './components/LandingPage';
import './App.css';

/**
 * For logged-in users. Redirects to landing page if no token.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  // If no token, redirect to the new landing page
  // We use <Outlet /> to render the nested child routes (e.g., DashboardPage)
  return token ? <MainLayout><Outlet /></MainLayout> : <Navigate to="/" replace />; 
};

/**
 * For logged-out users. Redirects to dashboard if a token is found.
 */
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  // If token exists, redirect to the main app's home page
  return token ? <Navigate to="/home" replace /> : children;
};

/**
 * For organizers only.
 */
const OrganizerRoute = ({ children }) => {
  const userRole = localStorage.getItem('role');
  // If not an organizer, redirect to the main app's home page
  return userRole === 'Organizer' ? children : <Navigate to="/home" replace />;
};


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public-Only Routes --- */}
        {/* These routes are only visible to logged-out users */}
        <Route 
          path="/" 
          element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} 
        />
        <Route 
          path="/login" 
          element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} 
        />
        <Route 
          path="/register" 
          element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} 
        />

        {/* --- Protected App Routes --- */}
        {/* This is a "Layout Route". All nested routes will render
            inside the <MainLayout> component via its <Outlet /> */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/events" element={<EventFeedPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/create-event"
            element={
              <OrganizerRoute>
                <CreateEventPage />
              </OrganizerRoute>
            }
          />
        </Route>

        {/* --- Catch-all 404 --- */}
        {/* Any other path will redirect to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;