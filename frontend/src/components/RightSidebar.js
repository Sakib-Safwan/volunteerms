import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RightSidebar() {
  const [user, setUser] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get('http://localhost:8080/profile/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user for sidebar", err);
        }
      }
    };
    fetchUser();
  }, [token]);

  return (
    <aside className="right-sidebar">
      <div className="sidebar-sticky-content">
        <div className="widget-card">
          <h4>Your Profile</h4>
          {user ? (
            <div className="sidebar-profile">
              <img 
                src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`}
                alt={user.name}
                className="user-card-avatar-small"
              />
              <div className="sidebar-profile-info">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          ) : (
            <p>Welcome!</p>
          )}
        </div>

        <div className="widget-card">
          <h4>Notifications</h4>
          <p>No new notifications.</p>
        </div>
      </div>
    </aside>
  );
}

export default RightSidebar;