import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Import Link

function RightSidebar() {
  const [user, setUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]); // State for suggestions
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSidebarData = async () => {
      if (token) {
        try {
          // Fetch current user
          const userRes = await axios.get('http://localhost:8080/profile/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(userRes.data);

          // Fetch user suggestions (using the /users endpoint)
          const suggestionsRes = await axios.get('http://localhost:8080/users', {
            headers: { Authorization: `Bearer ${token}` },
            params: { search: '' } // Get all suggestions
          });
          // Show top 3 suggestions
          setSuggestions(suggestionsRes.data.users.slice(0, 3) || []);

        } catch (err) {
          console.error("Failed to fetch sidebar data", err);
        }
      }
    };
    fetchSidebarData();
  }, [token]);

  return (
    <aside className="right-sidebar">
      <div className="sidebar-sticky-content">
        {/* Your Profile Card */}
        {user && (
          <div className="widget-card">
            <h4>Your Profile</h4>
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
          </div>
        )}

        {/* "Who to Follow" Card */}
        <div className="widget-card">
          <h4>Who to Follow</h4>
          <div className="suggestion-list">
            {suggestions.length > 0 ? (
              suggestions.map(sUser => (
                <div key={sUser.id} className="suggestion-item">
                  <img 
                    src={sUser.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${sUser.name[0]}`}
                    alt={sUser.name}
                    className="user-card-avatar-small"
                  />
                  <div className="user-card-info">
                    <strong>{sUser.name}</strong>
                    <span>{sUser.email}</span>
                  </div>
                  <Link to="/network" className="btn-follow-sidebar">
                    Follow
                  </Link>
                </div>
              ))
            ) : (
              <p>No new suggestions.</p>
            )}
            <Link to="/network" className="widget-show-more">
              Show more
            </Link>
          </div>
        </div>

      </div>
    </aside>
  );
}

export default RightSidebar;