import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// This is our simple tag input component
function SkillTagInput({ skills, setSkills }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || !inputValue.trim()) return;
    e.preventDefault();
    if (skills.includes(inputValue)) {
      setInputValue(''); // Clear input if skill already exists
      return;
    }
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
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a skill and press Enter..."
      />
    </div>
  );
}

// User Card for Following/Followers list
function UserCard({ user }) {
  return (
    <div className="user-card-condensed">
      <img 
        src={user.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${user.name[0]}`} 
        alt={user.name}
        className="user-card-avatar-small"
      />
      <div className="user-card-info">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
    </div>
  );
}


// The main profile page component
function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('skills'); // skills | following | followers

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // 1. Fetch all profile data on load
  useEffect(() => {
    const fetchAllData = async () => {
      if (!token) {
        setError('Not authorized');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Run all requests in parallel
        const [profileRes, skillsRes, followersRes, followingRes] = await Promise.all([
          axios.get('http://localhost:8080/profile/me', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8080/profile/skills', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8080/users/followers', {
             headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8080/users/following', {
             headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setProfile(profileRes.data);
        setSkills(skillsRes.data.skills || []);
        setFollowers(followersRes.data.users || []);
        setFollowing(followingRes.data.users || []);
        
      } catch (err) {
        setError('Could not fetch profile data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [token]);

  // 2. Save skills
  const handleSaveSkills = async () => {
    setError('');
    setStatus('Saving...');
    try {
      await axios.post(
        'http://localhost:8080/profile/skills',
        { skills: skills }, // Send the skills array
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('Skills updated successfully!');
      setTimeout(() => setStatus(''), 3000); // Clear status after 3s
    } catch (err) {
      setError('Could not update skills.');
      setStatus('');
    }
  };

  // 3. Handle Profile Picture Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);
    setError('');
    setStatus('Uploading...');

    try {
      const res = await axios.post(
        'http://localhost:8080/profile/picture',
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      // Update profile state with new image URL
      setProfile(prev => ({ ...prev, profileImageUrl: res.data.imageUrl }));
      setStatus('Profile picture updated!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError('Failed to upload picture.');
      setStatus('');
    }
  };

  if (loading) {
    return (
      <div className="page-feed-container">
        <div className="page-feed-header">
          <h2>My Profile</h2>
        </div>
        <div className="loading-message">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>My Profile</h2>
      </div>

      <div className="form-container-in-feed">
        {error && <p className="error-message">{error}</p>}
        {status && <p className="status-message">{status}</p>}

        {profile && (
          <div className="profile-header">
            <img 
              src={profile.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${profile.name[0]}`} 
              alt={profile.name}
              className="profile-picture-large"
            />
            <div className="profile-header-info">
              <h3>{profile.name}</h3>
              <p>{profile.email}</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
                accept="image/*"
              />
              <button className="btn-upload-label" onClick={() => fileInputRef.current.click()}>
                Change Picture
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* --- TABS --- */}
      <div className="profile-tabs">
        {userRole === 'Volunteer' && (
          <button 
            className={`profile-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            My Skills
          </button>
        )}
        <button 
          className={`profile-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following ({following.length})
        </button>
        <button 
          className={`profile-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
          onClick={() => setActiveTab('followers')}
        >
          Followers ({followers.length})
        </button>
      </div>
      
      {/* --- TAB CONTENT --- */}
      <div className="profile-tab-content">
        
        {userRole === 'Volunteer' && activeTab === 'skills' && (
          <div className="form-container-in-feed">
            <div className="form-group">
              <label>Your Skills</label>
              <SkillTagInput skills={skills} setSkills={setSkills} />
            </div>
            <button onClick={handleSaveSkills} className="btn btn-primary" style={{ width: 'auto' }}>
              Save Skills
            </button>
          </div>
        )}

        {activeTab === 'following' && (
          <div className="user-card-grid-condensed">
            {following.length === 0 ? <p>You are not following anyone yet.</p> :
              following.map(user => <UserCard key={user.id} user={user} />)
            }
          </div>
        )}
        
        {activeTab === 'followers' && (
          <div className="user-card-grid-condensed">
            {followers.length === 0 ? <p>You have no followers yet.</p> :
              followers.map(user => <UserCard key={user.id} user={user} />)
            }
          </div>
        )}
        
      </div>

    </div>
  );
}

export default ProfilePage;