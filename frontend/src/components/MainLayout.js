import React from 'react';
import { Outlet } from 'react-router-dom';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

function MainLayout() {
  return (
    <div className="app-layout">
      <LeftSidebar />
      <main className="main-content">
        {/* Outlet is where the nested routes (EventFeedPage, etc.) will render */}
        <Outlet />
      </main>
      <RightSidebar />
    </div>
  );
}

export default MainLayout;