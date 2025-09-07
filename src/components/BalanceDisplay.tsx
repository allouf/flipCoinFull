import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useWalletStore } from '../stores/walletStore';

interface BalanceDisplayProps {
  className?: string;
  showTokens?: boolean;
  compact?: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  className = '',
  showTokens = true,
  compact = false,
}) => {
  const { connected, balance } = useWallet();
  const { tokenBalances } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '0.0000';
    return bal.toFixed(4);
  };

  const formatTokenBalance = (bal: number, decimals: number) => {
    const divisor = 10 ** decimals;
    return (bal / divisor).toFixed(decimals <= 6 ? decimals : 6);
  };

  const getTotalUsdValue = () => {
    const solValue = balance ? balance * 20 : 0; // Mock SOL price
    const tokenValue = tokenBalances.reduce((total, token) => total + (token.usdValue || 0), 0);
    return solValue + tokenValue;
  };

  const handleRefresh = async () => {
    if (!connected || refreshing) return;

    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (!connected) {
    return (
      <div className={`text-base-content/40 text-sm ${className}`}>
        Connect wallet to view balance
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="text-sm font-medium">
          {formatBalance(balance)}
          {' '}
          SOL
        </div>
        {tokenBalances.length > 0 && (
          <div className="text-xs text-base-content/60">
            +
            {tokenBalances.length}
            {' '}
            token
            {tokenBalances.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-base-200 rounded-lg p-4 ${className}`}>
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base-content">Wallet Balance</h3>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-ghost btn-xs"
          title="Refresh balances"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* SOL Balance */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">SOL</span>
            </div>
            <div>
              <div className="font-medium text-base-content">Solana</div>
              <div className="text-xs text-base-content/60">SOL</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-lg">
              {formatBalance(balance)}
            </div>
            <div className="text-xs text-base-content/60">
              $
              {(balance ? balance * 20 : 0).toFixed(2)}
              {' '}
              USD
            </div>
          </div>
        </div>
      </div>

      {/* SPL Tokens */}
      {showTokens && tokenBalances.length > 0 && (
        <div className="space-y-3">
          <div className="divider text-xs text-base-content/60 my-2">
            SPL Tokens
          </div>

          {tokenBalances.map((token) => (
            <div key={token.mint} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-base-300 rounded-full flex items-center justify-center overflow-hidden">
                  {token.logoUri ? (
                    <img
                      src={token.logoUri}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold">
                      {token.symbol.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm text-base-content">
                    {token.name || token.symbol}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {token.symbol}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {formatTokenBalance(token.balance, token.decimals)}
                </div>
                {token.usdValue && (
                  <div className="text-xs text-base-content/60">
                    $
                    {token.usdValue.toFixed(2)}
                    {' '}
                    USD
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total USD Value */}
      {(balance || tokenBalances.some((t) => t.usdValue)) && (
        <div className="mt-4 pt-3 border-t border-base-300">
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">Total Value</span>
            <span className="font-semibold text-lg text-success">
              $
              {getTotalUsdValue().toFixed(2)}
              {' '}
              USD
            </span>
          </div>
        </div>
      )}

      {/* Empty State for Tokens */}
      {showTokens && tokenBalances.length === 0 && (
        <div className="text-center py-4">
          <div className="text-base-content/40 text-sm">
            No SPL tokens found
          </div>
        </div>
      )}
    </div>
  );
};
