// src/components/layout/PageLayout.jsx
import React from 'react';
import Header from '../common/Header';
import Sidebar from '../sidebar/Sidebar';
import './PageLayout.css';

const PageLayout = ({ children, title, subtitle, icon }) => {
  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Header title={title} subtitle={subtitle} icon={icon} />
        <main className="page-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageLayout;