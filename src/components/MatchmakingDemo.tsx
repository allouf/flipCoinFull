import React from 'react';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { AutoMatchPanel, QueueStatus, MatchNotification } from './index';

// Mock token data for demonstration
const AVAILABLE_TOKENS = [
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    logo: '/tokens/sol.png',
  },
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    logo: '/tokens/usdc.png',
  },
];

/**
 * Demo component showcasing the complete matchmaking flow
 * This demonstrates how to integrate all matchmaking components together
 */
const MatchmakingDemo: React.FC = () => {
  const {
    queueStatus,
    isLoading,
    error,
    matchFound,
    showMatchNotification,
    popularQueues,
    isConnected,
    joinQueue,
    leaveQueue,
    acceptMatch,
    declineMatch,
    refreshStats,
  } = useMatchmaking();

  const handleJoinQueue = async (betAmount: number, tokenMint: string) => {
    try {
      await joinQueue(betAmount, tokenMint);
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue();
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  const handleAcceptMatch = async () => {
    try {
      await acceptMatch();
    } catch (error) {
      console.error('Failed to accept match:', error);
    }
  };

  const handleDeclineMatch = async () => {
    try {
      await declineMatch();
    } catch (error) {
      console.error('Failed to decline match:', error);
    }
  };

  const handleCloseNotification = () => {
    handleDeclineMatch();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Auto-Matching System
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Get instantly matched with players betting the same amount
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex justify-center">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            />
            {isConnected ? 'Connected to Matchmaking' : 'Disconnected'}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  Error:
                  {' '}
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auto Match Panel or Queue Status */}
          <div>
            {queueStatus.isInQueue ? (
              <QueueStatus
                isInQueue={queueStatus.isInQueue}
                queuePosition={queueStatus.queuePosition}
                estimatedWaitTime={queueStatus.estimatedWaitTime}
                playersWaiting={queueStatus.playersWaiting}
                queueKey={queueStatus.queueKey}
                onCancel={handleLeaveQueue}
                onRefresh={refreshStats}
              />
            ) : (
              <AutoMatchPanel
                onJoinQueue={handleJoinQueue}
                onCancelQueue={handleLeaveQueue}
                isInQueue={queueStatus.isInQueue}
                isLoading={isLoading}
                availableTokens={AVAILABLE_TOKENS}
                minBetAmount={0.01}
                maxBetAmount={10}
              />
            )}
          </div>

          {/* Popular Queues / Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Queue Statistics
                </h3>
                <button
                  onClick={refreshStats}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm"
                  disabled={isLoading}
                >
                  Refresh
                </button>
              </div>

              {popularQueues.length > 0 ? (
                <div className="space-y-3">
                  {popularQueues.map((queue, index) => (
                    <div
                      key={`${queue.tokenMint}-${queue.betAmount}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {queue.betAmount}
                          {' '}
                          {queue.tokenMint.includes('So11111') ? 'SOL' : 'USDC'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {queue.playersWaiting}
                          {' '}
                          players waiting
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ~
                          {Math.floor(queue.averageWaitTime / 60)}
                          m
                          {' '}
                          {queue.averageWaitTime % 60}
                          s
                        </div>
                        <div className={`text-xs ${
                          queue.averageWaitTime < 30 ? 'text-green-500'
                            : queue.averageWaitTime < 60 ? 'text-yellow-500' : 'text-red-500'
                        }`}
                        >
                          {queue.averageWaitTime < 30 ? 'Fast'
                            : queue.averageWaitTime < 60 ? 'Normal' : 'Slow'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p>No active queues</p>
                </div>
              )}
            </div>

            {/* Debug Info */}
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Debug Info
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  Connection:
                  {isConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
                <div>
                  Queue Status:
                  {queueStatus.isInQueue ? '🟡 In Queue' : '🟢 Available'}
                </div>
                <div>
                  Loading:
                  {isLoading ? '🔄 Yes' : '⏸️ No'}
                </div>
                <div>
                  Match Found:
                  {matchFound ? '🎯 Yes' : '⏳ No'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            How to Use Auto-Matching
          </h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-300">
            <p>
              1.
              <strong>Select Token:</strong>
              {' '}
              Choose SOL, USDC, or other supported tokens
            </p>
            <p>
              2.
              <strong>Enter Bet Amount:</strong>
              {' '}
              Input your desired bet or use quick amounts
            </p>
            <p>
              3.
              <strong>Find Match:</strong>
              {' '}
              Click to join the queue and wait for another player
            </p>
            <p>
              4.
              <strong>Accept Match:</strong>
              {' '}
              When found, accept within 10 seconds or it auto-accepts
            </p>
            <p>
              5.
              <strong>Play Game:</strong>
              {' '}
              Make your heads/tails selection and wait for results
            </p>
          </div>
        </div>
      </div>

      {/* Match Notification Modal */}
      <MatchNotification
        isVisible={showMatchNotification}
        matchData={matchFound || undefined}
        onAccept={handleAcceptMatch}
        onDecline={handleDeclineMatch}
        onClose={handleCloseNotification}
      />
    </div>
  );
};

export default MatchmakingDemo;
