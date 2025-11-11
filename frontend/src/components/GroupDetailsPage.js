import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function GroupDetailsPage() {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { id } = useParams();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroup(response.data);
      setIsMember(response.data.isMember);
    } catch (err) {
      setError('Could not fetch group details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id, token]);

  const handleJoin = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`http://localhost:8080/groups/${id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsMember(true);
      fetchGroupDetails(); // Refresh details
    } catch (err) {
      console.error("Failed to join group", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    setIsProcessing(true);
    try {
      await axios.post(`http://localhost:8080/groups/${id}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsMember(false);
      fetchGroupDetails(); // Refresh details
    } catch (err) {
      console.error("Failed to leave group", err);
      if (err.response && err.response.data.error) {
        alert(err.response.data.error); // Show admin error
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="page-feed-container">
        <div className="loading-message">Loading group...</div>
      </div>
    );
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!group) {
    return <p className="loading-message">Group not found.</p>;
  }

  return (
    <div className="page-feed-container">
      <div className="group-details-header">
        <img 
          src={group.profileImageUrl || `https://placehold.co/600x200/7E57C2/FFFFFF?text=${group.name[0]}`}
          alt={group.name}
          className="group-details-image"
        />
      </div>

      <div className="group-details-actions">
        {isMember ? (
          <button 
            className="btn-leave-group" 
            onClick={handleLeave} 
            disabled={isProcessing}
          >
            {isProcessing ? 'Leaving...' : 'Leave Group'}
          </button>
        ) : (
          <button 
            className="btn-join-group" 
            onClick={handleJoin} 
            disabled={isProcessing}
          >
            {isProcessing ? 'Joining...' : 'Join Group'}
          </button>
        )}
      </div>

      <div className="group-details-info">
        <h2>{group.name}</h2>
        <p>{group.description}</p>
      </div>

      <div className="group-details-members">
        <h3>Members ({group.members.length})</h3>
        <div className="user-card-grid-condensed">
          {group.members.map(member => (
            <div key={member.id} className="user-card-condensed">
              <img 
                src={member.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${member.name[0]}`} 
                alt={member.name}
                className="user-card-avatar-small"
              />
              <div className="user-card-info">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsPage;