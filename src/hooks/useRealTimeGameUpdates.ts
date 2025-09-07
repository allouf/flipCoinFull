import { useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { webSocketManager } from '../services/WebSocketManager';
import { eventSubscriptionManager } from '../services/EventSubscriptionManager';
import { syncManager } from '../services/SyncManager';
import { useAnchorProgram } from './useAnchorProgram';

export interface UseRealTimeGameUpdatesOptions {
  autoConnect?: boolean;
  enableOptimisticUpdates?: boolean;
  eventThrottleMs?: number;
}

export interface GameEventSubscription {
  id: string;
  roomId: string;
  callback: (event: any) => void;
  active: boolean;
}

/**
 * useRealTimeGameUpdates - Hook for managing real-time game event subscriptions
 *
 * Features:
 * - Subscribe to specific game room events
 * - Global game event monitoring
 * - Optimistic UI updates with rollback
 * - Cross-tab synchronization
 * - Automatic reconnection handling
 */
export const useRealTimeGameUpdates = (options: UseRealTimeGameUpdatesOptions = {}) => {
  const {
    autoConnect = true,
    enableOptimisticUpdates = true,
    eventThrottleMs = 100,
  } = options;

  const { connection } = useConnection();
  const { program } = useAnchorProgram();
  const subscriptionsRef = useRef<Map<string, GameEventSubscription>>(new Map());
  const eventThrottleRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Initialize real-time systems
   */
  const initialize = useCallback(async () => {
    try {
      // Set up event subscription manager with connection and program
      if (connection && program) {
        eventSubscriptionManager.setProgram(program as any);
      }

      // Auto-connect WebSocket if enabled and we're the leader tab
      if (autoConnect && syncManager.isLeaderTab()) {
        await webSocketManager.connect();
      }
    } catch (error) {
      console.error('Failed to initialize real-time systems:', error);
    }
  }, [connection, program, autoConnect]);

  /**
   * Subscribe to game room events
   */
  const subscribe = useCallback((roomId: string, callback: (event: any) => void): string => {
    const subscriptionId = `${roomId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const subscription: GameEventSubscription = {
      id: subscriptionId,
      roomId,
      callback,
      active: true,
    };

    subscriptionsRef.current.set(subscriptionId, subscription);

    // Set up WebSocket room subscription
    if (syncManager.isLeaderTab()) {
      webSocketManager.subscribeToRoom(roomId);
    }

    // Set up Solana account subscription for the room
    if (roomId !== 'global') {
      try {
        eventSubscriptionManager.subscribeToGameRoom(roomId);
      } catch (error) {
        console.error('Failed to subscribe to Solana events:', error);
      }
    }

    // Add room to sync manager
    syncManager.addGameRoom(roomId);

    console.log('Subscribed to room:', roomId, 'ID:', subscriptionId);
    return subscriptionId;
  }, []);

  /**
   * Unsubscribe from events
   */
  const unsubscribe = useCallback((subscriptionId: string) => {
    const subscription = subscriptionsRef.current.get(subscriptionId);
    if (!subscription) {
      console.warn('Subscription not found:', subscriptionId);
      return;
    }

    subscription.active = false;
    subscriptionsRef.current.delete(subscriptionId);

    // Unsubscribe from WebSocket room if no other subscriptions exist for this room
    const roomSubscriptions = Array.from(subscriptionsRef.current.values()).filter(
      (sub) => sub.roomId === subscription.roomId && sub.active,
    );

    if (roomSubscriptions.length === 0) {
      if (syncManager.isLeaderTab()) {
        webSocketManager.unsubscribeFromRoom(subscription.roomId);
      }
      syncManager.removeGameRoom(subscription.roomId);
    }

    // Clear any throttled events
    const throttleKey = `${subscription.roomId}_${subscriptionId}`;
    const throttleTimeout = eventThrottleRef.current.get(throttleKey);
    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
      eventThrottleRef.current.delete(throttleKey);
    }

    console.log('Unsubscribed from:', subscriptionId);
  }, []);

  /**
   * Send optimistic update for immediate UI feedback
   */
  const sendOptimisticUpdate = useCallback(async (
    roomId: string,
    action: string,
    data: any,
  ): Promise<void> => {
    if (!enableOptimisticUpdates) return;

    const optimisticEvent = {
      type: `${action}_optimistic`,
      roomId,
      data,
      timestamp: Date.now(),
      optimistic: true,
    };

    // Immediately notify local subscriptions
    const roomSubscriptions = Array.from(subscriptionsRef.current.values()).filter(
      (sub) => sub.roomId === roomId && sub.active,
    );

    roomSubscriptions.forEach((sub) => {
      sub.callback(optimisticEvent);
    });

    // Broadcast to other tabs
    syncManager.broadcast('game_event', optimisticEvent);

    // Send to server if we're the leader
    if (syncManager.isLeaderTab()) {
      webSocketManager.sendMessage('optimistic_action', {
        roomId,
        action,
        data,
      });
    }
  }, [enableOptimisticUpdates]);

  /**
   * Handle incoming events with throttling
   */
  const handleEvent = useCallback((event: any) => {
    const { roomId = 'global' } = event;
    const throttleKey = `${roomId}_event`;

    // Get subscriptions for this room
    const roomSubscriptions = Array.from(subscriptionsRef.current.values()).filter(
      (sub) => (sub.roomId === roomId || sub.roomId === 'global') && sub.active,
    );

    if (roomSubscriptions.length === 0) return;

    // Throttle events to prevent overwhelming the UI
    const existingTimeout = eventThrottleRef.current.get(throttleKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      roomSubscriptions.forEach((sub) => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
      eventThrottleRef.current.delete(throttleKey);
    }, eventThrottleMs);

    eventThrottleRef.current.set(throttleKey, timeout);
  }, [eventThrottleMs]);

  /**
   * Get active subscriptions count
   */
  const getActiveSubscriptionsCount = useCallback((): number => Array.from(subscriptionsRef.current.values()).filter((sub) => sub.active).length, []);

  /**
   * Get subscriptions for a specific room
   */
  const getRoomSubscriptions = useCallback((roomId: string): GameEventSubscription[] => Array.from(subscriptionsRef.current.values()).filter(
    (sub) => sub.roomId === roomId && sub.active,
  ), []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set up event handlers
  useEffect(() => {
    // WebSocket events
    webSocketManager.on('gameEvent', handleEvent);
    webSocketManager.on('roomUpdate', handleEvent);

    // Solana events
    eventSubscriptionManager.on('gameEvent', handleEvent);

    // Cross-tab events
    syncManager.on('gameEvent', handleEvent);

    // Leadership change handler
    const handleLeadershipChange = ({ isLeader }: { isLeader: boolean }) => {
      if (isLeader && autoConnect) {
        // Became leader, take over WebSocket connection
        initialize();
      }
    };

    syncManager.on('leadershipChanged', handleLeadershipChange);

    return () => {
      // Cleanup event listeners
      webSocketManager.off('gameEvent', handleEvent);
      webSocketManager.off('roomUpdate', handleEvent);
      eventSubscriptionManager.off('gameEvent', handleEvent);
      syncManager.off('gameEvent', handleEvent);
      syncManager.off('leadershipChanged', handleLeadershipChange);

      // Clear throttle timers
      eventThrottleRef.current.forEach((timeout) => clearTimeout(timeout));
      eventThrottleRef.current.clear();
    };
  }, [handleEvent, autoConnect, initialize]);

  // Cleanup on unmount
  useEffect(() => () => {
    // Unsubscribe from all active subscriptions
    const activeSubscriptions = Array.from(subscriptionsRef.current.keys());
    activeSubscriptions.forEach(unsubscribe);
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    sendOptimisticUpdate,
    getActiveSubscriptionsCount,
    getRoomSubscriptions,
  };
};
