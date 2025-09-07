import { useState, useEffect, useCallback } from 'react';
import { webSocketManager, ConnectionStatus as WSConnectionStatus } from '../services/WebSocketManager';
import { syncManager } from '../services/SyncManager';

export interface ConnectionStatusHook {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastConnected: number | null;
  connectionError: Error | null;
  reconnect: () => Promise<void>;
  disconnect: () => void;
  getConnectionHealth: () => ConnectionHealth;
}

export interface ConnectionHealth {
  status: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number | null;
  uptime: number;
  reconnectCount: number;
  lastError: Error | null;
}

/**
 * useConnectionStatus - Hook for monitoring WebSocket connection status
 *
 * Features:
 * - Real-time connection status monitoring
 * - Connection health metrics
 * - Manual reconnection control
 * - Cross-tab connection sharing awareness
 * - Error tracking and reporting
 */
export const useConnectionStatus = (): ConnectionStatusHook => {
  const [connectionStatus, setConnectionStatus] = useState<WSConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState({
    latency: null as number | null,
    uptime: 0,
    startTime: Date.now(),
  });

  /**
   * Update connection status from WebSocket manager
   */
  const handleConnectionStatusChange = useCallback((status: WSConnectionStatus) => {
    setConnectionStatus(status);

    // Clear error on successful connection
    if (status.connected) {
      setConnectionError(null);
      setConnectionMetrics((prev) => ({
        ...prev,
        startTime: prev.startTime || Date.now(),
      }));
    }
  }, []);

  /**
   * Handle connection errors
   */
  const handleConnectionError = useCallback((error: Error) => {
    setConnectionError(error);
    console.error('Connection error:', error);
  }, []);

  /**
   * Measure connection latency
   */
  const measureLatency = useCallback(async (): Promise<number | null> => {
    if (!connectionStatus.connected) return null;

    try {
      const startTime = Date.now();

      // Send a ping and wait for pong
      webSocketManager.sendMessage('ping', { timestamp: startTime });

      // TODO: Implement proper ping/pong latency measurement
      // For now, return a placeholder
      return null;
    } catch (error) {
      console.error('Failed to measure latency:', error);
      return null;
    }
  }, [connectionStatus.connected]);

  /**
   * Calculate uptime
   */
  const calculateUptime = useCallback((): number => {
    if (!connectionStatus.connected || !connectionStatus.lastConnected) {
      return 0;
    }
    return Date.now() - connectionStatus.lastConnected;
  }, [connectionStatus]);

  /**
   * Get overall connection health
   */
  const getConnectionHealth = useCallback((): ConnectionHealth => {
    if (!connectionStatus.connected) {
      return {
        status: 'disconnected',
        latency: null,
        uptime: 0,
        reconnectCount: connectionStatus.reconnectAttempts,
        lastError: connectionError,
      };
    }

    const uptime = calculateUptime();
    const { latency } = connectionMetrics;

    let status: ConnectionHealth['status'] = 'excellent';

    // Determine status based on latency and reconnect attempts
    if (connectionStatus.reconnectAttempts > 5) {
      status = 'poor';
    } else if (connectionStatus.reconnectAttempts > 2 || (latency && latency > 1000)) {
      status = 'good';
    } else if (latency && latency > 500) {
      status = 'good';
    }

    return {
      status,
      latency,
      uptime,
      reconnectCount: connectionStatus.reconnectAttempts,
      lastError: connectionError,
    };
  }, [connectionStatus, connectionMetrics, connectionError, calculateUptime]);

  /**
   * Manual reconnection
   */
  const reconnect = useCallback(async (): Promise<void> => {
    // Only leader tabs should manage the actual connection
    if (!syncManager.isLeaderTab()) {
      console.log('Non-leader tab requested reconnection, ignoring');
      return;
    }

    try {
      await webSocketManager.connect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
      throw error;
    }
  }, []);

  /**
   * Manual disconnection
   */
  const disconnect = useCallback((): void => {
    if (!syncManager.isLeaderTab()) {
      console.log('Non-leader tab requested disconnection, ignoring');
      return;
    }

    webSocketManager.disconnect();
  }, []);

  /**
   * Update connection metrics periodically
   */
  const updateMetrics = useCallback(async () => {
    if (!connectionStatus.connected) return;

    const latency = await measureLatency();
    const uptime = calculateUptime();

    setConnectionMetrics((prev) => ({
      ...prev,
      latency,
      uptime,
    }));
  }, [connectionStatus.connected, measureLatency, calculateUptime]);

  // Set up event listeners
  useEffect(() => {
    // WebSocket events
    webSocketManager.on('connectionStatus', handleConnectionStatusChange);
    webSocketManager.on('connectionError', handleConnectionError);
    webSocketManager.on('maxReconnectAttemptsReached', () => {
      setConnectionError(new Error('Maximum reconnection attempts reached'));
    });

    // Initial status
    setConnectionStatus(webSocketManager.getConnectionStatus());

    return () => {
      webSocketManager.off('connectionStatus', handleConnectionStatusChange);
      webSocketManager.off('connectionError', handleConnectionError);
    };
  }, [handleConnectionStatusChange, handleConnectionError]);

  // Periodic metrics update
  useEffect(() => {
    const interval = setInterval(updateMetrics, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [updateMetrics]);

  // Handle cross-tab synchronization
  useEffect(() => {
    const handleLeadershipChange = ({ isLeader }: { isLeader: boolean }) => {
      if (isLeader) {
        // Became leader, get fresh connection status
        setConnectionStatus(webSocketManager.getConnectionStatus());
      }
    };

    syncManager.on('leadershipChanged', handleLeadershipChange);

    return () => {
      syncManager.off('leadershipChanged', handleLeadershipChange);
    };
  }, []);

  // Sync connection status across tabs
  useEffect(() => {
    const handleRemoteConnectionStatus = ({ status }: { status: string }) => {
      // Update connection status from other tabs if we're not the leader
      if (!syncManager.isLeaderTab()) {
        setConnectionStatus((prev) => ({
          ...prev,
          connected: status === 'connected',
          reconnecting: status === 'reconnecting',
        }));
      }
    };

    syncManager.on('remoteConnectionStatus', handleRemoteConnectionStatus);

    return () => {
      syncManager.off('remoteConnectionStatus', handleRemoteConnectionStatus);
    };
  }, []);

  // Broadcast our connection status to other tabs
  useEffect(() => {
    if (syncManager.isLeaderTab()) {
      syncManager.updateConnectionStatus(
        connectionStatus.connected ? 'connected'
          : connectionStatus.reconnecting ? 'reconnecting' : 'disconnected',
      );
    }
  }, [connectionStatus.connected, connectionStatus.reconnecting]);

  return {
    connected: connectionStatus.connected,
    reconnecting: connectionStatus.reconnecting,
    reconnectAttempts: connectionStatus.reconnectAttempts,
    lastConnected: connectionStatus.lastConnected,
    connectionError,
    reconnect,
    disconnect,
    getConnectionHealth,
  };
};
