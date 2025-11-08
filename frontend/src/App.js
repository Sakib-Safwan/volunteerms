import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import './App.css'; // We will add styles here

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav className="navbar">
          <Link to="/" className="nav-brand">VMS</Link>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </div>
        </nav>

        {/* Define the routes */}
        <div className="container">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;