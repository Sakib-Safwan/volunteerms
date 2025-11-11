import React from 'react';

function EventCard({ event }) {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <article className="event-card-tweet">
      <div className="event-card-header">
        <div className="event-avatar">
          {/* Placeholder for event or organizer avatar */}
          <span>📅</span>
        </div>
        <div className="event-header-info">
          <span className="event-organizer">Organizer</span>
          <span className="event-date"> • {formattedDate}</span>
        </div>
      </div>
      
      <div className="event-card-body">
        <h3 className="event-card-title">{event.name}</h3>
        <p className="event-card-description">{event.description}</p>
      </div>
      
      <div className="event-card-actions">
        {/* We can add icon buttons here later */}
        <button className="btn btn-primary btn-register">
          Register Now
        </button>
      </div>
    </article>
  );
}

export default EventCard;