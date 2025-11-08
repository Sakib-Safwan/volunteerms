import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // API call to the Go backend
      const response = await axios.post('http://localhost:8080/login', {
        email: email,
        password: password,
      });

      // Store the token (e.g., in localStorage)
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);

      console.log('Login successful');
      
      // Redirect to a dashboard (which you'll build next)
      // For now, just redirect to the homepage
      navigate('/'); 

    } catch (err) {
      if (err.response) {
        setError(err.response.data.error);
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
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
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;