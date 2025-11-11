import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// (SkillTagInput component)
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

// Group Card for My Groups list
function GroupCardCondensed({ group }) {
  return (
    <Link to={`/groups/${group.id}`} className="user-card-condensed" style={{textDecoration: 'none'}}>
      <img 
        src={group.profileImageUrl || `https://placehold.co/100x100/7E57C2/FFFFFF?text=${group.name[0]}`} 
        alt={group.name}
        className="user-card-avatar-small"
      />
      <div className="user-card-info">
        <strong>{group.name}</strong>
        <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
      </div>
    </Link>
  );
}


// The main profile page component
function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('skills'); // skills | following | followers | groups

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Fetch all profile data on load
  useEffect(() => {
    if (userRole === 'Organizer') {
      setActiveTab('following');
    }
    
    const fetchAllData = async () => {
      if (!token) {
        setError('Not authorized');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const [profileRes, skillsRes, followersRes, followingRes, myGroupsRes] = await Promise.all([
          axios.get('http://localhost:8080/profile/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/profile/skills', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/users/followers', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/users/following', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:8080/profile/my-groups', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setProfile(profileRes.data);
        setSkills(skillsRes.data.skills || []);
        setFollowers(followersRes.data.users || []);
        setFollowing(followingRes.data.users || []);
        setMyGroups(myGroupsRes.data.groups || []);
        
      } catch (err) {
        setError('Could not fetch profile data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [token, userRole]);

  // Save skills
  const handleSaveSkills = async () => {
    setError(''); setStatus('Saving...');
    try {
      await axios.post('http://localhost:8080/profile/skills', { skills: skills }, { headers: { Authorization: `Bearer ${token}` } });
      setStatus('Skills updated successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) { setError('Could not update skills.'); setStatus(''); }
  };

  // Handle Profile Picture Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profilePicture', file);
    setError(''); setStatus('Uploading...');
    try {
      const res = await axios.post('http://localhost:8080/profile/picture', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => ({ ...prev, profileImageUrl: res.data.imageUrl }));
      setStatus('Profile picture updated!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) { setError('Failed to upload picture.'); setStatus(''); }
  };

  if (loading) {
    return (
      <div className="page-feed-container">
        <div className="page-feed-header"><h2>My Profile</h2></div>
        <div className="loading-message">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="page-feed-container">
      <div className="page-feed-header"><h2>My Profile</h2></div>

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
                type="file" ref={fileInputRef} style={{ display: 'none' }} 
                onChange={handleFileChange} accept="image/*"
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
          className={`profile-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          My Groups ({myGroups.length})
        </button>
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
        
        {activeTab === 'groups' && (
          <div className="user-card-grid-condensed">
            {myGroups.length === 0 ? <p className="loading-message">You haven't joined any groups yet.</p> :
              myGroups.map(group => <GroupCardCondensed key={group.id} group={group} />)
            }
          </div>
        )}

        {activeTab === 'following' && (
          <div className="user-card-grid-condensed">
            {following.length === 0 ? <p className="loading-message">You are not following anyone yet.</p> :
              following.map(user => <UserCard key={user.id} user={user} />)
            }
          </div>
        )}
        
        {activeTab === 'followers' && (
          <div className="user-card-grid-condensed">
            {followers.length === 0 ? <p className="loading-message">You have no followers yet.</p> :
              followers.map(user => <UserCard key={user.id} user={user} />)
            }
          </div>
        )}
        
      </div>
    </div>
  );
}

export default ProfilePage;