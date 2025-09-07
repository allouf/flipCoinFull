import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';

// Types
interface Token {
  mint: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

interface AutoMatchPanelProps {
  onJoinQueue: (betAmount: number, tokenMint: string) => void;
  onCancelQueue: () => void;
  isInQueue: boolean;
  isLoading: boolean;
  availableTokens: Token[];
  minBetAmount: number;
  maxBetAmount?: number;
}

const AutoMatchPanel: React.FC<AutoMatchPanelProps> = ({
  onJoinQueue,
  onCancelQueue,
  isInQueue,
  isLoading,
  availableTokens = [],
  minBetAmount = 0.01,
  maxBetAmount,
}) => {
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<Token | null>(
    availableTokens.length > 0 ? availableTokens[0] : null,
  );
  const [errors, setErrors] = useState<{ betAmount?: string; token?: string }>({});

  // Predefined quick bet amounts
  const quickBetAmounts = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

  const validateInputs = (): boolean => {
    const newErrors: { betAmount?: string; token?: string } = {};

    if (!betAmount || isNaN(parseFloat(betAmount))) {
      newErrors.betAmount = 'Please enter a valid bet amount';
    } else {
      const amount = parseFloat(betAmount);
      if (amount < minBetAmount) {
        newErrors.betAmount = `Minimum bet is ${minBetAmount}`;
      }
      if (maxBetAmount && amount > maxBetAmount) {
        newErrors.betAmount = `Maximum bet is ${maxBetAmount}`;
      }
    }

    if (!selectedToken) {
      newErrors.token = 'Please select a token';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleJoinQueue = () => {
    if (!validateInputs()) return;

    const amount = parseFloat(betAmount);
    const tokenMint = selectedToken!.mint;

    onJoinQueue(amount, tokenMint);
  };

  const handleQuickBet = (amount: number) => {
    setBetAmount(amount.toString());
    setErrors((prev) => ({ ...prev, betAmount: undefined }));
  };

  const formatBalance = (balance: number, decimals = 4): string => balance.toFixed(decimals);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Quick Match
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Get instantly matched with another player betting the same amount
        </p>
      </div>

      {/* Token Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Token
        </label>
        <div className="relative">
          <select
            value={selectedToken?.mint || ''}
            onChange={(e) => {
              const token = availableTokens.find((t) => t.mint === e.target.value);
              setSelectedToken(token || null);
              setErrors((prev) => ({ ...prev, token: undefined }));
            }}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              ${errors.token ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            disabled={isInQueue}
          >
            <option value="">Select a token...</option>
            {availableTokens.map((token) => (
              <option key={token.mint} value={token.mint}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
        {errors.token && (
          <p className="text-red-500 text-xs mt-1">{errors.token}</p>
        )}
      </div>

      {/* Bet Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bet Amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => {
              setBetAmount(e.target.value);
              setErrors((prev) => ({ ...prev, betAmount: undefined }));
            }}
            placeholder={`Minimum ${minBetAmount}`}
            step="0.01"
            min={minBetAmount}
            max={maxBetAmount}
            className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              ${errors.betAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            disabled={isInQueue}
          />
          {selectedToken && (
            <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 text-sm">
              {selectedToken.symbol}
            </div>
          )}
        </div>
        {errors.betAmount && (
          <p className="text-red-500 text-xs mt-1">{errors.betAmount}</p>
        )}
      </div>

      {/* Quick Bet Buttons */}
      {!isInQueue && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Amounts
          </label>
          <div className="grid grid-cols-3 gap-2">
            {quickBetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickBet(amount)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                  text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                type="button"
              >
                {amount}
                {' '}
                {selectedToken?.symbol || 'SOL'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Balance Display */}
      {selectedToken && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-300">Available Balance:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {/* TODO: Implement actual balance fetching */}
              --
              {' '}
              {selectedToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="space-y-3">
        {!isInQueue ? (
          <button
            onClick={handleJoinQueue}
            disabled={isLoading || !selectedToken || !betAmount}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
              text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Finding Match...
              </div>
            ) : (
              'Find Match'
            )}
          </button>
        ) : (
          <button
            onClick={onCancelQueue}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
              transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cancel Search
          </button>
        )}
      </div>

      {/* Warning Message */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              Important Notice
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
              Once matched, bets cannot be cancelled. Only bet what you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoMatchPanel;
