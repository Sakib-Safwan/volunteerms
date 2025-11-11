import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8080/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError('Could not fetch notifications.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleAccept = async (id) => {
    try {
      await axios.post(`http://localhost:8080/notifications/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh list after action
      fetchNotifications();
    } catch (err) {
      console.error("Failed to accept invite", err);
    }
  };

  const handleDecline = async (id) => {
    try {
      await axios.post(`http://localhost:8080/notifications/${id}/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh list after action
      fetchNotifications();
    } catch (err) {
      console.error("Failed to decline invite", err);
    }
  };

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Notifications</h2>
      </div>

      {loading && <div className="loading-message">Loading...</div>}
      {error && <p className="error-message">{error}</p>}

      <div className="notification-list">
        {!loading && notifications.length === 0 ? (
          <p className="loading-message">You have no new notifications.</p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className="notification-card">
              <img 
                src={notif.sender.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${notif.sender.name[0]}`}
                alt={notif.sender.name}
                className="user-card-avatar-small"
              />
              <div className="notification-info">
                <strong>{notif.sender.name}</strong> invited you to join the group 
                <Link to={`/groups/${notif.group.id}`} className="notification-link">
                  <strong> {notif.group.name}</strong>
                </Link>.
              </div>
              <div className="request-actions">
                <button className="btn-approve" onClick={() => handleAccept(notif.id)}>Accept</button>
                <button className="btn-deny" onClick={() => handleDecline(notif.id)}>Decline</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;