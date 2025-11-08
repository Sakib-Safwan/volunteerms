import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="page-center">
      <h1>Welcome to the Volunteer Management System</h1>
      [cite_start]<p>Connecting organizers and volunteers seamlessly. [cite: 9, 12]</p>
      [cite_start]{/* This will later be your public event feed [cite: 25] */}
      <div className="cta-buttons">
        <Link to="/register" className="btn btn-primary">Get Started</Link>
        <Link to="/login" className="btn">Login</Link>
      </div>
    </div>
  );
}

export default LandingPage;