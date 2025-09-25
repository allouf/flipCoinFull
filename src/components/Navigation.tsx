import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const { connected } = useWallet();

  const navItems = [
    {
      path: '/lobby',
      label: 'Game Lobby',
      icon: '🎮',
      description: 'Join or create games'
    },
    {
      path: '/stats',
      label: 'Statistics',
      icon: '📊',
      description: 'View your game history',
      requiresWallet: true
    },
    {
      path: '/about',
      label: 'About',
      icon: 'ℹ️',
      description: 'How to play & rules'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/lobby') {
      return location.pathname === '/' || location.pathname === '/lobby';
    }
    return location.pathname === path;
  };

  return (
    <nav className={`navigation ${className}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <span className="brand-icon">🪙</span>
            <span className="brand-text">Fair Coin Flipper</span>
          </Link>
        </div>

        <div className="nav-links">
          {navItems.map((item) => {
            // Hide wallet-required items if wallet not connected
            if (item.requiresWallet && !connected) {
              return null;
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                title={item.description}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-status">
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator">
              {connected ? '🟢' : '🔴'}
            </span>
            <span className="status-text">
              {connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
