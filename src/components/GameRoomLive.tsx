import React, { useEffect, useState, useCallback } from 'react';
import { useRealTimeGameUpdates } from '../hooks/useRealTimeGameUpdates';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { ConnectionStatus } from './ConnectionStatus';
import { LivePlayerStatus } from './LivePlayerStatus';

interface GameRoomLiveProps {
  roomId: string;
  playerId: string;
  children: React.ReactNode;
  onGameEvent?: (event: any) => void;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onSelectionMade?: (playerId: string, selection: string) => void;
  onGameResolved?: (result: any) => void;
}

interface GameRoomState {
  players: string[];
  selections: Record<string, boolean>; // playerId -> hasSelected
  gamePhase: 'waiting' | 'selecting' | 'revealing' | 'completed';
  result: any | null;
  lastUpdate: number;
}

/**
 * GameRoomLive - Wrapper component that adds real-time capabilities to game rooms
 *
 * Features:
 * - Real-time player status updates
 * - Live game state synchronization
 * - Optimistic UI updates with rollback
 * - Connection status monitoring
 * - Cross-tab synchronization
 */
export const GameRoomLive: React.FC<GameRoomLiveProps> = ({
  roomId,
  playerId,
  children,
  onGameEvent,
  onPlayerJoined,
  onPlayerLeft,
  onSelectionMade,
  onGameResolved,
}) => {
  const [gameState, setGameState] = useState<GameRoomState>({
    players: [],
    selections: {},
    gamePhase: 'waiting',
    result: null,
    lastUpdate: Date.now(),
  });

  const [optimisticState, setOptimisticState] = useState<Partial<GameRoomState>>({});
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Real-time hooks
  const { subscribe, unsubscribe, sendOptimisticUpdate } = useRealTimeGameUpdates();
  const { connected, reconnecting } = useConnectionStatus();

  /**
   * Handle incoming game events
   */
  const handleGameEvent = useCallback((event: any) => {
    console.log('Game event received:', event);

    switch (event.type) {
      case 'PlayerJoined':
        handlePlayerJoined(event.data);
        break;
      case 'PlayerLeft':
        handlePlayerLeft(event.data);
        break;
      case 'SelectionMade':
        handleSelectionMade(event.data);
        break;
      case 'GameResolved':
        handleGameResolved(event.data);
        break;
      default:
        console.log('Unknown game event type:', event.type);
    }

    // Clear any pending optimistic updates for this action
    if (event.data.actionId) {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(event.data.actionId);
        return next;
      });
    }

    // Forward to parent component
    onGameEvent?.(event);
  }, [onGameEvent]);

  /**
   * Handle player joined event
   */
  const handlePlayerJoined = useCallback((data: any) => {
    const { playerId: newPlayerId } = data;

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players.filter((p) => p !== newPlayerId), newPlayerId],
      lastUpdate: Date.now(),
    }));

    onPlayerJoined?.(newPlayerId);
  }, [onPlayerJoined]);

  /**
   * Handle player left event
   */
  const handlePlayerLeft = useCallback((data: any) => {
    const { playerId: leftPlayerId } = data;

    setGameState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p !== leftPlayerId),
      selections: Object.fromEntries(
        Object.entries(prev.selections).filter(([id]) => id !== leftPlayerId),
      ),
      lastUpdate: Date.now(),
    }));

    onPlayerLeft?.(leftPlayerId);
  }, [onPlayerLeft]);

  /**
   * Handle selection made event
   */
  const handleSelectionMade = useCallback((data: any) => {
    const { playerId: selectorId, hasSelection } = data;

    setGameState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [selectorId]: hasSelection !== false,
      },
      gamePhase: Object.keys(prev.selections).length >= prev.players.length ? 'revealing' : 'selecting',
      lastUpdate: Date.now(),
    }));

    onSelectionMade?.(selectorId, hasSelection ? 'made' : 'pending');
  }, [onSelectionMade]);

  /**
   * Handle game resolved event
   */
  const handleGameResolved = useCallback((data: any) => {
    setGameState((prev) => ({
      ...prev,
      gamePhase: 'completed',
      result: data.result,
      lastUpdate: Date.now(),
    }));

    // Clear all optimistic state
    setOptimisticState({});
    setPendingActions(new Set());

    onGameResolved?.(data.result);
  }, [onGameResolved]);

  /**
   * Send optimistic update for immediate UI feedback
   */
  const sendOptimisticAction = useCallback(async (action: string, data: any) => {
    const actionId = `${action}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Add to pending actions
    setPendingActions((prev) => new Set(prev).add(actionId));

    // Apply optimistic state immediately
    switch (action) {
      case 'makeSelection':
        setOptimisticState((prev) => ({
          ...prev,
          selections: {
            ...gameState.selections,
            ...prev.selections,
            [playerId]: true,
          },
        }));
        break;
      default:
        break;
    }

    // Send to real-time system
    try {
      await sendOptimisticUpdate(roomId, action, { ...data, actionId });
    } catch (error) {
      console.error('Failed to send optimistic update:', error);
      // Rollback optimistic state
      rollbackOptimisticAction(actionId);
    }
  }, [roomId, playerId, gameState.selections, sendOptimisticUpdate]);

  /**
   * Rollback optimistic action on failure
   */
  const rollbackOptimisticAction = useCallback((actionId: string) => {
    setPendingActions((prev) => {
      const next = new Set(prev);
      next.delete(actionId);
      return next;
    });

    // TODO: Implement proper rollback logic based on action type
    setOptimisticState({});
  }, []);

  // Subscribe to room events on mount
  useEffect(() => {
    if (!roomId) return;

    const subscriptionId = subscribe(roomId, handleGameEvent);

    return () => {
      unsubscribe(subscriptionId);
    };
  }, [roomId, subscribe, unsubscribe, handleGameEvent]);

  // Merge actual state with optimistic state
  const effectiveState = {
    ...gameState,
    ...optimisticState,
  };

  // Get opponent player ID
  const opponentId = effectiveState.players.find((p) => p !== playerId);

  return (
    <div className="game-room-live relative">
      {/* Connection Status */}
      <div className="absolute top-2 right-2 z-10">
        <ConnectionStatus />
      </div>

      {/* Live Player Status */}
      {opponentId && (
        <div className="mb-4">
          <LivePlayerStatus
            playerId={opponentId}
            hasSelected={effectiveState.selections[opponentId]}
            isOnline={connected}
          />
        </div>
      )}

      {/* Game Phase Indicator */}
      <div className="mb-4 text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          effectiveState.gamePhase === 'waiting' ? 'bg-yellow-100 text-yellow-800'
            : effectiveState.gamePhase === 'selecting' ? 'bg-blue-100 text-blue-800'
              : effectiveState.gamePhase === 'revealing' ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
        }`}
        >
          {reconnecting ? (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2" />
              Reconnecting...
            </>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
              />
              {effectiveState.gamePhase === 'waiting' && 'Waiting for players'}
              {effectiveState.gamePhase === 'selecting' && 'Making selections'}
              {effectiveState.gamePhase === 'revealing' && 'Revealing results'}
              {effectiveState.gamePhase === 'completed' && 'Game complete'}
            </>
          )}
        </div>
      </div>

      {/* Pending Actions Indicator */}
      {pendingActions.size > 0 && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
            Processing
            {' '}
            {pendingActions.size}
            {' '}
            action
            {pendingActions.size > 1 ? 's' : ''}
            ...
          </div>
        </div>
      )}

      {/* Enhanced children with optimistic action capability */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            gameState: effectiveState,
            sendOptimisticAction,
            hasPendingActions: pendingActions.size > 0,
          } as any);
        }
        return child;
      })}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <div>
            <strong>Room:</strong>
            {' '}
            {roomId}
          </div>
          <div>
            <strong>Players:</strong>
            {' '}
            {effectiveState.players.join(', ')}
          </div>
          <div>
            <strong>Phase:</strong>
            {' '}
            {effectiveState.gamePhase}
          </div>
          <div>
            <strong>Selections:</strong>
            {' '}
            {Object.keys(effectiveState.selections).length}
            /
            {effectiveState.players.length}
          </div>
          <div>
            <strong>Pending:</strong>
            {' '}
            {pendingActions.size}
          </div>
          <div>
            <strong>Connected:</strong>
            {' '}
            {connected ? 'Yes' : 'No'}
          </div>
        </div>
      )}
    </div>
  );
};
