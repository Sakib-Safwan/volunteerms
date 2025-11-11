import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import InviteModal from './InviteModal'; // NEW

// A component for the admin to manage join requests
function JoinRequests({ requests, onApprove, onDeny }) {
  if (requests.length === 0) {
    return <p className="loading-message">No pending join requests.</p>;
  }
  return (
    <ul className="volunteer-list" style={{borderTop: 'none'}}>
      {requests.map(user => (
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
            <button className="btn-approve" onClick={() => onApprove(user.id)}>Approve</button>
            <button className="btn-deny" onClick={() => onDeny(user.id)}>Deny</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Main component
function GroupDetailsPage() {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [activeTab, setActiveTab] = useState('members');
  const [requests, setRequests] = useState([]);
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // NEW
  
  const { id } = useParams();
  const token = localStorage.getItem('token');

  // Fetches all group details
  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroup(response.data);
      setIsMember(response.data.isMember);
      setIsAdmin(response.data.isAdmin);
      setHasPendingRequest(response.data.hasPendingRequest);
    } catch (err) {
      setError('Could not fetch group details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetches only the admin-specific join requests
  const fetchJoinRequests = async () => {
    if (!isAdmin) return;
    try {
      const response = await axios.get(`http://localhost:8080/groups/${id}/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch join requests", err);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id, token]);

  useEffect(() => {
    if (isAdmin) {
      fetchJoinRequests();
    }
  }, [isAdmin, id, token]);


  // --- Button Handlers ---
  const handleRequestJoin = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`http://localhost:8080/groups/${id}/request-join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasPendingRequest(true);
    } catch (err) { console.error("Failed to request join", err); } 
    finally { setIsProcessing(false); }
  };
  
  const handleCancelRequest = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`http://localhost:8080/groups/${id}/cancel-request`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasPendingRequest(false);
    } catch (err) { console.error("Failed to cancel request", err); } 
    finally { setIsProcessing(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    setIsProcessing(true);
    try {
      await axios.post(`http://localhost:8080/groups/${id}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsMember(false);
      fetchGroupDetails();
    } catch (err) {
      console.error("Failed to leave group", err);
      if (err.response && err.response.data.error) {
        alert(err.response.data.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Admin Action Handlers ---
  const handleApprove = async (userId) => {
    try {
      await axios.post(`http://localhost:8080/groups/${id}/requests/approve`, 
        { userId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchJoinRequests();
      fetchGroupDetails(); // Refresh members
    } catch (err) { console.error("Failed to approve user", err); }
  };
  
  const handleDeny = async (userId) => {
    try {
      await axios.post(`http://localhost:8080/groups/${id}/requests/deny`, 
        { userId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchJoinRequests(); // Just refresh requests
    } catch (err) { console.error("Failed to deny user", err); }
  };
  
  
  // --- Render Logic ---
  const renderJoinButton = () => {
    if (isMember) {
      return (
        <button 
          className="btn-leave-group" 
          onClick={handleLeave} 
          disabled={isProcessing}
        >
          {isProcessing ? 'Leaving...' : 'Leave Group'}
        </button>
      );
    }
    if (hasPendingRequest) {
      return (
        <button 
          className="btn-join-group-pending"
          onClick={handleCancelRequest}
          disabled={isProcessing}
        >
          {isProcessing ? '...' : 'Request Sent'}
        </button>
      );
    }
    return (
      <button 
        className="btn-join-group" 
        onClick={handleRequestJoin} 
        disabled={isProcessing}
      >
        {isProcessing ? 'Joining...' : 'Request to Join'}
      </button>
    );
  };


  if (loading) {
    return <div className="page-feed-container"><div className="loading-message">Loading group...</div></div>;
  }
  if (error) {
    return <p className="error-message">{error}</p>;
  }
  if (!group) {
    return <p className="loading-message">Group not found.</p>;
  }

  return (
    <>
      <div className="page-feed-container">
        <div className="group-details-header">
          <img 
            src={group.profileImageUrl || `https://placehold.co/600x200/7E57C2/FFFFFF?text=${group.name[0]}`}
            alt={group.name}
            className="group-details-image"
          />
        </div>

        <div className="group-details-actions">
          {/* NEW: Invite Button for members */}
          {isMember && (
            <button className="btn-invite" onClick={() => setIsInviteModalOpen(true)}>
              + Invite
            </button>
          )}
          {renderJoinButton()}
        </div>

        <div className="group-details-info">
          <h2>{group.name}</h2>
          <p>{group.description}</p>
        </div>
        
        <div className="profile-tabs">
          <button 
            className={`profile-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({group.members.length})
          </button>
          {isAdmin && (
            <button 
              className={`profile-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests ({requests.length})
            </button>
          )}
        </div>
        
        {activeTab === 'members' && (
          <div className="group-details-members">
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
                  {/* NEW: Admin Badge */}
                  {member.id === group.createdByUserID && (
                    <span className="admin-badge">Admin</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'requests' && isAdmin && (
          <div className="group-details-members">
            <JoinRequests 
              requests={requests}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          </div>
        )}
        
      </div>
      
      {/* NEW: Render Invite Modal */}
      {isInviteModalOpen && (
        <InviteModal 
          group={group} 
          onClose={() => setIsInviteModalOpen(false)} 
        />
      )}
    </>
  );
}

export default GroupDetailsPage;