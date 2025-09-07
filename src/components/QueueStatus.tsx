import React, { useState, useEffect } from 'react';

// Types
interface QueueStatusProps {
  isInQueue: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number; // in seconds
  playersWaiting?: number;
  queueKey?: string;
  onCancel: () => void;
  onRefresh?: () => void;
}

interface QueueStats {
  tokenMint: string;
  betAmount: number;
  playersWaiting: number;
  averageWaitTime: number;
}

const QueueStatus: React.FC<QueueStatusProps> = ({
  isInQueue,
  queuePosition = 0,
  estimatedWaitTime = 0,
  playersWaiting = 0,
  queueKey,
  onCancel,
  onRefresh,
}) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [popularQueues, setPopularQueues] = useState<QueueStats[]>([]);

  // Timer for elapsed time in queue
  useEffect(() => {
    if (!isInQueue) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isInQueue]);

  // Mock popular queues data - TODO: Replace with actual API call
  useEffect(() => {
    if (!isInQueue) {
      // Simulate fetching popular queues when not in queue
      const mockData: QueueStats[] = [
        {
          tokenMint: 'So11111111111111111111111111111111111111112', betAmount: 0.1, playersWaiting: 5, averageWaitTime: 15,
        },
        {
          tokenMint: 'So11111111111111111111111111111111111111112', betAmount: 0.05, playersWaiting: 3, averageWaitTime: 25,
        },
        {
          tokenMint: 'So11111111111111111111111111111111111111112', betAmount: 0.25, playersWaiting: 2, averageWaitTime: 45,
        },
        {
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', betAmount: 100, playersWaiting: 4, averageWaitTime: 20,
        },
      ];
      setPopularQueues(mockData);
    }
  }, [isInQueue]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTokenName = (mint: string): string => {
    // TODO: Replace with actual token registry lookup
    const tokenMap: { [key: string]: string } = {
      So11111111111111111111111111111111111111112: 'SOL',
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
    };
    return tokenMap[mint] || `${mint.slice(0, 8)}...`;
  };

  const getStatusColor = (waitTime: number): string => {
    if (waitTime < 30) return 'text-green-500';
    if (waitTime < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getQueueHealthColor = (playersWaiting: number): string => {
    if (playersWaiting >= 4) return 'bg-green-500';
    if (playersWaiting >= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isInQueue) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Popular Matches
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Join a popular bet amount for faster matching
          </p>
        </div>

        <div className="space-y-3">
          {popularQueues.map((queue, index) => (
            <div
              key={`${queue.tokenMint}-${queue.betAmount}`}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={() => {
                // TODO: Auto-fill the AutoMatchPanel with this bet amount
                console.log('Selected queue:', queue);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getQueueHealthColor(queue.playersWaiting)}`} />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {queue.betAmount}
                    {' '}
                    {formatTokenName(queue.tokenMint)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {queue.playersWaiting}
                    {' '}
                    waiting
                  </div>
                </div>
              </div>
              <div className={`text-sm ${getStatusColor(queue.averageWaitTime)}`}>
                ~
                {formatTime(queue.averageWaitTime)}
              </div>
            </div>
          ))}
        </div>

        {popularQueues.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-sm">No active queues right now</p>
              <p className="text-xs mt-1">Be the first to start a match!</p>
            </div>
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-full mt-4 py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
              border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh Queues
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Searching for Match
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          You'll be matched automatically when another player joins
        </p>
      </div>

      {/* Queue Stats */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Position in queue:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            #
            {queuePosition}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Players waiting:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {playersWaiting}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Estimated wait:</span>
          <span className={`font-bold ${getStatusColor(estimatedWaitTime)}`}>
            {formatTime(estimatedWaitTime)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Time elapsed:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {formatTime(elapsedTime)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>Progress</span>
          <span>
            {Math.min(100, Math.round((elapsedTime / (estimatedWaitTime || 1)) * 100))}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min(100, (elapsedTime / (estimatedWaitTime || 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Queue Info */}
      {queueKey && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Queue:
            {' '}
            <span className="font-mono text-xs">{queueKey}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onCancel}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
            transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Leave Queue
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
              border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh Status
          </button>
        )}
      </div>

      {/* Status Indicators */}
      <div className="mt-6 flex justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
          Fast (&lt;30s)
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1" />
          Normal (&lt;1m)
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
          Slow (&gt;1m)
        </div>
      </div>
    </div>
  );
};

export default QueueStatus;
