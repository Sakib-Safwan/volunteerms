import React, { useState } from 'react';
import axios from 'axios';

// NEW: Add 'showRegisterButton = true' as a default prop
function EventCard({ event, showRegisterButton = true }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const formattedDate = new Date(event.date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  // NEW: Handler for the registration button
  const handleRegister = async () => {
    setIsRegistering(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `http://localhost:8080/events/${event.id}/register`,
        {}, // Empty body
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Success!
      setIsRegistered(true);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError('Already registered.');
        setIsRegistered(true); // Mark as registered if server says so
      } else {
        setError('Registration failed.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <article className="event-card-tweet">
      <div className="event-card-header">
        <div className="event-avatar">
          <span>📅</span>
        </div>
        <div className="event-header-info">
          <span className="event-organizer">{event.createdBy ? `by ${event.createdBy.split('@')[0]}` : 'Organizer'}</span>
          <span className="event-date"> • {formattedDate}</span>
        </div>
      </div>
      
      <div className="event-card-body">
        <h3 className="event-card-title">{event.name}</h3>
        <p className="event-card-description">{event.description}</p>
      </div>
      
      {/* NEW: Conditional rendering of the footer */}
      {showRegisterButton && (
        <div className="event-card-actions">
          <button 
            className="btn btn-primary btn-register"
            onClick={handleRegister}
            disabled={isRegistering || isRegistered}
          >
            {isRegistered ? 'Registered' : (isRegistering ? 'Registering...' : 'Register Now')}
          </button>
          {error && <span className="error-message-small">{error}</span>}
        </div>
      )}
    </article>
  );
}

export default EventCard;