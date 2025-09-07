import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { WalletModal } from './WalletModal';

interface WalletConnectButtonProps {
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  className = '',
}) => {
  const {
    connected,
    connecting,
    publicKey,
    balance,
    disconnectWallet,
  } = useWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);

  const formatPublicKey = (key: any) => {
    if (!key) return 'Unknown';
    const keyStr = key.toString();
    return `${keyStr.slice(0, 4)}...${keyStr.slice(-4)}`;
  };

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '0.0000';
    return bal.toFixed(4);
  };

  const handleConnectClick = () => {
    setShowWalletModal(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect wallet:', error);
    }
  };

  if (connected && publicKey) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Balance Display */}
        <div className="hidden sm:flex items-center space-x-2 bg-base-200 rounded-lg px-3 py-2">
          <div className="text-xs text-base-content/60">Balance</div>
          <div className="font-semibold text-sm">
            {formatBalance(balance)}
            {' '}
            SOL
          </div>
        </div>

        {/* Wallet Info with Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-outline btn-sm flex items-center space-x-2 hover:btn-primary"
          >
            <div className="w-2 h-2 bg-success rounded-full" />
            <span className="font-mono text-xs">
              {formatPublicKey(publicKey)}
            </span>
            <svg
              className="w-4 h-4 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>

          <ul
            className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-64 border border-base-300"
          >
            <li className="menu-title text-xs text-base-content/60 px-3 py-1">
              Wallet Actions
            </li>
            <li>
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center justify-between text-error hover:bg-error hover:text-error-content rounded-lg"
              >
                <span>Disconnect</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </div>

        <WalletModal
          visible={showWalletModal}
          onClose={() => setShowWalletModal(false)}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-primary ${connecting ? 'loading' : ''} ${className}`}
        onClick={handleConnectClick}
        disabled={connecting}
      >
        {connecting ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      <WalletModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};
