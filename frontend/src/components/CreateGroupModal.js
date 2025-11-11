import React, { useState } from 'react';
import axios from 'axios';

function CreateGroupModal({ onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (image) {
      formData.append('image', image);
    }

    try {
      await axios.post(
        'http://localhost:8080/groups',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      onGroupCreated(); // Triggers refresh and closes modal
    } catch (err) {
      if (err.response && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to create group.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Create a New Group</h2>
        <form onSubmit={handleSubmit} className="form-container-in-feed" style={{padding: '0 1.5rem'}}>
          
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="groupDescription">Description</label>
            <textarea
              id="groupDescription"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="groupImage">Group Image (Optional)</label>
            <input
              id="groupImage"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="file-input"
            />
          </div>
          
          {error && <p className="error-message">{error}</p>}
          
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem'}}>
            <button 
              type="button" 
              className="btn-close-modal" 
              onClick={onClose} 
              style={{marginTop: 0, backgroundColor: '#f7f9f9', color: 'var(--text-color)'}}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-create-group" 
              disabled={isCreating} 
              style={{marginTop: 0}}
            >
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;