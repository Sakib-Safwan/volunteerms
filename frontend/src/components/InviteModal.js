import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InviteModal({ group, onClose }) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]); // Tracks who has been invited
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchInvitable = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/groups/${group.id}/invitable-followers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowers(res.data.users || []);
      } catch (err) {
        setError('Could not load followers.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitable();
  }, [group.id, token]);

  const handleInvite = async (receiverId) => {
    try {
      await axios.post(
        `http://localhost:8080/groups/${group.id}/invite`,
        { receiverId: receiverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvitedUsers([...invitedUsers, receiverId]); // Mark as invited
    } catch (err) {
      console.error("Failed to send invite", err);
      alert("Failed to send invite. User may already be a member or have a pending request.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Invite Followers to "{group.name}"</h2>

        {loading && <p className="loading-message">Loading followers...</p>}
        {error && <p className="error-message">{error}</p>}

        <ul className="volunteer-list">
          {!loading && followers.length === 0 ? (
            <p className="loading-message" style={{padding: '1rem'}}>
              No followers available to invite.
            </p>
          ) : (
            followers.map(user => {
              const isInvited = invitedUsers.includes(user.id);
              return (
                <li key={user.id} className="volunteer-item">
                  <img 
                    src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`} 
                    alt={user.name}
                    className="user-card-avatar-small"
                  />
                  <div className="user-list-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="request-actions">
                    <button 
                      className={`btn-follow ${isInvited ? 'following' : ''}`}
                      style={{width: '90px'}}
                      onClick={() => handleInvite(user.id)}
                      disabled={isInvited}
                    >
                      {isInvited ? 'Invited' : 'Invite'}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        
        <button className="btn-close-modal" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default InviteModal;