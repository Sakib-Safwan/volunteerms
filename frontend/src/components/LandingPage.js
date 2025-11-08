import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="container">
      <div className="hero-section">
        <h1>Welcome to the Volunteer Management System</h1>
        <p>
          Connecting organizers and volunteers seamlessly. Find opportunities,
          manage events, and make a difference.
        </p>
        <div className="cta-buttons">
          <Link to="/register" className="btn btn-primary">
            Get Started
          </Link>
          <Link to="/login" className="btn btn-outline">
            Login
          </Link>
        </div>
      </div>

      {/* This is where your public event feed will go.
        It will look great inside a card layout.
      */}
    </div>
  );
}

export default LandingPage;