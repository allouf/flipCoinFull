import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PublicKey } from '@solana/web3.js';

// Types
export interface QueueEntry {
  playerId: string;
  socketId: string;
  betAmount: number;
  tokenMint: string;
  joinedAt: Date;
  lastHeartbeat: Date;
}

export interface MatchResult {
  roomId: string;
  player1: QueueEntry;
  player2: QueueEntry;
  betAmount: number;
  tokenMint: string;
}

export interface QueueStats {
  tokenMint: string;
  betAmount: number;
  playersWaiting: number;
  averageWaitTime: number; // in seconds
}

// Matchmaking Service Class
export class MatchmakingService {
  private io: SocketIOServer;

  private queues: Map<string, QueueEntry[]> = new Map(); // key: tokenMint:betAmount

  private activeMatches: Map<string, MatchResult> = new Map(); // key: roomId

  private heartbeatInterval?: NodeJS.Timeout;

  private matchingInterval?: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventHandlers();
    this.startHeartbeatMonitoring();
    this.startMatchingProcess();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle joining queue
      socket.on('join-queue', async (data: {
        playerId: string;
        betAmount: number;
        tokenMint: string;
      }) => {
        try {
          await this.handleJoinQueue(socket, data);
        } catch (error) {
          socket.emit('queue-error', {
            message: 'Failed to join queue',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle leaving queue
      socket.on('leave-queue', (data: { playerId: string }) => {
        this.handleLeaveQueue(socket, data.playerId);
      });

      // Handle match acceptance
      socket.on('accept-match', (data: { roomId: string, playerId: string }) => {
        this.handleMatchAcceptance(socket, data.roomId, data.playerId);
      });

      // Handle heartbeat
      socket.on('heartbeat', (data: { playerId: string }) => {
        this.handleHeartbeat(data.playerId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.handleDisconnection(socket.id);
      });
    });
  }

  private async handleJoinQueue(
    socket: any,
    data: { playerId: string; betAmount: number; tokenMint: string },
  ): Promise<void> {
    const { playerId, betAmount, tokenMint } = data;
    const queueKey = this.getQueueKey(tokenMint, betAmount);

    // Validate player not already in queue
    if (this.findPlayerInQueues(playerId)) {
      throw new Error('Player already in queue');
    }

    // TODO: Validate bet amount and token mint
    // TODO: Verify player has sufficient funds
    // TODO: Call smart contract join_matchmaking_queue instruction

    const queueEntry: QueueEntry = {
      playerId,
      socketId: socket.id,
      betAmount,
      tokenMint,
      joinedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // Add to queue
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
    }
    this.queues.get(queueKey)!.push(queueEntry);

    // Join socket room for queue updates
    socket.join(`queue:${queueKey}`);

    // Notify player of queue position
    const position = this.getQueuePosition(queueKey, playerId);
    const estimatedWaitTime = this.calculateEstimatedWaitTime(queueKey);

    socket.emit('queue-joined', {
      queueKey,
      position,
      estimatedWaitTime,
      playersWaiting: this.queues.get(queueKey)!.length,
    });

    // Broadcast queue stats update to all clients in this queue
    this.broadcastQueueStats(queueKey);

    console.log(`Player ${playerId} joined queue ${queueKey} at position ${position}`);
  }

  private handleLeaveQueue(socket: any, playerId: string): void {
    const queueKey = this.removePlayerFromQueues(playerId);

    if (queueKey) {
      socket.leave(`queue:${queueKey}`);
      socket.emit('queue-left');
      this.broadcastQueueStats(queueKey);

      // TODO: Call smart contract cancel_queue_position instruction
      console.log(`Player ${playerId} left queue ${queueKey}`);
    }
  }

  private handleMatchAcceptance(socket: any, roomId: string, playerId: string): void {
    const match = this.activeMatches.get(roomId);
    if (!match) {
      socket.emit('match-error', { message: 'Match not found' });
      return;
    }

    // TODO: Track acceptance status and proceed with room creation
    // TODO: Call smart contract create_matched_room instruction
    // For now, just notify both players

    this.io.to(match.player1.socketId).emit('match-confirmed', {
      roomId,
      opponent: match.player2.playerId,
      betAmount: match.betAmount,
      tokenMint: match.tokenMint,
    });

    this.io.to(match.player2.socketId).emit('match-confirmed', {
      roomId,
      opponent: match.player1.playerId,
      betAmount: match.betAmount,
      tokenMint: match.tokenMint,
    });

    console.log(`Match ${roomId} confirmed for players ${match.player1.playerId} and ${match.player2.playerId}`);
  }

  private handleHeartbeat(playerId: string): void {
    // Update heartbeat timestamp for player
    for (const [queueKey, queue] of this.queues) {
      const entry = queue.find((entry) => entry.playerId === playerId);
      if (entry) {
        entry.lastHeartbeat = new Date();
        return;
      }
    }
  }

  private handleDisconnection(socketId: string): void {
    // Find and remove player from all queues
    for (const [queueKey, queue] of this.queues) {
      const index = queue.findIndex((entry) => entry.socketId === socketId);
      if (index !== -1) {
        const removedEntry = queue.splice(index, 1)[0];
        this.broadcastQueueStats(queueKey);

        // TODO: Call smart contract cancel_queue_position instruction
        console.log(`Removed disconnected player ${removedEntry.playerId} from queue ${queueKey}`);
        return;
      }
    }
  }

  // FIFO Matching Algorithm
  private processMatching(): void {
    for (const [queueKey, queue] of this.queues) {
      if (queue.length >= 2) {
        // Sort by join time to ensure FIFO
        queue.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

        // Match first two players
        const player1 = queue.shift()!;
        const player2 = queue.shift()!;

        const roomId = this.generateRoomId();
        const match: MatchResult = {
          roomId,
          player1,
          player2,
          betAmount: player1.betAmount,
          tokenMint: player1.tokenMint,
        };

        this.activeMatches.set(roomId, match);

        // Notify both players of the match
        this.io.to(player1.socketId).emit('match-found', {
          roomId,
          opponent: player2.playerId,
          betAmount: player1.betAmount,
          tokenMint: player1.tokenMint,
          autoAcceptTimeout: 10000, // 10 seconds
        });

        this.io.to(player2.socketId).emit('match-found', {
          roomId,
          opponent: player1.playerId,
          betAmount: player1.betAmount,
          tokenMint: player1.tokenMint,
          autoAcceptTimeout: 10000, // 10 seconds
        });

        // Remove players from queue room
        this.io.sockets.sockets.get(player1.socketId)?.leave(`queue:${queueKey}`);
        this.io.sockets.sockets.get(player2.socketId)?.leave(`queue:${queueKey}`);

        this.broadcastQueueStats(queueKey);
        console.log(`Match created: ${roomId} for players ${player1.playerId} vs ${player2.playerId}`);

        // Set auto-accept timeout
        setTimeout(() => {
          if (this.activeMatches.has(roomId)) {
            this.handleMatchAcceptance(null, roomId, player1.playerId);
            this.activeMatches.delete(roomId);
          }
        }, 10000);
      }
    }
  }

  // Heartbeat System
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const heartbeatTimeout = 30000; // 30 seconds

      for (const [queueKey, queue] of this.queues) {
        const activeEntries = queue.filter((entry) => {
          const timeSinceHeartbeat = now.getTime() - entry.lastHeartbeat.getTime();
          if (timeSinceHeartbeat > heartbeatTimeout) {
            console.log(`Removing inactive player ${entry.playerId} from queue ${queueKey}`);
            // TODO: Call smart contract cleanup_queue_timeout instruction
            return false;
          }
          return true;
        });

        if (activeEntries.length !== queue.length) {
          this.queues.set(queueKey, activeEntries);
          this.broadcastQueueStats(queueKey);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  private startMatchingProcess(): void {
    this.matchingInterval = setInterval(() => {
      this.processMatching();
    }, 2000); // Check for matches every 2 seconds
  }

  // Utility Methods
  private getQueueKey(tokenMint: string, betAmount: number): string {
    return `${tokenMint}:${betAmount}`;
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findPlayerInQueues(playerId: string): boolean {
    for (const queue of this.queues.values()) {
      if (queue.some((entry) => entry.playerId === playerId)) {
        return true;
      }
    }
    return false;
  }

  private removePlayerFromQueues(playerId: string): string | null {
    for (const [queueKey, queue] of this.queues) {
      const index = queue.findIndex((entry) => entry.playerId === playerId);
      if (index !== -1) {
        queue.splice(index, 1);
        return queueKey;
      }
    }
    return null;
  }

  private getQueuePosition(queueKey: string, playerId: string): number {
    const queue = this.queues.get(queueKey) || [];
    const index = queue.findIndex((entry) => entry.playerId === playerId);
    return index + 1; // 1-based position
  }

  private calculateEstimatedWaitTime(queueKey: string): number {
    // TODO: Implement based on historical data
    // For now, return a simple estimate based on queue position
    const queue = this.queues.get(queueKey) || [];
    return Math.max(queue.length * 15, 30); // Rough estimate: 15 seconds per position ahead
  }

  private broadcastQueueStats(queueKey: string): void {
    const queue = this.queues.get(queueKey) || [];
    const stats = {
      queueKey,
      playersWaiting: queue.length,
      estimatedWaitTime: this.calculateEstimatedWaitTime(queueKey),
    };

    this.io.to(`queue:${queueKey}`).emit('queue-stats-update', stats);
  }

  // Public API for getting queue statistics
  public getQueueStats(): QueueStats[] {
    const stats: QueueStats[] = [];

    for (const [queueKey, queue] of this.queues) {
      const [tokenMint, betAmount] = queueKey.split(':');
      stats.push({
        tokenMint,
        betAmount: parseFloat(betAmount),
        playersWaiting: queue.length,
        averageWaitTime: this.calculateEstimatedWaitTime(queueKey),
      });
    }

    return stats.sort((a, b) => b.playersWaiting - a.playersWaiting); // Sort by most active
  }

  // Cleanup on shutdown
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
    }
    this.io.close();
  }
}

export default MatchmakingService;
