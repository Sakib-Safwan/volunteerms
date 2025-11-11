import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from './EventCard';
import RegisteredVolunteersModal from './RegisteredVolunteersModal';

function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('My Dashboard');
  const userRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    let endpoint = '';
    if (userRole === 'Organizer') {
      setTitle('Events You Created');
      endpoint = 'http://localhost:8080/organizer/events';
    } else {
      setTitle('Events You\'re Registered For');
      endpoint = 'http://localhost:8080/volunteer/events';
    }

    const fetchMyEvents = async () => {
      if (!token) {
        setError('You are not logged in.');
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvents(response.data.events || []);
      } catch (err) {
        setError('Could not fetch your events.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [userRole, token]);

  const handleCardClick = (event) => {
    if (userRole !== 'Organizer') return;
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="page-feed-container">
        <div className="page-feed-header">
          <h2>{title}</h2>
        </div>

        {loading && <div className="loading-message">Loading your events...</div>}
        {error && <p className="error-message" style={{textAlign: 'center', padding: '1rem'}}>{error}</p>}
        
        <div className="event-list-feed">
          {!loading && events.length === 0 ? (
            <p className="loading-message">
              {userRole === 'Organizer' 
                ? 'You have not created any events yet.' 
                : 'You have not registered for any events yet.'}
            </p>
          ) : (
            events.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                showRegisterButton={false} 
                onClick={() => handleCardClick(event)} 
                className={userRole === 'Organizer' ? 'clickable-card' : ''}
              />
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <RegisteredVolunteersModal 
          event={selectedEvent} 
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

export default DashboardPage;