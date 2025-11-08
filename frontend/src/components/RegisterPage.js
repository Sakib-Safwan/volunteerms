import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Volunteer'); // Default role
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      // API call to the Go backend
      const response = await axios.post('http://localhost:8080/register', {
        email: email,
        password: password,
        role: role,
      });

      console.log(response.data.message);
      // Redirect to login page on successful registration
      navigate('/login');

    } catch (err) {
      if (err.response) {
        setError(err.response.data.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        [cite_start]{/* Role selection as per SRS [cite: 23] */}
        <div className="form-group">
          <label>I am a:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="Volunteer">Volunteer</option>
            <option value="Organizer">Organizer</option>
          </select>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary">Register</button>
      </form>
    </div>
  );
}

export default RegisterPage;