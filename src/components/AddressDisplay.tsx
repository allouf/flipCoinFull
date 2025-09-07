import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { formatAddress, copyAddressToClipboard, getAddressExplorerUrl } from '../utils/address';
import { useWallet } from '../hooks/useWallet';

interface AddressDisplayProps {
  address: string | PublicKey | null | undefined;
  context?: 'short' | 'medium' | 'long' | 'full';
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  context = 'short',
  showCopy = true,
  showExplorer = true,
  className = '',
}) => {
  const { network } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyAddressToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExplorerClick = () => {
    const url = getAddressExplorerUrl(address, network);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!address) {
    return (
      <span className={`text-base-content/40 ${className}`}>
        No address
      </span>
    );
  }

  const formattedAddress = formatAddress(address, context);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="font-mono text-sm select-all">
        {formattedAddress}
      </span>

      <div className="flex items-center space-x-1">
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-ghost btn-xs tooltip"
            data-tip={copied ? 'Copied!' : 'Copy address'}
          >
            {copied ? (
              <svg
                className="w-3 h-3 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        )}

        {showExplorer && (
          <button
            type="button"
            onClick={handleExplorerClick}
            className="btn btn-ghost btn-xs tooltip"
            data-tip="View on Solana Explorer"
          >
            <svg
              className="w-3 h-3"
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
          </button>
        )}
      </div>
    </div>
  );
};
