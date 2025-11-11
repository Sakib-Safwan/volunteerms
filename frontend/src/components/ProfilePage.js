import React, { useState, useEffect } from 'react';
import axios from 'axios';

// This is our new, simple tag input component
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

// The main profile page component
function ProfilePage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
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
        setLoading(false);
      }
    };
    fetchSkills();
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
            {loading ? <p>Loading skills...</p> : (
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
    </div>
  );
}

export default ProfilePage;