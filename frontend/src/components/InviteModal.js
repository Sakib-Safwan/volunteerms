import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InviteModal({ group, onClose }) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState(new Set()); // Tracks who has been invited
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
        setError('Could not fetch followers list.');
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
      // Add user to the "invited" set to change their button
      setInvitedUserIds(prev => new Set(prev).add(receiverId));
    } catch (err) {
      console.error("Failed to send invite", err);
      alert("Failed to send invite. They may already be a member or have a pending request.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Invite Followers to "{group.name}"</h2>
        
        {loading && <p>Loading followers...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && followers.length === 0 ? (
          <p>You have no followers to invite (or they are all already members).</p>
        ) : (
          <ul className="volunteer-list">
            {followers.map((user) => {
              const hasBeenInvited = invitedUserIds.has(user.id);
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
                      className="btn-approve" 
                      onClick={() => handleInvite(user.id)}
                      disabled={hasBeenInvited}
                    >
                      {hasBeenInvited ? 'Invited' : 'Invite'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        
        <button className="btn-close-modal" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default InviteModal;