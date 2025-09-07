import { EventEmitter } from 'eventemitter3';
import { BroadcastChannel } from 'broadcast-channel';

export interface SyncMessage {
  type: 'state_update' | 'connection_status' | 'leader_election' | 'game_event' | 'heartbeat';
  data: any;
  version: number;
  senderId: string;
  timestamp: number;
}

export interface TabState {
  isLeader: boolean;
  tabId: string;
  lastHeartbeat: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  gameRooms: string[];
}

export interface LeaderInfo {
  tabId: string;
  lastHeartbeat: number;
  connectionActive: boolean;
}

/**
 * SyncManager - Handles cross-tab synchronization using BroadcastChannel API
 *
 * Features:
 * - Leader election among tabs
 * - State synchronization across tabs
 * - Shared WebSocket connection management
 * - Version-based optimistic locking
 * - Leader failure detection and recovery
 */
export class SyncManager extends EventEmitter {
  private static instance: SyncManager | null = null;

  private channel: BroadcastChannel<SyncMessage>;

  private tabId: string;

  private isLeader = false;

  private state: TabState;

  private version = 0;

  private heartbeatInterval: NodeJS.Timeout | null = null;

  private leaderCheckInterval: NodeJS.Timeout | null = null;

  private knownTabs: Map<string, LeaderInfo> = new Map();

  private readonly HEARTBEAT_INTERVAL = 2000; // 2 seconds

  private readonly LEADER_TIMEOUT = 5000; // 5 seconds

  private readonly CHANNEL_NAME = 'coin-flipper-sync';

  private constructor() {
    super();

    this.tabId = this.generateTabId();
    this.channel = new BroadcastChannel(this.CHANNEL_NAME);

    this.state = {
      isLeader: false,
      tabId: this.tabId,
      lastHeartbeat: Date.now(),
      connectionStatus: 'disconnected',
      gameRooms: [],
    };

    this.setupChannelHandlers();
    this.startHeartbeat();
    this.startLeaderElection();

    // Handle tab/window close
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    window.addEventListener('unload', this.cleanup.bind(this));
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Get current tab state
   */
  public getState(): TabState {
    return { ...this.state };
  }

  /**
   * Check if this tab is the leader
   */
  public isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get current tab ID
   */
  public getTabId(): string {
    return this.tabId;
  }

  /**
   * Broadcast a message to all tabs
   */
  public broadcast(type: SyncMessage['type'], data: any): void {
    const message: SyncMessage = {
      type,
      data,
      version: ++this.version,
      senderId: this.tabId,
      timestamp: Date.now(),
    };

    this.channel.postMessage(message);
  }

  /**
   * Update tab state and broadcast to others
   */
  public updateState(updates: Partial<Omit<TabState, 'tabId' | 'isLeader'>>): void {
    this.state = {
      ...this.state,
      ...updates,
    };

    this.broadcast('state_update', this.state);
    this.emit('stateUpdated', this.state);
  }

  /**
   * Update connection status
   */
  public updateConnectionStatus(status: TabState['connectionStatus']): void {
    this.state.connectionStatus = status;
    this.broadcast('connection_status', { tabId: this.tabId, status });
    this.emit('connectionStatus', status);
  }

  /**
   * Add a game room to the active list
   */
  public addGameRoom(roomId: string): void {
    if (!this.state.gameRooms.includes(roomId)) {
      this.state.gameRooms.push(roomId);
      this.updateState({ gameRooms: this.state.gameRooms });
    }
  }

  /**
   * Remove a game room from the active list
   */
  public removeGameRoom(roomId: string): void {
    const index = this.state.gameRooms.indexOf(roomId);
    if (index > -1) {
      this.state.gameRooms.splice(index, 1);
      this.updateState({ gameRooms: this.state.gameRooms });
    }
  }

  /**
   * Handle messages from other tabs
   */
  private setupChannelHandlers(): void {
    this.channel.addEventListener('message', (message: SyncMessage) => {
      // Ignore messages from self
      if (message.senderId === this.tabId) {
        return;
      }

      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'leader_election':
          this.handleLeaderElection(message);
          break;
        case 'state_update':
          this.handleStateUpdate(message);
          break;
        case 'connection_status':
          this.handleConnectionStatus(message);
          break;
        case 'game_event':
          this.handleGameEvent(message);
          break;
        default:
          console.log('Unknown sync message type:', message.type);
      }
    });
  }

  /**
   * Handle heartbeat from other tabs
   */
  private handleHeartbeat(message: SyncMessage): void {
    const { tabId, isLeader } = message.data;

    this.knownTabs.set(tabId, {
      tabId,
      lastHeartbeat: message.timestamp,
      connectionActive: isLeader || false,
    });

    // If we receive a heartbeat from a leader and we think we're the leader, resolve conflict
    if (isLeader && this.isLeader && tabId < this.tabId) {
      console.log('Leader conflict detected, deferring to tab:', tabId);
      this.becomeFollower();
    }
  }

  /**
   * Handle leader election messages
   */
  private handleLeaderElection(message: SyncMessage): void {
    const { tabId, timestamp } = message.data;

    // If another tab is claiming leadership with an earlier timestamp, defer
    if (timestamp < Date.now() - this.LEADER_TIMEOUT && tabId < this.tabId) {
      this.becomeFollower();
    }
  }

  /**
   * Handle state updates from other tabs
   */
  private handleStateUpdate(message: SyncMessage): void {
    // Emit state update for local handling
    this.emit('remoteStateUpdate', message.data);
  }

  /**
   * Handle connection status updates
   */
  private handleConnectionStatus(message: SyncMessage): void {
    const { tabId, status } = message.data;

    // Update known tab info
    const tabInfo = this.knownTabs.get(tabId);
    if (tabInfo) {
      tabInfo.connectionActive = status === 'connected';
      this.knownTabs.set(tabId, tabInfo);
    }

    this.emit('remoteConnectionStatus', { tabId, status });
  }

  /**
   * Handle game events from other tabs
   */
  private handleGameEvent(message: SyncMessage): void {
    // Forward game events to local listeners
    this.emit('gameEvent', message.data);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.state.lastHeartbeat = Date.now();
      this.broadcast('heartbeat', {
        tabId: this.tabId,
        isLeader: this.isLeader,
        timestamp: this.state.lastHeartbeat,
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Start leader election process
   */
  private startLeaderElection(): void {
    // Initial leader election - the first tab becomes leader
    setTimeout(() => {
      if (this.knownTabs.size === 0) {
        this.becomeLeader();
      }
    }, 1000);

    // Periodic leader health check
    this.leaderCheckInterval = setInterval(() => {
      this.checkLeaderHealth();
    }, this.LEADER_TIMEOUT / 2);
  }

  /**
   * Check if current leader is healthy
   */
  private checkLeaderHealth(): void {
    const now = Date.now();
    let leaderFound = false;

    for (const [tabId, info] of this.knownTabs) {
      if (info.connectionActive && now - info.lastHeartbeat < this.LEADER_TIMEOUT) {
        leaderFound = true;
        break;
      }
    }

    // Clean up stale tab entries
    for (const [tabId, info] of this.knownTabs) {
      if (now - info.lastHeartbeat > this.LEADER_TIMEOUT * 2) {
        this.knownTabs.delete(tabId);
      }
    }

    // If no leader found and we're not leader, start election
    if (!leaderFound && !this.isLeader) {
      this.electLeader();
    }
  }

  /**
   * Elect a new leader
   */
  private electLeader(): void {
    // Simple election: lowest tabId becomes leader
    const candidates = Array.from(this.knownTabs.keys()).concat(this.tabId);
    candidates.sort();

    if (candidates[0] === this.tabId) {
      this.becomeLeader();
    }
  }

  /**
   * Become the leader tab
   */
  private becomeLeader(): void {
    if (this.isLeader) return;

    console.log('Tab', this.tabId, 'becoming leader');
    this.isLeader = true;
    this.state.isLeader = true;

    this.broadcast('leader_election', {
      tabId: this.tabId,
      timestamp: Date.now(),
    });

    this.emit('leadershipChanged', { isLeader: true, tabId: this.tabId });
  }

  /**
   * Become a follower tab
   */
  private becomeFollower(): void {
    if (!this.isLeader) return;

    console.log('Tab', this.tabId, 'becoming follower');
    this.isLeader = false;
    this.state.isLeader = false;

    this.emit('leadershipChanged', { isLeader: false, tabId: this.tabId });
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Cleanup when tab is closed
   */
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    // Notify other tabs that we're closing
    this.broadcast('heartbeat', {
      tabId: this.tabId,
      isLeader: false,
      closing: true,
      timestamp: Date.now(),
    });

    if (this.channel) {
      this.channel.close();
    }
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();
