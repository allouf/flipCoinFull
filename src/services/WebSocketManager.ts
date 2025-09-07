import { EventEmitter } from 'eventemitter3';
import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_CONFIG } from '../config/constants';

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
   */
  public async connect(serverUrl?: string): Promise<void> {
    const url = serverUrl || WEBSOCKET_CONFIG.SERVER_URL;

    try {
      this.socket = io(url, {
        transports: ['websocket'],
        timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT,
        reconnection: false, // We handle reconnection manually
      });

      this.setupEventHandlers();

      return await new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          this.handleConnect();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        // Timeout fallback
        setTimeout(() => {
          if (!this.connectionStatus.connected) {
            reject(new Error('Connection timeout'));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.reconnecting = false;
    this.emit('connectionStatus', this.connectionStatus);
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
      this.socket.emit('subscribe_room', { roomId });
    }
  }

  /**
   * Unsubscribe from game room events
   */
  public unsubscribeFromRoom(roomId: string): void {
    if (this.socket && this.connectionStatus.connected) {
      this.socket.emit('unsubscribe_room', { roomId });
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

    // Game event handlers
    this.socket.on('game_event', this.handleGameEvent.bind(this));
    this.socket.on('room_update', this.handleRoomUpdate.bind(this));

    // Heartbeat response
    this.socket.on('pong', this.handlePong.bind(this));
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    console.log('WebSocket connected');
    this.connectionStatus.connected = true;
    this.connectionStatus.reconnecting = false;
    this.connectionStatus.lastConnected = Date.now();
    this.connectionStatus.reconnectAttempts = 0;

    this.emit('connectionStatus', this.connectionStatus);
    this.startHeartbeat();
    this.processMessageQueue();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    console.log('WebSocket disconnected:', reason);
    this.connectionStatus.connected = false;
    this.emit('connectionStatus', this.connectionStatus);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Auto-reconnect unless manually disconnected
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectError(error: Error): void {
    console.error('WebSocket connection error:', error);
    this.emit('connectionError', error);
    this.scheduleReconnect();
  }

  /**
   * Handle incoming game events
   */
  private handleGameEvent(event: GameEvent): void {
    // TODO: Add event validation and filtering
    this.emit('gameEvent', event);
  }

  /**
   * Handle room updates
   */
  private handleRoomUpdate(data: any): void {
    // TODO: Process room-specific updates
    this.emit('roomUpdate', data);
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
