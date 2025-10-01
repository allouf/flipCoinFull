import { EventEmitter } from 'eventemitter3';
import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_CONFIG } from '../config/constants';
import { debugLogger } from '../utils/debugLogger';

export interface GameEvent {
  type: 'room_created' | 'player_joined' | 'selection_made' | 'game_resolved' | 'player_disconnected';
  roomId: string;
  playerId: string;
  data: any;
  timestamp: number;
  signature?: string; // Transaction signature for blockchain events
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
}

/**
 * WebSocketManager - Singleton class for managing WebSocket connections
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Heartbeat mechanism for connection health
 * - Event emission for real-time updates
 */
export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager | null = null;

  private socket: Socket | null = null;

  private connectionStatus: ConnectionStatus;

  private messageQueue: GameEvent[] = [];

  private heartbeatInterval: NodeJS.Timeout | null = null;

  private reconnectTimeout: NodeJS.Timeout | null = null;

  private maxReconnectAttempts = 10;

  private reconnectDelays = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff with 30s max

  private constructor() {
    super();
    this.connectionStatus = {
      connected: false,
      reconnecting: false,
      lastConnected: null,
      reconnectAttempts: 0,
    };
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize WebSocket connection
   * @param serverUrl Optional server URL
   * @param walletAddress Optional wallet address for identification
   */
  public async connect(serverUrl?: string, walletAddress?: string): Promise<void> {
    const url = serverUrl || WEBSOCKET_CONFIG.SERVER_URL;

    debugLogger.flowStart('WEBSOCKET CONNECT', {
      serverUrl: url,
      walletAddress: walletAddress ? walletAddress.slice(0, 8) + '...' : 'None',
      timeout: `${WEBSOCKET_CONFIG.CONNECTION_TIMEOUT}ms`,
      reconnection: 'Manual (disabled auto-reconnect)'
    });

    try {
      debugLogger.step(1, 'Initialize Socket.IO Client', {
        url,
        transports: ['websocket'],
        timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT
      });

      this.socket = io(url, {
        transports: ['websocket'],
        timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT,
        reconnection: true, // Enable automatic reconnection
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      debugLogger.step(2, 'Setup Event Handlers');
      this.setupEventHandlers();

      return await new Promise((resolve, reject) => {
        if (!this.socket) {
          debugLogger.error('Socket not initialized');
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          this.handleConnect();

          // Identify with wallet address if provided
          if (walletAddress && this.socket) {
            debugLogger.step(3, 'Identify Wallet to Server', {
              walletAddress: walletAddress.slice(0, 8) + '...'
            });
            this.socket.emit('identify', { walletAddress });
          }

          debugLogger.flowSuccess('WEBSOCKET CONNECT', {
            connected: true,
            serverUrl: url
          });
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          debugLogger.flowError('WEBSOCKET CONNECT', error, {
            serverUrl: url,
            timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT
          });
          reject(error);
        });

        // Timeout fallback
        setTimeout(() => {
          if (!this.connectionStatus.connected) {
            debugLogger.flowError('WEBSOCKET CONNECT', new Error('Connection timeout'), {
              timeout: `${WEBSOCKET_CONFIG.CONNECTION_TIMEOUT}ms`,
              serverUrl: url
            });
            reject(new Error('Connection timeout'));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);
      });
    } catch (error) {
      debugLogger.flowError('WEBSOCKET CONNECT', error, {
        serverUrl: url
      });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    debugLogger.flowStart('WEBSOCKET DISCONNECT', {
      currentlyConnected: this.connectionStatus.connected,
      reconnecting: this.connectionStatus.reconnecting
    });

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      debugLogger.info('Heartbeat stopped');
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      debugLogger.info('Reconnect timeout cleared');
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      debugLogger.info('Socket disconnected and cleared');
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.reconnecting = false;
    this.emit('connectionStatus', this.connectionStatus);

    debugLogger.flowSuccess('WEBSOCKET DISCONNECT', {
      disconnected: true
    });
  }

  /**
   * Send a message through WebSocket
   */
  public sendMessage(event: string, data: any): void {
    if (this.socket && this.connectionStatus.connected) {
      this.socket.emit(event, data);
    } else {
      // TODO: Queue message for sending when connection is restored
      console.warn('WebSocket not connected, message queued:', { event, data });
    }
  }

  /**
   * Subscribe to game room events
   */
  public subscribeToRoom(roomId: string): void {
    if (this.socket && this.connectionStatus.connected) {
      debugLogger.info('🔔 Subscribing to room updates', {
        roomId,
        socketConnected: true
      });
      this.socket.emit('subscribe_room', { roomId });
      debugLogger.success('✅ Subscribed to room', { roomId });
    } else {
      debugLogger.warning('⚠️  Cannot subscribe - socket not connected', {
        roomId,
        socketConnected: !!this.socket,
        connectionStatus: this.connectionStatus.connected
      });
    }
  }

  /**
   * Unsubscribe from game room events
   */
  public unsubscribeFromRoom(roomId: string): void {
    if (this.socket && this.connectionStatus.connected) {
      debugLogger.info('🔕 Unsubscribing from room updates', {
        roomId
      });
      this.socket.emit('unsubscribe_room', { roomId });
      debugLogger.success('✅ Unsubscribed from room', { roomId });
    } else {
      debugLogger.warning('⚠️  Cannot unsubscribe - socket not connected', {
        roomId
      });
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Setup event handlers for WebSocket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Game event handlers
    this.socket.on('game_event', this.handleGameEvent.bind(this));
    this.socket.on('game_update', this.handleGameEvent.bind(this));
    this.socket.on('lobby_update', this.handleLobbyUpdate.bind(this));
    this.socket.on('room_update', this.handleRoomUpdate.bind(this));
    this.socket.on('room_state', this.handleRoomUpdate.bind(this));
    this.socket.on('chat_message', this.handleChatMessage.bind(this));

    // Heartbeat response
    this.socket.on('pong', this.handlePong.bind(this));
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    debugLogger.success('🌐 WebSocket connected successfully', {
      lastConnected: new Date().toISOString(),
      reconnectAttempts: this.connectionStatus.reconnectAttempts
    });

    this.connectionStatus.connected = true;
    this.connectionStatus.reconnecting = false;
    this.connectionStatus.lastConnected = Date.now();
    this.connectionStatus.reconnectAttempts = 0;

    this.emit('connectionStatus', this.connectionStatus);

    debugLogger.info('💓 Starting heartbeat mechanism');
    this.startHeartbeat();

    debugLogger.info('📬 Processing queued messages', {
      queuedCount: this.messageQueue.length
    });
    this.processMessageQueue();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    debugLogger.warning('🔌 WebSocket disconnected', {
      reason,
      wasConnected: this.connectionStatus.connected,
      lastConnected: this.connectionStatus.lastConnected
        ? new Date(this.connectionStatus.lastConnected).toISOString()
        : 'Never',
      willReconnect: reason !== 'io client disconnect'
    });

    this.connectionStatus.connected = false;
    this.emit('connectionStatus', this.connectionStatus);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      debugLogger.info('💔 Heartbeat stopped');
    }

    // Auto-reconnect unless manually disconnected
    if (reason !== 'io client disconnect') {
      debugLogger.info('🔄 Scheduling auto-reconnect');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectError(error: Error): void {
    debugLogger.error('❌ WebSocket connection error', error, {
      reconnectAttempts: this.connectionStatus.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });

    this.emit('connectionError', error);
    this.scheduleReconnect();
  }

  /**
   * Handle successful reconnection
   */
  private handleReconnect(attempt: number): void {
    debugLogger.success('🔄 WebSocket reconnected successfully', {
      attempt,
      totalAttempts: this.connectionStatus.reconnectAttempts
    });

    this.connectionStatus.connected = true;
    this.connectionStatus.reconnecting = false;
    this.connectionStatus.reconnectAttempts = 0;
    this.emit('connectionStatus', this.connectionStatus);
  }

  /**
   * Handle reconnection attempt
   */
  private handleReconnectAttempt(attempt: number): void {
    debugLogger.info('🔄 Attempting to reconnect...', {
      attempt,
      maxAttempts: this.maxReconnectAttempts
    });

    this.connectionStatus.reconnecting = true;
    this.connectionStatus.reconnectAttempts = attempt;
    this.emit('connectionStatus', this.connectionStatus);
  }

  /**
   * Handle reconnection error
   */
  private handleReconnectError(error: Error): void {
    debugLogger.warning('⚠️ Reconnection attempt failed', {
      error: error.message,
      attempt: this.connectionStatus.reconnectAttempts
    });
  }

  /**
   * Handle reconnection failure (all attempts exhausted)
   */
  private handleReconnectFailed(): void {
    debugLogger.error('❌ WebSocket reconnection failed after all attempts', null, {
      totalAttempts: this.connectionStatus.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });

    this.connectionStatus.reconnecting = false;
    this.emit('connectionStatus', this.connectionStatus);
    this.emit('error', new Error('Failed to reconnect after maximum attempts'));
  }

  /**
   * Handle incoming game events
   */
  private handleGameEvent(event: GameEvent): void {
    debugLogger.info('🎮 Game Event Received', {
      type: event.type,
      roomId: event.roomId,
      playerId: event.playerId?.slice(0, 8) + '...',
      timestamp: new Date(event.timestamp).toISOString(),
      hasSignature: !!event.signature
    });

    // TODO: Add event validation and filtering
    this.emit('gameEvent', event);
  }

  /**
   * Handle room updates
   */
  private handleRoomUpdate(data: any): void {
    debugLogger.info('🏠 Room Update Received', {
      roomId: data?.roomId || data?.id,
      status: data?.status,
      playersCount: data?.players?.length || 'unknown'
    });

    this.emit('roomUpdate', data);
  }

  /**
   * Handle lobby updates
   */
  private handleLobbyUpdate(data: any): void {
    debugLogger.info('🎪 Lobby Update Received', {
      totalRooms: data?.rooms?.length || data?.totalRooms || 'unknown',
      activeGames: data?.activeGames || 'unknown'
    });

    this.emit('lobbyUpdate', data);
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(data: any): void {
    this.emit('chatMessage', data);
  }

  /**
   * Handle heartbeat response
   */
  private handlePong(): void {
    // Connection is alive
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionStatus.connected) {
        this.socket.emit('ping');
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.connectionStatus.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.connectionStatus.reconnecting = true;
    this.connectionStatus.reconnectAttempts++;
    this.emit('connectionStatus', this.connectionStatus);

    const delayIndex = Math.min(
      this.connectionStatus.reconnectAttempts - 1,
      this.reconnectDelays.length - 1,
    );
    const delay = this.reconnectDelays[delayIndex];

    console.log(`Scheduling reconnect attempt ${this.connectionStatus.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    // TODO: Implement message replay logic
    // Process any queued messages that were sent during disconnection
    if (this.messageQueue.length > 0) {
      console.log(`Processing ${this.messageQueue.length} queued messages`);
      this.messageQueue.forEach((event) => {
        // Re-emit queued events
        this.emit('gameEvent', event);
      });
      this.messageQueue = [];
    }
  }
}

// Export singleton instance
export const webSocketManager = WebSocketManager.getInstance();
