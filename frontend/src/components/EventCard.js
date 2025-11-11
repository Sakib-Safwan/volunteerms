import React, { useState } from 'react';
import axios from 'axios';

// NEW: Add className and onClick to props
function EventCard({ event, showRegisterButton = true, onClick = () => {}, className = '' }) {
  // Use the 'isRegistered' prop from the backend
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
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationAddress)}`
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
  
  // Create the "friends going" text
  let socialText = '';
  if (event.friendsGoingCount > 0) {
    const friendNames = event.friendsGoing || [];
    const otherFriendsCount = event.friendsGoingCount - friendNames.length;

    if (event.isRegistered) {
      if (friendNames.length > 0) {
        socialText = `You, ${friendNames[0]}`;
        if (event.friendsGoingCount > 1) {
          socialText += ` and ${event.friendsGoingCount - 1} other friend${event.friendsGoingCount - 1 !== 1 ? 's' : ''}`;
        }
        socialText += ` are going.`;
      } else {
        socialText = `You and ${event.friendsGoingCount} friend${event.friendsGoingCount !== 1 ? 's' : ''} are going.`;
      }
    } else {
      if (friendNames.length > 0) {
        socialText = `${friendNames[0]}`;
        if (event.friendsGoingCount > 1) {
          socialText += ` and ${event.friendsGoingCount - 1} other friend${event.friendsGoingCount - 1 !== 1 ? 's' : ''}`;
        }
        socialText += ` ${event.friendsGoingCount > 1 ? 'are' : 'is'} going.`;
      } else {
         socialText = `${event.friendsGoingCount} friend${event.friendsGoingCount !== 1 ? 's' : ''} are going.`;
      }
    }
  }


  return (
    <article className={`event-card-tweet ${className}`} onClick={onClick}> 
      
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="event-card-image" />
      )}

      <div className="event-card-content">
        <div className="event-card-header">
          <div className="event-avatar"><span>📅</span></div>
          <div className="event-header-info">
            <span className="event-organizer">by {event.createdByName || event.createdByEmail.split('@')[0]}</span>
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
          {error && <span className="error-message-small">{error}</span>}
        </div>
      )}
    </article>
  );
}

export default EventCard;