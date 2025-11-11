import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ... (SkillTagInput component remains the same) ...
function SkillTagInput({ skills, setSkills }) {
  const [inputValue, setInputValue] = useState('');
  const handleKeyDown = (e) => { if (e.key !== 'Enter' || !inputValue.trim()) return; e.preventDefault(); if (skills.includes(inputValue)) { setInputValue(''); return; } setSkills([...skills, inputValue.trim()]); setInputValue(''); };
  const removeSkill = (skillToRemove) => { setSkills(skills.filter(skill => skill !== skillToRemove)); };
  return (
    <div className="skill-input-container">
      <div className="skill-tags">{skills.map((skill, index) => (<div key={index} className="skill-tag">{skill}<button onClick={() => removeSkill(skill)}>&times;</button></div>))}</div>
      <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a skill and press Enter..."/>
    </div>
  );
}


function ProfilePage() {
  const [user, setUser] = useState(null); // NEW: Store full user object
  const [skills, setSkills] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const userRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  // 1. Fetch all profile data on load
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, skillsRes, friendsRes] = await Promise.all([
          axios.get('http://localhost:8080/profile/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/profile/skills', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/friends', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setUser(profileRes.data);
        setSkills(skillsRes.data.skills || []);
        setFriends(friendsRes.data.friends || []);
      } catch (err) {
        setError('Could not fetch profile data.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [token]);

  // 2. Save skills
  const handleSaveSkills = async () => {
    // ... (same as before) ...
    setError(''); setStatus('Saving...');
    try {
      await axios.post('http://localhost:8080/profile/skills', { skills: skills }, { headers: { Authorization: `Bearer ${token}` } });
      setStatus('Skills updated successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) { setError('Could not update skills.'); setStatus(''); }
  };

  // 3. NEW: Handle Profile Picture Upload
  const handlePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);
    setStatus('Uploading...');

    try {
      const response = await axios.post(
        'http://localhost:8080/profile/picture',
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      // Update the user state with the new image URL
      setUser(prevUser => ({ ...prevUser, profileImageUrl: response.data.imageUrl }));
      setStatus('Profile picture updated!');
      setTimeout(() => setStatus(''), 3000);

    } catch (err) {
      setError('Could not upload profile picture.');
      setStatus('');
    }
  };

  if (loading) {
    return <div className="page-feed-container"><div className="loading-message">Loading profile...</div></div>;
  }
  
  if (!user) {
    return <div className="page-feed-container"><div className="error-message">{error || 'Could not load user.'}</div></div>;
  }

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>My Profile</h2>
      </div>

      {/* NEW: Profile Picture Uploader Section */}
      <div className="form-container-in-feed">
        <div className="profile-header">
          <img 
            src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`}
            alt={user.name} 
            className="profile-picture-large"
          />
          <div className="profile-header-info">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <label htmlFor="pictureUpload" className="btn-upload-label">
              Change Picture
            </label>
            <input
              id="pictureUpload"
              type="file"
              accept="image/*"
              onChange={handlePictureUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="form-container-in-feed" style={{marginTop: '20px'}}>
        <div className="form-group">
          <label>Your Role</label>
          <input type="text" value={user.role} disabled />
        </div>

        {userRole === 'Volunteer' && (
          <div className="form-group">
            <label>Your Skills</label>
            <SkillTagInput skills={skills} setSkills={setSkills} />
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

      {/* Friends List Section */}
      <div className="form-container-in-feed" style={{marginTop: '20px'}}>
        <h3>Your Friends</h3>
        {loading ? <p>Loading friends...</p> : (
          <div className="user-card-grid-condensed">
            {friends.length === 0 ? <p>You haven't added any friends yet.</p> : (
              friends.map(friend => (
                <div key={friend.id} className="user-card-condensed">
                  <img 
                    src={friend.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${friend.name[0]}`}
                    alt={friend.name}
                    className="user-card-avatar-small"
                  />
                  <div className="user-card-info">
                    <strong>{friend.name}</strong>
                    <span>{friend.email}</span>
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