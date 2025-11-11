import React, { useState } from 'react';
import axios from 'axios';

function EventCard({ event, showRegisterButton = true, onClick = () => {}, className = '' }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const formattedDate = new Date(event.date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const mapLink = event.locationAddress 
    ? `https://www.google.com/maps?q=${encodeURIComponent(event.locationAddress)}`
    : null;

  const handleRegister = async (e) => {
    e.stopPropagation();
    setIsRegistering(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `http://localhost:8080/events/${event.id}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsRegistered(true);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError('Already registered.');
        setIsRegistered(true);
      } else {
        setError('Registration failed.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleMapClick = (e) => {
    e.stopPropagation(); // Don't trigger the card's onClick
  };

  return (
    <article className={`event-card-tweet ${className}`} onClick={onClick}> 
      
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="event-card-image" />
      )}

      <div className="event-card-content">
        <div className="event-card-header">
          <div className="event-avatar"><span>📅</span></div>
          <div className="event-header-info">
            {/* FIXED: Changed event.createdBy to event.createdByEmail
              We also check if createdByEmail exists before trying to split it.
            */}
            <span className="event-organizer">
              {event.createdByEmail ? `by ${event.createdByEmail.split('@')[0]}` : 'Organizer'}
            </span>
            <span className="event-date"> • {formattedDate}</span>
          </div>
        </div>
        
        <div className="event-card-body">
          <h3 className="event-card-title">{event.name}</h3>
          
          {event.locationAddress && (
            <p className="event-card-location">
              📍 {event.locationAddress}
            </p>
          )}

          <p className="event-card-description">{event.description}</p>
        </div>
      </div>
      
      <div className="event-card-actions">
        {showRegisterButton && (
          <button 
            className="btn btn-primary btn-register"
            onClick={handleRegister}
            disabled={isRegistering || isRegistered}
          >
            {isRegistered ? 'Registered' : (isRegistering ? 'Registering...' : 'Register Now')}
          </button>
        )}
        
        {mapLink && (
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-map-link"
            onClick={handleMapClick}
          >
            View Map
          </a>
        )}
        
        {error && <span className="error-message-small">{error}</span>}
      </div>
    </article>
  );
}

export default EventCard;