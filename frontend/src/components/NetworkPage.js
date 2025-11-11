import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';

// Reusable User Card component
function UserCard({ user, onFollow }) {
  const [isFollowed, setIsFollowed] = useState(user.isFollowed);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    await onFollow(user.id, isFollowed); // Pass 'isFollowed' to know if we should follow or unfollow
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
        onClick={handleFollow} 
        className={`btn-add-friend ${isFollowed ? 'followed' : ''}`}
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay
  const token = localStorage.getItem('token');

  // Fetch users from API
  useEffect(() => {
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
          params: { search: debouncedSearchTerm } // Send debounced search term as query param
        });
        setUsers(response.data.users || []);
      } catch (err) {
        setError('Could not fetch users list.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchTerm, token]); // Re-fetch when debounced term or token changes

  // Follow/Unfollow handler
  const handleFollowToggle = async (userId, isCurrentlyFollowed) => {
    if (!token) return;
    
    const endpoint = isCurrentlyFollowed 
      ? `http://localhost:8080/users/unfollow/${userId}`
      : `http://localhost:8080/users/follow/${userId}`;
    
    try {
      await axios.post(
        endpoint, 
        {}, // Empty body
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // If this was a "follow", we want to optimistically remove the user from the "Find People" list
      if (!isCurrentlyFollowed) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to update follow status', err);
      // Revert state on error (optional)
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
          <p className="loading-message">No users found.</p>
        ) : (
          users.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              onFollow={handleFollowToggle} 
            />
          ))
        )}
      </div>
    </div>
  );
}

export default NetworkPage;