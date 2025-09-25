import React from 'react';
import { NavLink } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins, GamepadIcon, BarChart3, Info, Wallet } from 'lucide-react';
import { NetworkSelector } from '../NetworkSelector';
import { useWalletStore } from '../../stores/walletStore';

export const Navigation: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { balance } = useWalletStore();

  const navItems = [
    {
      to: '/lobby',
      icon: <GamepadIcon className="w-5 h-5" />,
      label: 'Game Lobby',
      id: 'lobby'
    },
    {
      to: '/stats',
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'Statistics',
      id: 'stats'
    },
    {
      to: '/about',
      icon: <Info className="w-5 h-5" />,
      label: 'About',
      id: 'about'
    }
  ];

  return (
    <div className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20 sticky top-0 z-50">
      {/* Logo/Brand */}
      <div className="navbar-start">
        <NavLink to="/lobby" className="btn btn-ghost text-xl font-bold">
          <Coins className="w-6 h-6 text-primary" />
          <span className="gradient-bg bg-clip-text text-transparent">
            Fair Coin Flipper
          </span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `btn btn-sm btn-ghost gap-2 ${
                    isActive
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'hover:bg-base-content/10'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Side - Network & Wallet */}
      <div className="navbar-end gap-2">
        {/* Wallet Balance */}
        {connected && publicKey && (
          <div className="flex items-center gap-2 bg-base-200/50 rounded-lg px-3 py-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono">
              {balance !== null ? `${balance.toFixed(3)} SOL` : '-.--- SOL'}
            </span>
          </div>
        )}

        {/* Network Selector */}
        <NetworkSelector />

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-success' : 'bg-error'
            }`}
          />
          <span className="text-sm text-base-content/70 hidden sm:inline">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Wallet Button */}
        <WalletMultiButton className="btn btn-primary btn-sm" />

        {/* Mobile Menu */}
        <div className="dropdown dropdown-end lg:hidden">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            {navItems.map((item) => (
              <li key={`mobile-${item.id}`}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `gap-2 ${
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : ''
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};