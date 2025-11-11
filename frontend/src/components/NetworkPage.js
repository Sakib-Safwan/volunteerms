import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce'; // We'll create this hook

function UserCard({ user, onAddFriend, isFriend, status }) {
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
        className="btn btn-primary btn-add-friend"
        onClick={() => onAddFriend(user.id)}
        disabled={isFriend || status === 'Adding...'}
      >
        {isFriend ? 'Friend' : (status || 'Add Friend')}
      </button>
    </div>
  );
}

function NetworkPage() {
  const [users, setUsers] = useState([]);
  const [myFriends, setMyFriends] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search
  const token = localStorage.getItem('token');

  // Memoize fetchFriends to avoid re-fetching on every render
  const fetchFriends = useCallback(async () => {
    try {
      const friendsResponse = await axios.get('http://localhost:8080/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyFriends(new Set((friendsResponse.data.friends || []).map(f => f.id)));
    } catch (err) {
      setError('Could not fetch friends list.');
    }
  }, [token]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:8080/users?search=${debouncedSearchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
      } catch (err) {
        setError('Could not fetch user data.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchTerm, token]);

  const handleAddFriend = async (userID) => {
    setStatus(prev => ({ ...prev, [userID]: 'Adding...' }));
    try {
      await axios.post(
        `http://localhost:8080/friends/add/${userID}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus(prev => ({ ...prev, [userID]: 'Friend' }));
      setMyFriends(prev => new Set(prev).add(userID));
    } catch (err) {
      setStatus(prev => ({ ...prev, [userID]: 'Error' }));
    }
  };

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Find People</h2>
      </div>

      {/* NEW: Search Bar */}
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search for people by name or email..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && <div className="loading-message">Loading users...</div>}
      {error && <p className="error-message">{error}</p>}
      
      {/* NEW: Grid layout for User Cards */}
      <div className="user-card-grid">
        {!loading && users.length === 0 && <p>No users found.</p>}
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onAddFriend={handleAddFriend}
            isFriend={myFriends.has(user.id)}
            status={status[user.id]}
          />
        ))}
      </div>
    </div>
  );
}

export default NetworkPage;