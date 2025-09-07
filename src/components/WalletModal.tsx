import React, { useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
// import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletName } from '@solana/wallet-adapter-base';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    wallets, select, connect, connecting,
  } = useWallet();
  // const { setVisible } = useWalletModal();

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [visible, handleEscape]);

  const handleWalletSelect = async (walletName: WalletName) => {
    try {
      select(walletName);
      await connect();
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect to wallet:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      tabIndex={-1}
      style={{
        zIndex: 2147483647,
        padding: '40px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="relative bg-gradient-to-br from-base-100 to-base-200 rounded-2xl shadow-2xl w-full max-w-md border border-primary/20 animate-slideUp"
        style={{
          zIndex: 2147483647,
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'visible',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div>
            <h3 id="wallet-modal-title" className="text-lg font-semibold text-base-content">
              Select Wallet
            </h3>
            <p className="text-sm text-base-content/60 mt-1">
              Choose your preferred Solana wallet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close modal"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Wallet Options */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {connecting && (
            <div className="text-center py-4">
              <div className="loading loading-spinner loading-md text-primary" />
              <p className="text-sm text-base-content/60 mt-2">Connecting...</p>
            </div>
          )}

          {wallets.filter((wallet) => wallet.readyState !== 'NotDetected').map((wallet) => (
            <button
              key={wallet.adapter.name}
              type="button"
              onClick={() => handleWalletSelect(wallet.adapter.name)}
              disabled={connecting}
              className={`
                w-full p-4 rounded-lg border border-base-300/50 hover:border-primary/50 
                hover:bg-base-300/30 transition-all duration-200 text-left
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${connecting ? 'cursor-not-allowed' : 'cursor-pointer'}
                group
              `}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-10 h-10 rounded-lg"
                />
                <div className="flex-1">
                  <div className="font-medium text-base-content group-hover:text-primary transition-colors">
                    {wallet.adapter.name}
                  </div>
                  <div className="text-sm text-base-content/60">
                    {wallet.readyState === 'Installed' ? 'Detected' : 'Available'}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-base-content/40 group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}

          {wallets.filter((wallet) => wallet.readyState === 'NotDetected').length > 0 && (
            <>
              <div className="divider text-xs text-base-content/60">Not Installed</div>
              {wallets.filter((wallet) => wallet.readyState === 'NotDetected').map((wallet) => (
                <a
                  key={wallet.adapter.name}
                  href={wallet.adapter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 rounded-lg border border-base-300/30 hover:border-primary/30 hover:bg-base-300/20 transition-all duration-200 text-left block group opacity-70"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      className="w-10 h-10 rounded-lg grayscale group-hover:grayscale-0 transition-all"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-base-content/80">
                        {wallet.adapter.name}
                      </div>
                      <div className="text-sm text-base-content/50">
                        Click to install
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-base-content/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-200 bg-base-50 rounded-b-2xl">
          <div className="flex items-center space-x-2 text-xs text-base-content/60">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Your wallet credentials are never stored</span>
          </div>
        </div>
      </div>
    </div>
  );
};
