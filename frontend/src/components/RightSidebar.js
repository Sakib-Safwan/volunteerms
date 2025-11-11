import React from 'react';

function RightSidebar() {
  const role = localStorage.getItem('role');
  return (
    <aside className="right-sidebar">
      <div className="sidebar-sticky-content">
        <div className="widget-card">
          <h4>Your Profile</h4>
          <p>Welcome, {role || 'User'}!</p>
        </div>

        <div className="widget-card">
          <h4>Notifications</h4>
          <p>No new notifications.</p>
        </div>
      </div>
    </aside>
  );
}

export default RightSidebar;