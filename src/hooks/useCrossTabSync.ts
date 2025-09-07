import { useState, useEffect, useCallback } from 'react';
import { syncManager, TabState } from '../services/SyncManager';

export interface CrossTabSyncHook {
  isLeaderTab: boolean;
  tabId: string;
  tabCount: number;
  connectionShared: boolean;
  gameRooms: string[];
  broadcastMessage: (type: string, data: any) => void;
  updateGameRooms: (rooms: string[]) => void;
  getTabState: () => TabState;
}

export interface TabInfo {
  tabId: string;
  isLeader: boolean;
  lastHeartbeat: number;
  gameRooms: string[];
  connectionStatus: string;
}

/**
 * useCrossTabSync - Hook for managing cross-tab synchronization
 *
 * Features:
 * - Track tab leadership status
 * - Monitor active tab count
 * - Share connection state across tabs
 * - Broadcast custom messages
 * - Manage shared game room state
 */
export const useCrossTabSync = (): CrossTabSyncHook => {
  const [tabState, setTabState] = useState<TabState>(() => syncManager.getState());
  const [knownTabs, setKnownTabs] = useState<Map<string, TabInfo>>(new Map());

  /**
   * Handle state updates from sync manager
   */
  const handleStateUpdate = useCallback((newState: TabState) => {
    setTabState(newState);
  }, []);

  /**
   * Handle remote state updates from other tabs
   */
  const handleRemoteStateUpdate = useCallback((remoteState: TabState) => {
    // Update our knowledge of other tabs
    setKnownTabs((prev) => {
      const updated = new Map(prev);
      updated.set(remoteState.tabId, {
        tabId: remoteState.tabId,
        isLeader: remoteState.isLeader,
        lastHeartbeat: Date.now(),
        gameRooms: remoteState.gameRooms,
        connectionStatus: remoteState.connectionStatus,
      });
      return updated;
    });
  }, []);

  /**
   * Handle leadership changes
   */
  const handleLeadershipChange = useCallback(({ isLeader, tabId }: { isLeader: boolean; tabId: string }) => {
    setTabState((prev) => ({
      ...prev,
      isLeader,
    }));

    console.log(isLeader ? 'Became leader tab' : 'Became follower tab', tabId);
  }, []);

  /**
   * Handle heartbeat messages to track active tabs
   */
  const handleHeartbeat = useCallback((data: any) => {
    const { tabId, isLeader, timestamp } = data;

    setKnownTabs((prev) => {
      const updated = new Map(prev);
      updated.set(tabId, {
        tabId,
        isLeader: isLeader || false,
        lastHeartbeat: timestamp,
        gameRooms: [], // Will be updated by state updates
        connectionStatus: 'unknown',
      });
      return updated;
    });
  }, []);

  /**
   * Clean up stale tabs
   */
  const cleanupStaleTabs = useCallback(() => {
    const now = Date.now();
    const STALE_TIMEOUT = 10000; // 10 seconds

    setKnownTabs((prev) => {
      const updated = new Map(prev);
      for (const [tabId, info] of updated) {
        if (now - info.lastHeartbeat > STALE_TIMEOUT) {
          updated.delete(tabId);
        }
      }
      return updated;
    });
  }, []);

  /**
   * Broadcast a message to all tabs
   */
  const broadcastMessage = useCallback((type: string, data: any) => {
    syncManager.broadcast(type as any, data);
  }, []);

  /**
   * Update game rooms and sync across tabs
   */
  const updateGameRooms = useCallback((rooms: string[]) => {
    syncManager.updateState({ gameRooms: rooms });
  }, []);

  /**
   * Get current tab state
   */
  const getTabState = useCallback((): TabState => syncManager.getState(), []);

  /**
   * Calculate derived state
   */
  const tabCount = knownTabs.size + 1; // +1 for current tab
  const connectionShared = !tabState.isLeader && Array.from(knownTabs.values()).some((tab) => tab.isLeader);

  // Set up event listeners
  useEffect(() => {
    // Sync manager events
    syncManager.on('stateUpdated', handleStateUpdate);
    syncManager.on('remoteStateUpdate', handleRemoteStateUpdate);
    syncManager.on('leadershipChanged', handleLeadershipChange);

    // Custom event handling for heartbeats and other cross-tab communication
    const handleCustomMessage = (message: any) => {
      switch (message.type) {
        case 'heartbeat':
          handleHeartbeat(message.data);
          break;
        default:
          // Handle other custom message types
          break;
      }
    };

    // Listen to the sync manager's internal channel messages
    // Note: This is a conceptual implementation - actual implementation would depend on the sync manager's API

    return () => {
      syncManager.off('stateUpdated', handleStateUpdate);
      syncManager.off('remoteStateUpdate', handleRemoteStateUpdate);
      syncManager.off('leadershipChanged', handleLeadershipChange);
    };
  }, [handleStateUpdate, handleRemoteStateUpdate, handleLeadershipChange, handleHeartbeat]);

  // Periodic cleanup of stale tabs
  useEffect(() => {
    const interval = setInterval(cleanupStaleTabs, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [cleanupStaleTabs]);

  // Monitor connection status changes and broadcast them
  useEffect(() => {
    const handleConnectionChange = (status: string) => {
      if (tabState.isLeader) {
        syncManager.updateConnectionStatus(status as any);
      }
    };

    // This would typically be connected to your WebSocket manager
    // For now, it's a placeholder
  }, [tabState.isLeader]);

  // Initialize and track current tab
  useEffect(() => {
    // Set initial state
    const initialState = syncManager.getState();
    setTabState(initialState);

    // Add current tab to known tabs
    setKnownTabs((prev) => {
      const updated = new Map(prev);
      updated.set(initialState.tabId, {
        tabId: initialState.tabId,
        isLeader: initialState.isLeader,
        lastHeartbeat: Date.now(),
        gameRooms: initialState.gameRooms,
        connectionStatus: initialState.connectionStatus,
      });
      return updated;
    });
  }, []);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Tab state updated:', {
        tabId: tabState.tabId,
        isLeader: tabState.isLeader,
        tabCount,
        gameRooms: tabState.gameRooms,
        connectionShared,
      });
    }
  }, [tabState, tabCount, connectionShared]);

  return {
    isLeaderTab: tabState.isLeader,
    tabId: tabState.tabId,
    tabCount,
    connectionShared,
    gameRooms: tabState.gameRooms,
    broadcastMessage,
    updateGameRooms,
    getTabState,
  };
};
