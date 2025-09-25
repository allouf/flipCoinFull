import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
};