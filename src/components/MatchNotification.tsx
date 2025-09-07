import React, { useState, useEffect } from 'react';

// Types
interface MatchNotificationProps {
  isVisible: boolean;
  matchData?: {
    roomId: string;
    opponent: string;
    betAmount: number;
    tokenMint: string;
    autoAcceptTimeout: number; // in milliseconds
  };
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const MatchNotification: React.FC<MatchNotificationProps> = ({
  isVisible,
  matchData,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasAutoAccepted, setHasAutoAccepted] = useState<boolean>(false);

  // Countdown timer for auto-accept
  useEffect(() => {
    if (!isVisible || !matchData) {
      setTimeLeft(0);
      setHasAutoAccepted(false);
      return;
    }

    setTimeLeft(Math.floor(matchData.autoAcceptTimeout / 1000));
    setHasAutoAccepted(false);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-accept when timer runs out
          if (!hasAutoAccepted) {
            setHasAutoAccepted(true);
            onAccept();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, matchData, onAccept, hasAutoAccepted]);

  // Play notification sound
  useEffect(() => {
    if (isVisible) {
      // TODO: Implement actual sound notification
      console.log('🔊 Match found notification sound');

      // Request notification permission and show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Match Found!', {
          body: `Found opponent for ${matchData?.betAmount} ${getTokenSymbol(matchData?.tokenMint || '')} bet`,
          icon: '/favicon.ico', // TODO: Add actual icon
          requireInteraction: true,
        });
      }
    }
  }, [isVisible, matchData]);

  const getTokenSymbol = (mint: string): string => {
    // TODO: Replace with actual token registry lookup
    const tokenMap: { [key: string]: string } = {
      So11111111111111111111111111111111111111112: 'SOL',
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
    };
    return tokenMap[mint] || 'TOKEN';
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getProgressPercentage = (): number => {
    if (!matchData) return 0;
    const totalTime = matchData.autoAcceptTimeout / 1000;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  if (!isVisible || !matchData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full animate-pulse-grow">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Match Found! 🎉
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Opponent ready to play
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Match Details */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Room ID:</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white">
                {matchData.roomId.slice(0, 12)}
                ...
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Opponent:</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white">
                {formatAddress(matchData.opponent)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Bet Amount:</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {matchData.betAmount}
                {' '}
                {getTokenSymbol(matchData.tokenMint)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Total Pot:</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">
                {(matchData.betAmount * 2).toFixed(4)}
                {' '}
                {getTokenSymbol(matchData.tokenMint)}
              </span>
            </div>
          </div>

          {/* Auto-accept Timer */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Auto-accepting in:
              </span>
              <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
                {timeLeft}
                s
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              The match will be accepted automatically when the timer reaches zero
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onAccept}
              disabled={hasAutoAccepted}
              className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50
                text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept Now</span>
            </button>

            <button
              onClick={onDecline}
              disabled={hasAutoAccepted}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50
                text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Decline</span>
            </button>
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Ready to Play?
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Once accepted, the game cannot be cancelled and funds will be locked in the smart contract.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add the pulse grow animation to your CSS or Tailwind config
const style = `
  @keyframes pulse-grow {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-pulse-grow {
    animation: pulse-grow 0.3s ease-out;
  }
`;

// Inject styles if not using Tailwind CSS
if (typeof document !== 'undefined' && !document.getElementById('match-notification-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'match-notification-styles';
  styleElement.textContent = style;
  document.head.appendChild(styleElement);
}

export default MatchNotification;
