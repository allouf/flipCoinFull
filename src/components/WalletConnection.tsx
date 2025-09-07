import React from 'react';
import { useWallet } from '../hooks/useWallet';

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  className = '',
}) => {
  const {
    connected,
    publicKey,
    balance,
    connecting,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const formatPublicKey = (key: any) => {
    if (!key) return 'Unknown';
    const keyStr = key.toString();
    return `${keyStr.slice(0, 4)}...${keyStr.slice(-4)}`;
  };

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '0.0000';
    return bal.toFixed(4);
  };

  const handleConnectWallet = async () => {
    try {
      // For now, default to phantom wallet
      await connectWallet('phantom' as any);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleRefreshBalance = () => {
    // Balance is automatically refreshed by the useWallet hook
    // We could add manual refresh logic here if needed
    console.log('Balance refresh requested');
  };

  if (connected) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Balance Display */}
        <div className="glass-card px-3 py-2">
          <div className="text-sm text-base-content/70">Balance</div>
          <div className="font-bold">
            {formatBalance(balance)}
            {' '}
            SOL
          </div>
        </div>

        {/* Wallet Info */}
        <div className="glass-card px-3 py-2">
          <div className="text-sm text-base-content/70">Wallet</div>
          <div className="font-mono text-sm">
            {formatPublicKey(publicKey)}
          </div>
        </div>

        {/* Actions */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52">
            <li>
              <button
                type="button"
                onClick={handleRefreshBalance}
                className="flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Balance
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={disconnectWallet}
                className="flex items-center text-error"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-primary ${connecting ? 'loading' : ''} ${className}`}
      onClick={handleConnectWallet}
      disabled={connecting}
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
