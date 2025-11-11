import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="landing-page-container">
      {/* Header section */}
      <header className="landing-header">
        <div className="landing-nav">
          <span className="landing-brand-logo">VMS</span>
          <div className="landing-nav-links">
            <Link to="/login" className="btn-nav-login">Login</Link>
            <Link to="/register" className="btn-nav-register">Register</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Connect. Volunteer. Make an Impact.</h1>
            <p className="hero-subtitle">
              The Volunteer Management System is a social platform that connects you
              with events, organizers, and other volunteers who share your passion.
            </p>
            <Link to="/register" className="btn btn-primary btn-hero">
              Get Started for Free
            </Link>
          </div>
          <div className="hero-image-placeholder">
            {/* You could add an illustration or image here */}
            <span role="img" aria-label="people working together">👥✨🤝</span>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section" id="features">
          <h2>What makes VMS different?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">📅</span>
              <h3>Discover Events</h3>
              <p>Browse a live feed of upcoming volunteer opportunities, sorted by date. Find what's happening near you and register with a single click.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">👥</span>
              <h3>Build Your Network</h3>
              <p>Follow organizers and other volunteers. See what events people you follow are attending and build your own volunteer community.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🛠️</span>
              <h3>Showcase Your Skills</h3>
              <p>Add your unique skills to your profile. Organizers can see what you bring to the table, and you can find events that match your expertise.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;