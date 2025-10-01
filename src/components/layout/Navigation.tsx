import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins, GamepadIcon, BarChart3, Info, Wallet } from 'lucide-react';
import { NetworkSelector } from '../NetworkSelector';
import { useWalletStore } from '../../stores/walletStore';

export const Navigation: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { balance, setBalance } = useWalletStore();

  // Fetch wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey && connection) {
        try {
          const balanceInLamports = await connection.getBalance(publicKey);
          const balanceInSol = balanceInLamports / 1_000_000_000; // Convert to SOL
          setBalance(balanceInSol);
        } catch (err) {
          console.error('Failed to fetch balance:', err);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds when connected
    const interval = connected ? setInterval(fetchBalance, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected, publicKey, connection, setBalance]);

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
      <div className="navbar-end gap-4">
        {/* Network Selector */}
        <div className="hidden md:block">
          <NetworkSelector />
        </div>

        {/* Wallet Balance (Only when connected) */}
        {connected && balance !== null && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg shadow-sm">
            <Wallet className="w-4 h-4 text-success" />
            <div>
              <div className="text-xs text-base-content/60 leading-tight">Balance</div>
              <div className="text-sm font-bold font-mono leading-tight text-success">
                {balance.toFixed(4)} SOL
              </div>
            </div>
          </div>
        )}

        {/* Wallet Connect Button */}
        <WalletMultiButton className="!btn !btn-primary !rounded-lg !font-semibold !px-6 !shadow-md !hover:shadow-lg !transition-all" />

        {/* Mobile Menu */}
        <div className="dropdown dropdown-end lg:hidden ml-2">
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
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 border border-base-300/20 rounded-xl w-56"
          >
            {/* Mobile wallet info */}
            {connected && publicKey && (
              <>
                <li className="px-2 py-3 border-b border-base-300/20">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs text-base-content/60">Balance</div>
                      <div className="text-sm font-bold font-mono">
                        {balance !== null ? `${balance.toFixed(4)} SOL` : '-.---- SOL'}
                      </div>
                    </div>
                  </div>
                </li>
                <div className="divider my-1"></div>
              </>
            )}

            {/* Navigation items */}
            {navItems.map((item) => (
              <li key={`mobile-${item.id}`}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `gap-3 py-3 ${
                      isActive
                        ? 'bg-primary/20 text-primary border-l-2 border-primary'
                        : 'hover:bg-base-200'
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