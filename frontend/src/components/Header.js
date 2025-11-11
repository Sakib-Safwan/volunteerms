import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Header() {
  const [user, setUser] = useState(null);
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get('http://localhost:8080/profile/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user for header", err);
        }
      }
    };
    fetchUser();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <header className="header-container">
      <nav className="header-nav">
        <div className="header-left">
          <NavLink to="/home" className="header-brand-logo">
            VMS
          </NavLink>
        </div>

        <div className="header-center">
          <NavLink to="/home" className="header-nav-pill">
            <span className="nav-icon" role="img" aria-label="Home">🏠</span>
          </NavLink>
          <NavLink to="/events" className="header-nav-pill">
            <span className="nav-icon" role="img" aria-label="Events">📅</span>
          </NavLink>
          <NavLink to="/network" className="header-nav-pill">
            <span className="nav-icon" role="img" aria-label="Network">👥</span>
          </NavLink>
          <NavLink to="/groups" className="header-nav-pill">
            <span className="nav-icon" role="img" aria-label="Groups">🏘️</span>
          </NavLink>
          {userRole === 'Organizer' && (
            <NavLink to="/create-event" className="header-nav-pill">
              <span className="nav-icon" role="img" aria-label="Create Event">✨</span>
            </NavLink>
          )}
        </div>

        <div className="header-right">
          <NavLink to="/notifications" className="header-nav-pill-icon">
            <span className="nav-icon" role="img" aria-label="Notifications">🔔</span>
          </NavLink>
          <NavLink to="/profile" className="header-nav-pill-icon">
            {user ? (
              <img 
                src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`}
                alt="Profile"
                className="header-profile-avatar"
              />
            ) : (
              <span className="nav-icon" role="img" aria-label="Profile">👤</span>
            )}
          </NavLink>
          <button onClick={handleLogout} className="btn-logout-header">
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;