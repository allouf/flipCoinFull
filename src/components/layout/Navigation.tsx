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
    <div className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20 sticky top-0 z-50 px-1 sm:px-4 min-h-[50px] sm:min-h-[64px]">
      {/* Logo/Brand + Navigation Links */}
      <div className="navbar-start gap-1 sm:gap-4 flex-shrink">
        <NavLink to="/lobby" className="btn btn-ghost btn-xs sm:btn-md text-sm sm:text-xl font-bold px-1 sm:px-4 min-h-[36px] sm:min-h-[48px] h-[36px] sm:h-auto">
          <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
          <span className="gradient-bg bg-clip-text text-transparent hidden sm:inline whitespace-nowrap">
            Fair Coin Flipper
          </span>
          <span className="gradient-bg bg-clip-text text-transparent sm:hidden text-xs whitespace-nowrap">
            Flip
          </span>
        </NavLink>

        {/* Navigation Links */}
        <ul className="menu menu-horizontal px-1 gap-1 hidden lg:flex">
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
      <div className="navbar-end gap-1 sm:gap-2 flex-shrink-0">
        {/* Network Selector */}
        <div className="hidden md:block">
          <NetworkSelector />
        </div>

        {/* Wallet Balance (Only when connected) */}
        {connected && balance !== null && (
          <div className="hidden md:flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg shadow-sm">
            <Wallet className="w-4 h-4 text-success" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-base-content/60">Balance:</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-success">
                {balance.toFixed(4)} SOL
              </span>
            </div>
          </div>
        )}

        {/* Wallet Connect Button - Mobile optimized */}
        <WalletMultiButton
          className="!btn !btn-primary !btn-xs sm:!btn-md !rounded-lg !font-semibold !px-2 sm:!px-6 !shadow-md !hover:shadow-lg !transition-all !min-h-[36px] sm:!min-h-[48px] !h-[36px] sm:!h-auto !text-xs sm:!text-sm !max-w-[120px] sm:!max-w-none"
          style={{
            fontSize: 'clamp(0.65rem, 2vw, 0.875rem)',
          }}
        />

        {/* Mobile Menu */}
        <div className="dropdown dropdown-end lg:hidden ml-1">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-xs sm:btn-sm min-h-[36px] h-[36px] w-[36px] sm:w-auto sm:h-auto p-1 sm:p-2">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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