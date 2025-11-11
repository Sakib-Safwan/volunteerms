import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from './EventCard';

function EventFeedPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token'); // Get token

  useEffect(() => {
    const fetchEvents = async () => {
      if (!token) {
        setError('You must be logged in to see events.');
        setLoading(false);
        return;
      }
      try {
        // Send token in the request
        const response = await axios.get('http://localhost:8080/events', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(response.data.events || []);
      } catch (err) {
        setError('Could not fetch events.');
        console.error("Fetch events error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [token]);

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Events</h2>
      </div>

      {loading && <div className="loading-message">Loading events...</div>}
      {error && <p className="error-message" style={{textAlign: 'center', padding: '1rem'}}>{error}</p>}
      
      <div className="event-list-feed">
        {!loading && events.length === 0 ? (
          <p className="loading-message">No upcoming events found.</p>
        ) : (
          events.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              showRegisterButton={true} // Show the button on the main feed
            />
          ))
        )}
      </div>
    </div>
  );
}

export default EventFeedPage;