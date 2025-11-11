import React from 'react';

function RightSidebar() {
  return (
    <aside className="right-sidebar">
      <div className="sidebar-sticky-content">
        <div className="widget-card">
          <h4>Your Profile</h4>
          <p>Welcome, {localStorage.getItem('role')}!</p>
          {/* You could add a "View Profile" link here */}
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