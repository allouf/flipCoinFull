import React, { useMemo } from 'react';
import toast from 'react-hot-toast';

interface AddressCopyProps {
  address: string;
  className?: string;
  showCopyButton?: boolean;
  truncateLength?: number;
  children?: React.ReactNode;
}

/**
 * Component for displaying and copying Solana addresses with truncation
 */
export const AddressCopy: React.FC<AddressCopyProps> = ({
  address,
  className = '',
  showCopyButton = true,
  truncateLength = 4,
  children,
}) => {
  // Truncate address for display
  const displayAddress = useMemo(() => {
    if (address.length <= truncateLength * 2 + 3) {
      return address; // Don't truncate if already short
    }
    return `${address.slice(0, truncateLength)}...${address.slice(-truncateLength)}`;
  }, [address, truncateLength]);

  // Copy address to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    } catch (error) {
      console.error('Failed to copy address:', error);

      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Address copied!');
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        toast.error('Failed to copy address');
      }
    }
  };

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {/* Address Display */}
      <span className="font-mono text-gray-900 dark:text-white" title={address}>
        {children || displayAddress}
      </span>

      {/* Copy Button */}
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Copy address"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Component for displaying address with Explorer link
 */
export const AddressWithExplorer: React.FC<AddressCopyProps & {
  explorerBaseUrl?: string;
  networkCluster?: string;
}> = ({
  address,
  className = '',
  showCopyButton = true,
  truncateLength = 4,
  explorerBaseUrl = 'https://explorer.solana.com',
  networkCluster = 'mainnet-beta',
  children,
}) => {
  const displayAddress = useMemo(() => {
    if (address.length <= truncateLength * 2 + 3) {
      return address;
    }
    return `${address.slice(0, truncateLength)}...${address.slice(-truncateLength)}`;
  }, [address, truncateLength]);

  const explorerUrl = useMemo(() => {
    const cluster = networkCluster === 'mainnet-beta' ? '' : `?cluster=${networkCluster}`;
    return `${explorerBaseUrl}/address/${address}${cluster}`;
  }, [address, explorerBaseUrl, networkCluster]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Explorer Link */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        title={`View address on Solana Explorer: ${address}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span className="font-mono text-sm">
          {children || displayAddress}
        </span>
      </a>

      {/* Copy Button */}
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Copy address"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};
