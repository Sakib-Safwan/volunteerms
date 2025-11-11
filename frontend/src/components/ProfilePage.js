import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ... (SkillTagInput component remains the same)
function SkillTagInput({ skills, setSkills }) {
  const [inputValue, setInputValue] = useState('');
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || !inputValue.trim()) return;
    e.preventDefault();
    if (skills.includes(inputValue)) { setInputValue(''); return; }
    setSkills([...skills, inputValue.trim()]);
    setInputValue('');
  };
  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="skill-input-container">
      <div className="skill-tags">
        {skills.map((skill, index) => (
          <div key={index} className="skill-tag">
            {skill}
            <button onClick={() => removeSkill(skill)}>&times;</button>
          </div>
        ))}
      </div>
      <input
        type="text" value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a skill and press Enter..."
      />
    </div>
  );
}

// The main profile page component
function ProfilePage() {
  const [skills, setSkills] = useState([]);
  const [friends, setFriends] = useState([]); // NEW
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true); // NEW
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const userRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  // 1. Fetch skills on load
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await axios.get('http://localhost:8080/profile/skills', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSkills(response.data.skills || []);
      } catch (err) {
        setError('Could not fetch skills.');
      } finally {
        setLoadingSkills(false);
      }
    };
    fetchSkills();
  }, [token]);

  // 2. NEW: Fetch friends on load
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await axios.get('http://localhost:8080/friends', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(response.data.friends || []);
      } catch (err) {
        setError(prev => prev + ' Could not fetch friends.');
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriends();
  }, [token]);


  // 3. Save skills
  const handleSaveSkills = async () => {
    // ... (same as before)
    setError(''); setStatus('Saving...');
    try {
      await axios.post('http://localhost:8080/profile/skills', { skills: skills }, { headers: { Authorization: `Bearer ${token}` } });
      setStatus('Skills updated successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError('Could not update skills.'); setStatus('');
    }
  };

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>My Profile</h2>
      </div>

      <div className="form-container-in-feed">
        <div className="form-group">
          <label>Your Role</label>
          <input type="text" value={userRole} disabled />
        </div>

        {/* Only show skill input for Volunteers */}
        {userRole === 'Volunteer' && (
          <div className="form-group">
            <label>Your Skills</label>
            {loadingSkills ? <p>Loading skills...</p> : (
              <SkillTagInput skills={skills} setSkills={setSkills} />
            )}
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        {status && <p className="status-message">{status}</p>}

        {userRole === 'Volunteer' && (
          <button onClick={handleSaveSkills} className="btn btn-primary" style={{ width: 'auto' }}>
            Save Skills
          </button>
        )}
      </div>

      {/* NEW: Friends List Section */}
      <div className="form-container-in-feed" style={{marginTop: '20px'}}>
        <h3>Your Friends</h3>
        {loadingFriends ? <p>Loading friends...</p> : (
          <div className="user-list-container">
            {friends.length === 0 ? <p>You haven't added any friends yet.</p> : (
              friends.map(friend => (
                <div key={friend.ID} className="user-list-item">
                  <div className="user-list-info">
                    <strong>{friend.Email}</strong>
                    <span>{friend.Role}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;