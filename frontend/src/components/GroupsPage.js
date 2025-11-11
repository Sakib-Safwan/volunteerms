import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CreateGroupModal from './CreateGroupModal'; // We'll create this

// Reusable card for the discovery page
function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`} className="group-card">
      <img 
        src={group.profileImageUrl || `https://placehold.co/600x200/7E57C2/FFFFFF?text=${group.name[0]}`}
        alt={group.name}
        className="group-card-image"
      />
      <div className="group-card-info">
        <h3>{group.name}</h3>
        <p>{group.description}</p>
        <div className="group-card-footer">
          <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
          {group.isMember && <span style={{ color: 'green', marginLeft: '10px' }}>✓ Joined</span>}
        </div>
      </div>
    </Link>
  );
}

// The main page
function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token = localStorage.getItem('token');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8080/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.groups || []);
    } catch (err) {
      setError('Could not fetch groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [token]);

  return (
    <>
      <div className="page-feed-container">
        <div className="page-feed-header">
          <h2>Groups</h2>
          <button className="btn-create-group" onClick={() => setIsModalOpen(true)}>
            + Create Group
          </button>
        </div>

        {loading && <div className="loading-message">Loading groups...</div>}
        {error && <p className="error-message">{error}</p>}

        <div className="group-card-grid">
          {!loading && groups.length === 0 ? (
            <p className="loading-message">No groups found. Create one!</p>
          ) : (
            groups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))
          )}
        </div>
      </div>
      
      {isModalOpen && (
        <CreateGroupModal 
          onClose={() => setIsModalOpen(false)}
          onGroupCreated={() => {
            setIsModalOpen(false);
            fetchGroups(); // Refresh the list
          }}
        />
      )}
    </>
  );
}

export default GroupsPage;