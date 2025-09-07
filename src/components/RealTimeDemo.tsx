import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { GameRoomLive } from './GameRoomLive';
import { LiveGameFeed } from './LiveGameFeed';
import { ConnectionStatus } from './ConnectionStatus';
import { useRealTimeGameUpdates } from '../hooks/useRealTimeGameUpdates';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useCrossTabSync } from '../hooks/useCrossTabSync';

/**
 * RealTimeDemo - Demonstration component showing real-time capabilities
 *
 * This component showcases:
 * - Live game room with real-time updates
 * - Live game feed showing completed games
 * - Connection status monitoring
 * - Cross-tab synchronization
 * - Optimistic UI updates
 */
export const RealTimeDemo: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('demo_room_1');
  const { publicKey } = useWallet();

  // Real-time hooks
  const {
    subscribe,
    unsubscribe,
    sendOptimisticUpdate,
    getActiveSubscriptionsCount,
  } = useRealTimeGameUpdates();

  const {
    connected,
    reconnecting,
    reconnectAttempts,
    getConnectionHealth,
  } = useConnectionStatus();

  const {
    isLeaderTab,
    tabCount,
    connectionShared,
    broadcastMessage,
  } = useCrossTabSync();

  const playerId = publicKey?.toString() || 'demo_player';

  /**
   * Simulate game events for demonstration
   */
  const simulateGameEvent = async (eventType: string) => {
    const mockEvent = {
      type: eventType,
      roomId: selectedRoomId,
      data: {
        playerId: `opponent_${Date.now()}`,
        timestamp: Date.now(),
        ...(eventType === 'GameResolved' && {
          winner: `winner_${Date.now()}`,
          loser: `loser_${Date.now()}`,
          result: Math.random() > 0.5 ? 'heads' : 'tails',
          betAmount: 1000000000, // 1 SOL in lamports
          payout: 1900000000, // 1.9 SOL (after 3% house fee)
          signature: `demo_signature_${Date.now()}`,
        }),
      },
    };

    // Send optimistic update for immediate feedback
    await sendOptimisticUpdate(selectedRoomId, eventType, mockEvent.data);
  };

  /**
   * Test cross-tab messaging
   */
  const testCrossTabSync = () => {
    broadcastMessage('test_message', {
      message: `Hello from tab ${Date.now()}`,
      timestamp: Date.now(),
    });
  };

  const connectionHealth = getConnectionHealth();
  const activeSubscriptions = getActiveSubscriptionsCount();

  return (
    <div className="real-time-demo max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Real-time Game Updates Demo</h1>
          <ConnectionStatus showDetails />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-gray-600">Connection</div>
            <div className={`font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connected' : reconnecting ? 'Reconnecting' : 'Disconnected'}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border">
            <div className="text-gray-600">Health</div>
            <div className={`font-medium capitalize ${
              connectionHealth.status === 'excellent' ? 'text-green-600'
                : connectionHealth.status === 'good' ? 'text-blue-600'
                  : connectionHealth.status === 'poor' ? 'text-yellow-600'
                    : 'text-red-600'
            }`}
            >
              {connectionHealth.status}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border">
            <div className="text-gray-600">Tab Status</div>
            <div className="font-medium">
              {isLeaderTab ? 'Leader' : 'Follower'}
              {' '}
              (
              {tabCount}
              {' '}
              tabs)
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border">
            <div className="text-gray-600">Subscriptions</div>
            <div className="font-medium">
              {activeSubscriptions}
              {' '}
              active
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Room Demo */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Live Game Room</h2>

            {/* Room Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demo Room ID:
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="demo_room_1">Demo Room 1</option>
                <option value="demo_room_2">Demo Room 2</option>
                <option value="demo_room_3">Demo Room 3</option>
              </select>
            </div>

            {/* Game Room Live Wrapper */}
            <GameRoomLive
              roomId={selectedRoomId}
              playerId={playerId}
              onGameEvent={(event) => console.log('Game event:', event)}
              onPlayerJoined={(playerId) => console.log('Player joined:', playerId)}
              onSelectionMade={(playerId, selection) => console.log('Selection made:', playerId, selection)}
              onGameResolved={(result) => console.log('Game resolved:', result)}
            >
              {/* Mock game interface */}
              <div className="space-y-4">
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">🎲</div>
                  <p className="text-gray-600">Game interface would be here</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This would be your actual coin flip game component
                  </p>
                </div>
              </div>
            </GameRoomLive>

            {/* Demo Controls */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Demo Controls:</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => simulateGameEvent('PlayerJoined')}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Simulate Player Join
                </button>
                <button
                  onClick={() => simulateGameEvent('SelectionMade')}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Simulate Selection
                </button>
                <button
                  onClick={() => simulateGameEvent('GameResolved')}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  Simulate Game Complete
                </button>
                <button
                  onClick={testCrossTabSync}
                  className="px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                >
                  Test Cross-tab Sync
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Game Feed */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Live Game Feed</h2>
            <LiveGameFeed maxGames={10} showAnimation />
          </div>

          {/* Connection Details */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Connection Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={connected ? 'text-green-600' : 'text-red-600'}>
                  {connected ? 'Connected' : reconnecting ? 'Reconnecting' : 'Disconnected'}
                </span>
              </div>

              {reconnecting && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reconnect Attempts:</span>
                  <span className="text-yellow-600">{reconnectAttempts}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Connection Health:</span>
                <span className={`capitalize ${
                  connectionHealth.status === 'excellent' ? 'text-green-600'
                    : connectionHealth.status === 'good' ? 'text-blue-600'
                      : connectionHealth.status === 'poor' ? 'text-yellow-600'
                        : 'text-red-600'
                }`}
                >
                  {connectionHealth.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Connection Shared:</span>
                <span>{connectionShared ? 'Yes' : 'No'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Tab Role:</span>
                <span className={isLeaderTab ? 'text-blue-600' : 'text-gray-600'}>
                  {isLeaderTab ? 'Leader' : 'Follower'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Active Tabs:</span>
                <span>{tabCount}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Subscriptions:</span>
                <span>{activeSubscriptions}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use the demo controls to simulate game events</li>
              <li>• Open multiple tabs to test cross-tab sync</li>
              <li>• Watch the live game feed for new completions</li>
              <li>• Monitor connection status and health</li>
              <li>• Test disconnection/reconnection scenarios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
