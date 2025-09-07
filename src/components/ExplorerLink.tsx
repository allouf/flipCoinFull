import React, { useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

interface ExplorerLinkProps {
  signature: string;
  className?: string;
  showFullSignature?: boolean;
  showCopyButton?: boolean;
  children?: React.ReactNode;
}

/**
 * Component for displaying Solana Explorer links with network detection
 */
export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  signature,
  className = '',
  showFullSignature = false,
  showCopyButton = true,
  children,
}) => {
  const { connection } = useConnection();

  // Detect network from connection endpoint
  const networkCluster = useMemo(() => {
    const endpoint = connection.rpcEndpoint;

    if (endpoint.includes('devnet')) {
      return 'devnet';
    } if (endpoint.includes('testnet')) {
      return 'testnet';
    } if (endpoint.includes('mainnet') || endpoint.includes('api.mainnet')) {
      return 'mainnet-beta';
    }
    // Default to mainnet for custom RPCs
    return 'mainnet-beta';
  }, [connection.rpcEndpoint]);

  // Generate Explorer URL
  const explorerUrl = useMemo(() => {
    const baseUrl = 'https://explorer.solana.com';
    const cluster = networkCluster === 'mainnet-beta' ? '' : `?cluster=${networkCluster}`;
    return `${baseUrl}/tx/${signature}${cluster}`;
  }, [signature, networkCluster]);

  // Format signature for display
  const displaySignature = useMemo(() => {
    if (showFullSignature) {
      return signature;
    }
    return `${signature.slice(0, 4)}...${signature.slice(-4)}`;
  }, [signature, showFullSignature]);

  // Copy signature to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(signature);
      toast.success('Transaction signature copied!');
    } catch (error) {
      console.error('Failed to copy signature:', error);
      toast.error('Failed to copy signature');
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
        title={`View transaction on Solana Explorer (${networkCluster})`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span className="font-mono text-sm">
          {children || displaySignature}
        </span>
      </a>

      {/* Copy Button */}
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Copy transaction signature"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      {/* Network Badge */}
      {networkCluster !== 'mainnet-beta' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
          {networkCluster}
        </span>
      )}
    </div>
  );
};

/**
 * Hook for generating Explorer URLs
 */
export const useExplorerUrl = () => {
  const { connection } = useConnection();

  const getTransactionUrl = (signature: string): string => {
    const endpoint = connection.rpcEndpoint;
    let cluster = 'mainnet-beta';

    if (endpoint.includes('devnet')) {
      cluster = 'devnet';
    } else if (endpoint.includes('testnet')) {
      cluster = 'testnet';
    }

    const baseUrl = 'https://explorer.solana.com';
    const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `${baseUrl}/tx/${signature}${clusterParam}`;
  };

  const getAddressUrl = (address: string): string => {
    const endpoint = connection.rpcEndpoint;
    let cluster = 'mainnet-beta';

    if (endpoint.includes('devnet')) {
      cluster = 'devnet';
    } else if (endpoint.includes('testnet')) {
      cluster = 'testnet';
    }

    const baseUrl = 'https://explorer.solana.com';
    const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `${baseUrl}/address/${address}${clusterParam}`;
  };

  const getBlockUrl = (slot: number): string => {
    const endpoint = connection.rpcEndpoint;
    let cluster = 'mainnet-beta';

    if (endpoint.includes('devnet')) {
      cluster = 'devnet';
    } else if (endpoint.includes('testnet')) {
      cluster = 'testnet';
    }

    const baseUrl = 'https://explorer.solana.com';
    const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `${baseUrl}/block/${slot}${clusterParam}`;
  };

  return {
    getTransactionUrl,
    getAddressUrl,
    getBlockUrl,
  };
};
