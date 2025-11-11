import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// This is the card for a single invitation
function InvitationCard({ notification, onAction }) {
  const { id, sender, group } = notification;

  const handleAccept = () => {
    onAction(id, 'accept');
  };

  const handleDecline = () => {
    onAction(id, 'decline');
  };

  return (
    <div className="notification-card">
      <img 
        src={sender.profileImageUrl} 
        alt={sender.name} 
        className="user-card-avatar-small"
      />
      <div className="notification-info">
        <p>
          <strong>{sender.name}</strong> invited you to join the group: 
          <Link to={`/groups/${group.id}`} className="notification-link"> {group.name}</Link>
        </p>
      </div>
      <div className="request-actions">
        <button className="btn-approve" onClick={handleAccept}>Accept</button>
        <button className="btn-deny" onClick={handleDecline}>Decline</button>
      </div>
    </div>
  );
}

// This is the main page
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleAction = async (id, action) => {
    try {
      // Send the request to accept or decline
      await axios.post(`http://localhost:8080/notifications/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove the notification from the list
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(`Failed to ${action} invitation`, err);
      alert(`Error: Could not ${action} invitation.`);
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
            <InvitationCard 
              key={notif.id} 
              notification={notif} 
              onAction={handleAction} 
            />
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;