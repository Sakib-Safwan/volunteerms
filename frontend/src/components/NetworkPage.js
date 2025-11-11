import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';

// Reusable User Card component
function UserCard({ user, onFollowToggle }) {
  const [isFollowed, setIsFollowed] = useState(user.isFollowed);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    // Tell the parent to handle the API call
    await onFollowToggle(user.id, isFollowed);
    // Parent will refetch, but we can optimistically update
    setIsFollowed(!isFollowed);
    setIsLoading(false);
  };

  return (
    <div className="user-card">
      <img 
        src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`} 
        alt={user.name}
        className="user-card-avatar"
      />
      <div className="user-card-info">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
        <span className="user-card-role">{user.role}</span>
      </div>
      <button 
        onClick={handleToggle} 
        className={`btn-follow ${isFollowed ? 'following' : ''}`}
        disabled={isLoading}
      >
        {isLoading ? '...' : (isFollowed ? 'Following' : 'Follow')}
      </button>
    </div>
  );
}


function NetworkPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const token = localStorage.getItem('token');

  // Fetch users from API
  const fetchUsers = async () => {
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: debouncedSearchTerm }
      });
      setUsers(response.data.users || []);
    } catch (err) {
      setError('Could not fetch users list.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, [debouncedSearchTerm, token]);

  // Follow/Unfollow handler
  const handleFollowToggle = async (userId, isCurrentlyFollowed) => {
    if (!token) return;
    
    const endpoint = isCurrentlyFollowed 
      ? `http://localhost:8080/users/unfollow/${userId}`
      : `http://localhost:8080/users/follow/${userId}`;
    
    try {
      await axios.post(
        endpoint, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // After following, refresh the list to remove them
      if (!isCurrentlyFollowed) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to update follow status', err);
    }
  };

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Network</h2>
      </div>

      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search for people by name or email..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && <div className="loading-message">Loading...</div>}
      {error && <p className="error-message">{error}</p>}

      <div className="user-card-grid">
        {!loading && users.length === 0 ? (
          <p className="loading-message">
            {searchTerm ? 'No users found.' : 'No users to follow.'}
          </p>
        ) : (
          users.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              onFollowToggle={handleFollowToggle} 
            />
          ))
        )}
      </div>
    </div>
  );
}

export default NetworkPage;