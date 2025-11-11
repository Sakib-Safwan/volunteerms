import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateEventPage() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:8080/events',
        { 
          name: eventName, 
          date: eventDate, 
          description: eventDescription 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/events');
    } catch (err) {
      if (err.response) {
        setError(err.response.data.error);
      } else {
        setError('Event creation failed. Is the server running?');
      }
    }
  };

  return (
    <div className="page-feed-container">
      <div className="page-feed-header">
        <h2>Create a New Event</h2>
      </div>

      {/* The form-container is now *inside* the feed */}
      <div className="form-container-in-feed">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventName">Event Name</label>
            <input
              id="eventName" type="text" value={eventName}
              onChange={(e) => setEventName(e.target.value)} required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="eventDate">Date</label>
            <input
              id="eventDate" type="date" value={eventDate}
              onChange={(e) => setEventDate(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="eventDescription">Description</label>
            <textarea
              id="eventDescription" rows="5" value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)} required
            />
          </div>
          
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" className="btn btn-primary">
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateEventPage;