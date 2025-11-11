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

  // NavLink adds an "active" class to the link that matches the current URL
  return (
    <nav className="left-sidebar">
      <div className="sidebar-sticky-content">
        <div className="nav-brand-logo">
          VMS
        </div>
        
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/home" className="nav-pill">
              <span className="nav-icon">🏠</span> Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/events" className="nav-pill">
              <span className="nav-icon">📅</span> Events
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/profile" className="nav-pill">
              <span className="nav-icon">👤</span> Profile
            </NavLink>
          </li>
          
          {userRole === 'Organizer' && (
            <li className="nav-item">
              <NavLink to="/create-event" className="nav-pill">
                <span className="nav-icon">✨</span> Create Event
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