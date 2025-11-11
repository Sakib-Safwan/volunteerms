import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateEventPage() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEventImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('name', eventName);
    formData.append('date', eventDate);
    formData.append('description', eventDescription);
    formData.append('locationAddress', locationAddress);

    if (eventImage) {
      formData.append('image', eventImage);
    }

    try {
      await axios.post(
        'http://localhost:8080/events',
        formData, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
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
            <label htmlFor="locationAddress">Location Address (Optional)</label>
            <textarea
              id="locationAddress"
              rows="2"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="eventImage">Event Image (Optional)</label>
            <input
              id="eventImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
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