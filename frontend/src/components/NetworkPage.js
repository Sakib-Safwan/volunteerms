import React, { useState, useEffect } from 'react';
import axios from 'axios';

function NetworkPage() {
  const [users, setUsers] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({}); // To track add status per user
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all users and my friends in parallel
        const [usersResponse, friendsResponse] = await Promise.all([
          axios.get('http://localhost:8080/users', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8080/friends', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setUsers(usersResponse.data.users || []);
        // Store friend IDs in a Set for fast lookup
        setMyFriends(new Set((friendsResponse.data.friends || []).map(f => f.ID)));

      } catch (err) {
        setError('Could not fetch user data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleAddFriend = async (userID) => {
    setStatus(prev => ({ ...prev, [userID]: 'Adding...' }));
    try {
      await axios.post(
        `http://localhost:8080/friends/add/${userID}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus(prev => ({ ...prev, [userID]: 'Friend' }));
      // Add to our local friend set
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

      {loading && <div className="loading-message">Loading users...</div>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="user-list-container">
        {!loading && users.length === 0 && <p>No other users found.</p>}
        {users.map(user => {
          const isFriend = myFriends.has(user.ID);
          const currentStatus = status[user.ID];
          return (
            <div key={user.ID} className="user-list-item">
              <div className="user-list-info">
                <strong>{user.Email}</strong>
                <span>Role: {user.Role}</span>
              </div>
              <button
                className="btn btn-primary btn-add-friend"
                onClick={() => handleAddFriend(user.ID)}
                disabled={isFriend || currentStatus === 'Adding...'}
              >
                {isFriend ? 'Friend' : (currentStatus || 'Add Friend')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NetworkPage;