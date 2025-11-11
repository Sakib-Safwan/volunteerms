import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from './EventCard';

function EventFeedPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('http://localhost:8080/events');
        setEvents(response.data.events || []);
      } catch (err) {
        setError('Could not fetch events.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Events</h2>
      </div>

      {loading && <div className="loading-message">Loading events...</div>}
      {error && <p className="error-message" style={{textAlign: 'center', padding: '1rem'}}>{error}</p>}
      
      <div className="event-list-feed">
        {events.length === 0 && !loading ? (
          <p className="loading-message">No upcoming events found.</p>
        ) : (
          events.map(event => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

export default EventFeedPage;