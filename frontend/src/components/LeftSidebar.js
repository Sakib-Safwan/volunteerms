import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function LeftSidebar() {
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <nav className="left-sidebar">
      <div className="sidebar-sticky-content">
        <div className="nav-brand-logo">
          VMS
        </div>
        
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/home" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Home">🏠</span> Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/events" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Events">📅</span> Events
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/network" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Network">👥</span> Network
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/groups" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Groups">🏘️</span> Groups
            </NavLink>
          </li>
          {/* NEW: Notifications Link */}
          <li className="nav-item">
            <NavLink to="/notifications" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Notifications">🔔</span> Notifications
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/profile" className="nav-pill">
              <span className="nav-icon" role="img" aria-label="Profile">👤</span> Profile
            </NavLink>
          </li>
          
          {userRole === 'Organizer' && (
            <li className="nav-item">
              <NavLink to="/create-event" className="nav-pill">
                <span className="nav-icon" role="img" aria-label="Create Event">✨</span> Create Event
              </NavLink>
            </li>
          )}
        </ul>
        
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default LeftSidebar;