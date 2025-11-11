import React, { useState } from 'react';
import axios from 'axios';

function EventCard({ event, showRegisterButton = true, onClick = () => {}, className = '' }) {
  // Use the isRegistered prop from the backend to set initial state
  const [isRegistered, setIsRegistered] = useState(event.isRegistered);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const formattedDate = new Date(event.date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC' // Add timezone to avoid off-by-one day errors
  });

  // Create the Google Maps link
  const mapLink = event.locationAddress 
    ? `https://maps.google.com/?q=${encodeURIComponent(event.locationAddress)}`
    : null;

  const handleRegister = async (e) => {
    e.stopPropagation(); // Stop click from bubbling up to the card's onClick
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
  
  // Helper to create the social text
  const getSocialText = () => {
    // FIXED: Default followersGoing to an empty array if it's null or undefined
    const followersGoing = event.followersGoing || [];
    const count = event.followersGoingCount;

    if (count === 0) {
      return event.isRegistered ? <span>You are registered.</span> : null;
    }

    const firstFriend = followersGoing[0] || "1 person";
    const otherCount = count - 1;

    if (event.isRegistered) {
      if (count === 1) return <span>You and <strong>{firstFriend}</strong> are registered.</span>;
      return <span>You, <strong>{firstFriend}</strong>, and <strong>{otherCount} other {otherCount === 1 ? 'person' : 'people'} you follow</strong> are registered.</span>;
    } else {
      if (count === 1) return <span><strong>{firstFriend}</strong> is registered.</span>;
      return <span><strong>{firstFriend}</strong> and <strong>{otherCount} other {otherCount === 1 ? 'person' : 'people'} you follow</strong> are registered.</span>;
    }
  };
  const socialText = getSocialText();

  return (
    <article className={`event-card-tweet ${className}`} onClick={onClick}> 
      
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="event-card-image" />
      )}

      <div className="event-card-content">
        <div className="event-card-header">
          <div className="event-avatar">
            <img 
              src={event.organizerProfilePicture || `https://placehold.co/100x100/E8F5FF/1D9BF0?text=${event.createdByName[0]}`}
              alt={event.createdByName}
              className="user-card-avatar-small"
            />
          </div>
          <div className="event-header-info">
            <span className="event-organizer">{event.createdByName}</span>
            <span className="event-date"> • {formattedDate}</span>
          </div>
        </div>
        
        <div className="event-card-body">
          <h3 className="event-card-title">{event.name}</h3>
          <p className="event-card-description">{event.description}</p>
          {mapLink && (
            <a 
              href={mapLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="event-card-location"
              onClick={(e) => e.stopPropagation()} // Don't trigger card click
            >
              📍 {event.locationAddress}
            </a>
          )}
        </div>
      </div>
      
      {/* SOCIAL CONTEXT BAR */}
      {socialText && (
        <div className="event-card-social">
          <span>👥 {socialText}</span>
        </div>
      )}

      {showRegisterButton && (
        <div className="event-card-actions">
          <button 
            className="btn btn-primary btn-register"
            onClick={handleRegister}
            disabled={isRegistering || isRegistered}
          >
            {isRegistered ? 'Registered' : (isRegistering ? 'Registering...' : 'Register Now')}
          </button>
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-map-link"
              onClick={(e) => e.stopPropagation()}
            >
              View Map
            </a>
          )}
          {error && <span className="error-message-small">{error}</span>}
        </div>
      )}
    </article>
  );
}

export default EventCard;