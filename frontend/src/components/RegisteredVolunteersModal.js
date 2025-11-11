import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RegisteredVolunteersModal({ event, onClose }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/events/${event.id}/volunteers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setVolunteers(response.data.volunteers || []);
      } catch (err) {
        setError('Could not fetch volunteer list.');
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, [event.id, token]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Volunteers for "{event.name}"</h2>
        
        {loading && <p>Loading volunteers...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && volunteers.length === 0 ? (
          <p>No volunteers have registered for this event yet.</p>
        ) : (
          <ul className="volunteer-list">
            {volunteers.map((v, index) => (
              <li key={index} className="volunteer-item">
                <img 
                  src={v.profileImageUrl || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${v.name[0]}`} 
                  alt={v.name}
                  className="user-card-avatar-small"
                />
                <div className="user-list-info">
                  <strong>{v.name}</strong>
                  <span>{v.email}</span>
                  {v.skills && v.skills.length > 0 && (
                    <div className="volunteer-skills">
                      Skills: {v.skills.join(', ')}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        
        <button className="btn-close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default RegisteredVolunteersModal;