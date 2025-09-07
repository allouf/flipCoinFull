import { EventEmitter } from 'eventemitter3';
import { VRFStatusUpdate } from './VRFRetryHandler';
import { webSocketManager } from './WebSocketManager';
import { syncManager } from './SyncManager';

export interface VRFGameStatus {
  gameId: string;
  roomId: number;
  status: 'pending' | 'processing' | 'retrying' | 'completed' | 'failed';
  vrfAccount?: string;
  attempt: number;
  maxAttempts: number;
  timeElapsed: number;
  estimatedWaitTime?: number;
  queuePosition?: number;
  error?: string;
  startTime: number;
  lastUpdate: number;
}

export interface VRFStatusBroadcast {
  type: 'vrf_status_update';
  gameId: string;
  status: VRFGameStatus;
  timestamp: number;
}

/**
 * VRFStatusManager - Manages real-time VRF processing status updates
 * 
 * Features:
 * - Real-time status broadcasting via WebSocket
 * - Cross-tab synchronization of VRF status
 * - Game-specific status tracking
 * - UI status aggregation and filtering
 */
export class VRFStatusManager extends EventEmitter {
  private activeGames: Map<string, VRFGameStatus>;
  private statusHistory: Map<string, VRFStatusUpdate[]>;
  private broadcastEnabled: boolean;

  constructor() {
    super();
    this.activeGames = new Map();
    this.statusHistory = new Map();
    this.broadcastEnabled = true;

    // Set up cross-tab synchronization
    this.setupCrossTabSync();
  }

  /**
   * Start tracking VRF processing for a game
   */
  startTracking(gameId: string, roomId: number, maxAttempts = 3): void {
    const gameStatus: VRFGameStatus = {
      gameId,
      roomId,
      status: 'pending',
      attempt: 0,
      maxAttempts,
      timeElapsed: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    this.activeGames.set(gameId, gameStatus);
    this.statusHistory.set(gameId, []);
    
    this.broadcastStatusUpdate(gameId, gameStatus);
    this.emit('gameStarted', gameStatus);
  }

  /**
   * Update VRF processing status for a game
   */
  updateStatus(gameId: string, update: Partial<VRFStatusUpdate>): void {
    const gameStatus = this.activeGames.get(gameId);
    if (!gameStatus) {
      console.warn(`VRF status update for unknown game: ${gameId}`);
      return;
    }

    // Map VRFStatusUpdate to VRFGameStatus
    const statusMapping: Record<string, VRFGameStatus['status']> = {
      'attempting': 'processing',
      'retrying': 'retrying',
      'completed': 'completed',
      'failed': 'failed',
    };

    // Update game status
    const updatedStatus: VRFGameStatus = {
      ...gameStatus,
      status: statusMapping[update.status!] || gameStatus.status,
      vrfAccount: update.account || gameStatus.vrfAccount,
      attempt: update.attempt || gameStatus.attempt,
      timeElapsed: update.timeElapsed || (Date.now() - gameStatus.startTime),
      estimatedWaitTime: update.estimatedWaitTime,
      queuePosition: update.queuePosition,
      error: update.error,
      lastUpdate: Date.now(),
    };

    this.activeGames.set(gameId, updatedStatus);

    // Add to history
    const history = this.statusHistory.get(gameId) || [];
    history.push({
      ...update,
      status: update.status!,
      attempt: update.attempt!,
      timeElapsed: updatedStatus.timeElapsed,
    });
    
    // Keep only last 20 updates
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    this.statusHistory.set(gameId, history);

    this.broadcastStatusUpdate(gameId, updatedStatus);
    this.emit('statusUpdate', updatedStatus);

    // Clean up completed/failed games after delay
    if (updatedStatus.status === 'completed' || updatedStatus.status === 'failed') {
      setTimeout(() => this.cleanupGame(gameId), 30000); // Clean up after 30 seconds
    }
  }

  /**
   * Complete VRF processing for a game
   */
  completeGame(gameId: string, success: boolean, result?: any, error?: string): void {
    const gameStatus = this.activeGames.get(gameId);
    if (!gameStatus) return;

    const finalStatus: VRFGameStatus = {
      ...gameStatus,
      status: success ? 'completed' : 'failed',
      timeElapsed: Date.now() - gameStatus.startTime,
      error: error,
      lastUpdate: Date.now(),
    };

    this.activeGames.set(gameId, finalStatus);
    this.broadcastStatusUpdate(gameId, finalStatus);
    this.emit('gameCompleted', finalStatus, result);

    // Clean up after delay
    setTimeout(() => this.cleanupGame(gameId), 30000);
  }

  /**
   * Get current status for a game
   */
  getGameStatus(gameId: string): VRFGameStatus | null {
    return this.activeGames.get(gameId) || null;
  }

  /**
   * Get all active VRF processes
   */
  getActiveGames(): VRFGameStatus[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * Get status history for a game
   */
  getGameHistory(gameId: string): VRFStatusUpdate[] {
    return this.statusHistory.get(gameId) || [];
  }

  /**
   * Get aggregated VRF processing statistics
   */
  getProcessingStats(): {
    activeGames: number;
    averageProcessingTime: number;
    successRate: number;
    currentLoad: 'low' | 'medium' | 'high';
  } {
    const activeGames = Array.from(this.activeGames.values());
    const completedGames = activeGames.filter(g => 
      g.status === 'completed' || g.status === 'failed'
    );

    const avgProcessingTime = completedGames.length > 0
      ? completedGames.reduce((sum, game) => sum + game.timeElapsed, 0) / completedGames.length
      : 0;

    const successfulGames = completedGames.filter(g => g.status === 'completed').length;
    const successRate = completedGames.length > 0 
      ? successfulGames / completedGames.length 
      : 1;

    // Determine current load based on active games and their processing times
    let currentLoad: 'low' | 'medium' | 'high' = 'low';
    const processingGames = activeGames.filter(g => 
      g.status === 'processing' || g.status === 'retrying'
    ).length;

    if (processingGames > 5 || avgProcessingTime > 15000) {
      currentLoad = 'high';
    } else if (processingGames > 2 || avgProcessingTime > 8000) {
      currentLoad = 'medium';
    }

    return {
      activeGames: activeGames.length,
      averageProcessingTime: Math.round(avgProcessingTime),
      successRate: Math.round(successRate * 100) / 100,
      currentLoad,
    };
  }

  /**
   * Broadcast status update via WebSocket and cross-tab sync
   */
  private broadcastStatusUpdate(gameId: string, status: VRFGameStatus): void {
    if (!this.broadcastEnabled) return;

    const broadcast: VRFStatusBroadcast = {
      type: 'vrf_status_update',
      gameId,
      status,
      timestamp: Date.now(),
    };

    // Send via WebSocket if connected
    if (webSocketManager) {
      const status = webSocketManager.getConnectionStatus();
      if (status.connected) {
        webSocketManager.sendMessage('vrf_status', broadcast);
      }
    }

    // Sync across tabs
    syncManager.broadcast('state_update' as any, broadcast);
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    // Listen for VRF status updates from other tabs
    syncManager.on('vrfStatusUpdate', (data: VRFStatusBroadcast) => {
      if (!syncManager.isLeaderTab()) {
        // Non-leader tabs receive updates from leader
        this.activeGames.set(data.gameId, data.status);
        this.emit('statusUpdate', data.status);
      }
    });

    // Handle leadership changes
    syncManager.on('leadershipChanged', ({ isLeader }: { isLeader: boolean }) => {
      this.broadcastEnabled = isLeader;
      
      if (isLeader) {
        // Became leader, broadcast current state
        this.activeGames.forEach((status, gameId) => {
          this.broadcastStatusUpdate(gameId, status);
        });
      }
    });
  }

  /**
   * Clean up completed game data
   */
  private cleanupGame(gameId: string): void {
    this.activeGames.delete(gameId);
    
    // Keep history for a while longer for debugging
    setTimeout(() => {
      this.statusHistory.delete(gameId);
    }, 300000); // Keep history for 5 minutes
    
    this.emit('gameCleanedUp', gameId);
  }

  /**
   * Enable/disable status broadcasting
   */
  setBroadcastEnabled(enabled: boolean): void {
    this.broadcastEnabled = enabled;
  }

  /**
   * Clear all tracking data (for testing or reset)
   */
  clearAllData(): void {
    this.activeGames.clear();
    this.statusHistory.clear();
    this.emit('dataCleared');
  }

  /**
   * Get games by status
   */
  getGamesByStatus(status: VRFGameStatus['status']): VRFGameStatus[] {
    return Array.from(this.activeGames.values()).filter(game => game.status === status);
  }

  /**
   * Get games that are taking longer than expected
   */
  getSlowGames(thresholdMs = 15000): VRFGameStatus[] {
    const now = Date.now();
    return Array.from(this.activeGames.values()).filter(game => 
      (game.status === 'processing' || game.status === 'retrying') &&
      (now - game.startTime) > thresholdMs
    );
  }
}

// Singleton instance for application-wide use
export const vrfStatusManager = new VRFStatusManager();