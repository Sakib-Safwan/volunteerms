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
import GroupsPage from './components/GroupsPage';
import GroupDetailsPage from './components/GroupDetailsPage';
import NotificationsPage from './components/NotificationsPage';
import './App.css';

/**
 * For logged-in users. Redirects to landing page if no token.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  // UPDATED: Now renders MainLayout which contains the <Outlet />
  return token ? <MainLayout /> : <Navigate to="/" replace />; 
};

/**
 * For logged-out users. Redirects to dashboard if a token is found.
 */
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/home" replace /> : children;
};

/**
 * For organizers only.
 */
const OrganizerRoute = ({ children }) => {
  const userRole = localStorage.getItem('role');
  return userRole === 'Organizer' ? children : <Navigate to="/home" replace />;
};


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public-Only Routes --- */}
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
        {/* UPDATED: This structure is now simpler.
            ProtectedRoute renders MainLayout, and MainLayout renders the <Outlet/>
            which contains all these child routes.
         */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/events" element={<EventFeedPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;