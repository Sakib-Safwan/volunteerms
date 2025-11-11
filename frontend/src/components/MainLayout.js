import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // UPDATED
import RightSidebar from './RightSidebar';

function MainLayout() {
  return (
    <>
      <Header /> {/* ADDED HEADER */}
      <div className="app-layout-2-col"> {/* UPDATED CLASS */}
        <main className="main-content">
          <Outlet />
        </main>
        <RightSidebar /> {/* SIDEBAR IS NOW ON THE RIGHT */}
      </div>
    </>
  );
}

export default MainLayout;