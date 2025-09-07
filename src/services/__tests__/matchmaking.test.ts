import { Server as HTTPServer } from 'http';
import { MatchmakingService, QueueEntry, MatchResult } from '../matchmaking';

jest.useFakeTimers();

// Mock socket.io
const mockSocketIO = {
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  close: jest.fn(),
  sockets: {
    sockets: new Map(),
  },
};

const mockSocket = {
  id: 'test-socket-id',
  on: jest.fn(),
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockSocketIO),
}));

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let mockHttpServer: HTTPServer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockHttpServer = {} as HTTPServer;
    service = new MatchmakingService(mockHttpServer);

    // Reset mock socket state
    mockSocketIO.sockets.sockets.clear();
    mockSocketIO.sockets.sockets.set('test-socket-id', mockSocket as any);
  });

  afterEach(() => {
    service.shutdown();
    jest.runOnlyPendingTimers();
  });

  describe('Initialization', () => {
    it('should initialize Socket.IO server with correct configuration', () => {
      expect(SocketIOServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: 'http://localhost:3000',
          methods: ['GET', 'POST'],
        },
      });
    });

    it('should use custom frontend URL from environment', () => {
      const originalEnv = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://custom-frontend.com';

      const customService = new MatchmakingService(mockHttpServer);

      expect(SocketIOServer).toHaveBeenLastCalledWith(mockHttpServer, {
        cors: {
          origin: 'https://custom-frontend.com',
          methods: ['GET', 'POST'],
        },
      });

      customService.shutdown();

      // Restore environment
      if (originalEnv) {
        process.env.FRONTEND_URL = originalEnv;
      } else {
        delete process.env.FRONTEND_URL;
      }
    });

    it('should set up event handlers on initialization', () => {
      expect(mockSocketIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should start heartbeat monitoring and matching process', () => {
      // Timers should be started
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Connection Handling', () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      connectionHandler = (mockSocketIO.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connection',
      )?.[1];
    });

    it('should handle new client connections', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      connectionHandler(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith('Client connected:', 'test-socket-id');
      expect(mockSocket.on).toHaveBeenCalledWith('join-queue', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave-queue', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('accept-match', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('heartbeat', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));

      consoleSpy.mockRestore();
    });

    it('should handle client disconnections', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      connectionHandler(mockSocket);

      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'disconnect',
      )?.[1];

      disconnectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected:', 'test-socket-id');

      consoleSpy.mockRestore();
    });
  });

  describe('Queue Management', () => {
    let joinQueueHandler: (data: any) => void;

    beforeEach(() => {
      const connectionHandler = (mockSocketIO.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connection',
      )?.[1];
      connectionHandler(mockSocket);

      joinQueueHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'join-queue',
      )?.[1];
    });

    it('should handle join queue requests', async () => {
      const queueData = {
        playerId: 'player-123',
        betAmount: 1.5,
        tokenMint: 'SOL-mint',
      };

      await joinQueueHandler(queueData);

      expect(mockSocket.join).toHaveBeenCalledWith('queue:SOL-mint:1.5');
      expect(mockSocket.emit).toHaveBeenCalledWith('queue-joined', {
        queueKey: 'SOL-mint:1.5',
        position: 1,
        estimatedWaitTime: 30, // Based on default calculation
        playersWaiting: 1,
      });
    });

    it('should prevent duplicate queue entries', async () => {
      const queueData = {
        playerId: 'player-123',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      // Join queue first time
      await joinQueueHandler(queueData);

      // Try to join again
      await joinQueueHandler(queueData);

      expect(mockSocket.emit).toHaveBeenLastCalledWith('queue-error', {
        message: 'Failed to join queue',
        error: 'Player already in queue',
      });
    });

    it('should handle leave queue requests', () => {
      const leaveQueueHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'leave-queue',
      )?.[1];

      // First join a queue
      joinQueueHandler({
        playerId: 'player-123',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      });

      // Then leave it
      leaveQueueHandler({ playerId: 'player-123' });

      expect(mockSocket.leave).toHaveBeenCalledWith('queue:SOL-mint:1');
      expect(mockSocket.emit).toHaveBeenLastCalledWith('queue-left');
    });

    it('should calculate queue positions correctly', async () => {
      // Add multiple players to the same queue
      const baseData = {
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      await joinQueueHandler({ ...baseData, playerId: 'player-1' });

      // Simulate second socket for second player
      const mockSocket2 = { ...mockSocket, id: 'socket-2' };
      const joinHandler2 = joinQueueHandler.bind(null);

      // Manually add to queues to simulate second player
      const service2 = (service as any);
      const queueKey = 'SOL-mint:1';
      if (!service2.queues.has(queueKey)) {
        service2.queues.set(queueKey, []);
      }
      service2.queues.get(queueKey).push({
        playerId: 'player-2',
        socketId: 'socket-2',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        joinedAt: new Date(),
        lastHeartbeat: new Date(),
      });

      // The second player should be position 2
      expect(service2.getQueuePosition(queueKey, 'player-2')).toBe(2);
    });

    it('should estimate wait times based on queue length', async () => {
      const queueData = {
        playerId: 'player-123',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      await joinQueueHandler(queueData);

      // With 1 player, estimated wait time should be minimum 30 seconds
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'queue-joined',
        expect.objectContaining({
          estimatedWaitTime: 30,
        }),
      );
    });

    it('should broadcast queue stats updates', async () => {
      const queueData = {
        playerId: 'player-123',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      await joinQueueHandler(queueData);

      expect(mockSocketIO.to).toHaveBeenCalledWith('queue:SOL-mint:1');
      expect(mockSocketIO.emit).toHaveBeenCalledWith('queue-stats-update', {
        queueKey: 'SOL-mint:1',
        playersWaiting: 1,
        estimatedWaitTime: 30,
      });
    });
  });

  describe('FIFO Matching Algorithm', () => {
    let joinQueueHandler: (data: any) => void;

    beforeEach(() => {
      const connectionHandler = (mockSocketIO.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connection',
      )?.[1];
      connectionHandler(mockSocket);

      joinQueueHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'join-queue',
      )?.[1];
    });

    it('should match two players with same bet amount', async () => {
      // Add first player
      await joinQueueHandler({
        playerId: 'player-1',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      });

      // Add second socket for second player
      const mockSocket2 = {
        ...mockSocket, id: 'socket-2', emit: jest.fn(), leave: jest.fn(),
      };
      mockSocketIO.sockets.sockets.set('socket-2', mockSocket2 as any);

      // Manually add second player to queue to simulate matching
      const queueKey = 'SOL-mint:1';
      const service2 = (service as any);
      service2.queues.get(queueKey).push({
        playerId: 'player-2',
        socketId: 'socket-2',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        joinedAt: new Date(Date.now() + 1000), // Slightly later
        lastHeartbeat: new Date(),
      });

      // Trigger matching process
      jest.advanceTimersByTime(2000);

      // Should emit match-found to both players
      expect(mockSocket.emit).toHaveBeenCalledWith('match-found', expect.objectContaining({
        opponent: 'player-2',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        autoAcceptTimeout: 10000,
      }));

      expect(mockSocket2.emit).toHaveBeenCalledWith('match-found', expect.objectContaining({
        opponent: 'player-1',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        autoAcceptTimeout: 10000,
      }));
    });

    it('should match players in FIFO order', async () => {
      const service2 = (service as any);
      const queueKey = 'SOL-mint:1';

      // Manually create queue with players joined at different times
      const now = Date.now();
      service2.queues.set(queueKey, [
        {
          playerId: 'player-1',
          socketId: 'socket-1',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(now),
          lastHeartbeat: new Date(),
        },
        {
          playerId: 'player-2',
          socketId: 'socket-2',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(now - 1000), // Earlier
          lastHeartbeat: new Date(),
        },
        {
          playerId: 'player-3',
          socketId: 'socket-3',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(now + 1000), // Later
          lastHeartbeat: new Date(),
        },
      ]);

      // Mock sockets
      mockSocketIO.sockets.sockets.set('socket-1', { emit: jest.fn(), leave: jest.fn() });
      mockSocketIO.sockets.sockets.set('socket-2', { emit: jest.fn(), leave: jest.fn() });
      mockSocketIO.sockets.sockets.set('socket-3', { emit: jest.fn(), leave: jest.fn() });

      // Trigger matching
      jest.advanceTimersByTime(2000);

      // Should match player-2 (earliest) with player-1 (second earliest)
      const socket2 = mockSocketIO.sockets.sockets.get('socket-2');
      expect(socket2.emit).toHaveBeenCalledWith(
        'match-found',
        expect.objectContaining({
          opponent: 'player-1',
        }),
      );

      // Player-3 should remain in queue
      expect(service2.queues.get(queueKey)).toHaveLength(1);
      expect(service2.queues.get(queueKey)[0].playerId).toBe('player-3');
    });

    it('should not match players with different bet amounts', async () => {
      const service2 = (service as any);

      // Add players with different bet amounts
      service2.queues.set('SOL-mint:1', [{
        playerId: 'player-1',
        socketId: 'socket-1',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        joinedAt: new Date(),
        lastHeartbeat: new Date(),
      }]);

      service2.queues.set('SOL-mint:2', [{
        playerId: 'player-2',
        socketId: 'socket-2',
        betAmount: 2.0,
        tokenMint: 'SOL-mint',
        joinedAt: new Date(),
        lastHeartbeat: new Date(),
      }]);

      // Trigger matching
      jest.advanceTimersByTime(2000);

      // No matches should occur
      expect(mockSocket.emit).not.toHaveBeenCalledWith('match-found', expect.any(Object));
    });

    it('should generate unique room IDs', () => {
      const service2 = (service as any);
      const roomId1 = service2.generateRoomId();
      const roomId2 = service2.generateRoomId();

      expect(roomId1).not.toBe(roomId2);
      expect(roomId1).toMatch(/^room_\d+_[a-z0-9]+$/);
      expect(roomId2).toMatch(/^room_\d+_[a-z0-9]+$/);
    });
  });

  describe('Match Acceptance', () => {
    let acceptMatchHandler: (data: any) => void;

    beforeEach(() => {
      const connectionHandler = (mockSocketIO.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connection',
      )?.[1];
      connectionHandler(mockSocket);

      acceptMatchHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'accept-match',
      )?.[1];
    });

    it('should handle match acceptance', () => {
      const service2 = (service as any);
      const roomId = 'test-room-123';

      // Create a mock match
      const match: MatchResult = {
        roomId,
        player1: {
          playerId: 'player-1',
          socketId: 'socket-1',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
        },
        player2: {
          playerId: 'player-2',
          socketId: 'socket-2',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
        },
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      service2.activeMatches.set(roomId, match);

      // Mock the sockets
      mockSocketIO.sockets.sockets.set('socket-1', { emit: jest.fn() });
      mockSocketIO.sockets.sockets.set('socket-2', { emit: jest.fn() });

      acceptMatchHandler({ roomId, playerId: 'player-1' });

      // Should emit match-confirmed to both players
      expect(mockSocketIO.to).toHaveBeenCalledWith('socket-1');
      expect(mockSocketIO.to).toHaveBeenCalledWith('socket-2');
      expect(mockSocketIO.emit).toHaveBeenCalledWith('match-confirmed', {
        roomId,
        opponent: 'player-2',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      });
    });

    it('should handle match acceptance with invalid room ID', () => {
      acceptMatchHandler({ roomId: 'non-existent', playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('match-error', {
        message: 'Match not found',
      });
    });

    it('should auto-accept matches after timeout', () => {
      const service2 = (service as any);
      const roomId = 'test-room-123';

      // Create mock players and queue
      service2.queues.set('SOL-mint:1', [
        {
          playerId: 'player-1',
          socketId: 'socket-1',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
        },
        {
          playerId: 'player-2',
          socketId: 'socket-2',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
        },
      ]);

      // Mock sockets
      mockSocketIO.sockets.sockets.set('socket-1', { emit: jest.fn(), leave: jest.fn() });
      mockSocketIO.sockets.sockets.set('socket-2', { emit: jest.fn(), leave: jest.fn() });

      // Trigger matching which should set auto-accept timeout
      jest.advanceTimersByTime(2000);

      // Fast forward past auto-accept timeout
      jest.advanceTimersByTime(10000);

      // Should have auto-accepted the match
      expect(mockSocketIO.emit).toHaveBeenCalledWith('match-confirmed', expect.any(Object));
    });
  });

  describe('Heartbeat System', () => {
    it('should update heartbeat timestamps', () => {
      const service2 = (service as any);
      const queueKey = 'SOL-mint:1';
      const now = new Date();

      // Add player to queue
      service2.queues.set(queueKey, [{
        playerId: 'player-123',
        socketId: 'socket-1',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
        joinedAt: now,
        lastHeartbeat: new Date(now.getTime() - 5000), // 5 seconds ago
      }]);

      const heartbeatHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'heartbeat',
      )?.[1];

      heartbeatHandler({ playerId: 'player-123' });

      // Heartbeat should be updated
      const queue = service2.queues.get(queueKey);
      expect(queue[0].lastHeartbeat.getTime()).toBeGreaterThan(now.getTime() - 1000);
    });

    it('should remove inactive players during heartbeat monitoring', () => {
      const service2 = (service as any);
      const queueKey = 'SOL-mint:1';
      const now = new Date();

      // Add players with different heartbeat timestamps
      service2.queues.set(queueKey, [
        {
          playerId: 'active-player',
          socketId: 'socket-1',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: now,
          lastHeartbeat: new Date(), // Recent
        },
        {
          playerId: 'inactive-player',
          socketId: 'socket-2',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: now,
          lastHeartbeat: new Date(now.getTime() - 60000), // 1 minute ago
        },
      ]);

      // Trigger heartbeat monitoring
      jest.advanceTimersByTime(15000);

      // Only active player should remain
      const queue = service2.queues.get(queueKey);
      expect(queue).toHaveLength(1);
      expect(queue[0].playerId).toBe('active-player');
    });

    it('should broadcast updated queue stats after removing inactive players', () => {
      const service2 = (service as any);
      const queueKey = 'SOL-mint:1';
      const now = new Date();

      service2.queues.set(queueKey, [
        {
          playerId: 'inactive-player',
          socketId: 'socket-1',
          betAmount: 1.0,
          tokenMint: 'SOL-mint',
          joinedAt: now,
          lastHeartbeat: new Date(now.getTime() - 60000), // Old heartbeat
        },
      ]);

      // Clear previous calls
      jest.clearAllMocks();

      // Trigger heartbeat monitoring
      jest.advanceTimersByTime(15000);

      // Should broadcast queue stats update
      expect(mockSocketIO.to).toHaveBeenCalledWith('queue:SOL-mint:1');
      expect(mockSocketIO.emit).toHaveBeenCalledWith('queue-stats-update', expect.any(Object));
    });
  });

  describe('Public API', () => {
    it('should return queue statistics', () => {
      const service2 = (service as any);

      // Add some queues
      service2.queues.set('SOL-mint:1', [
        {
          playerId: 'p1', socketId: 's1', betAmount: 1, tokenMint: 'SOL-mint', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
        {
          playerId: 'p2', socketId: 's2', betAmount: 1, tokenMint: 'SOL-mint', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      service2.queues.set('USDC-mint:100', [
        {
          playerId: 'p3', socketId: 's3', betAmount: 100, tokenMint: 'USDC-mint', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      const stats = service.getQueueStats();

      expect(stats).toHaveLength(2);
      expect(stats[0]).toEqual({
        tokenMint: 'SOL-mint',
        betAmount: 1,
        playersWaiting: 2,
        averageWaitTime: 30, // Based on calculation
      });
      expect(stats[1]).toEqual({
        tokenMint: 'USDC-mint',
        betAmount: 100,
        playersWaiting: 1,
        averageWaitTime: 30,
      });
    });

    it('should sort queue statistics by most active', () => {
      const service2 = (service as any);

      service2.queues.set('low-activity:1', [
        {
          playerId: 'p1', socketId: 's1', betAmount: 1, tokenMint: 'low-activity', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      service2.queues.set('high-activity:1', [
        {
          playerId: 'p2', socketId: 's2', betAmount: 1, tokenMint: 'high-activity', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
        {
          playerId: 'p3', socketId: 's3', betAmount: 1, tokenMint: 'high-activity', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
        {
          playerId: 'p4', socketId: 's4', betAmount: 1, tokenMint: 'high-activity', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      const stats = service.getQueueStats();

      expect(stats[0].tokenMint).toBe('high-activity');
      expect(stats[0].playersWaiting).toBe(3);
      expect(stats[1].tokenMint).toBe('low-activity');
      expect(stats[1].playersWaiting).toBe(1);
    });
  });

  describe('Utility Methods', () => {
    it('should generate correct queue keys', () => {
      const service2 = (service as any);

      const key = service2.getQueueKey('SOL-mint', 1.5);
      expect(key).toBe('SOL-mint:1.5');
    });

    it('should find players across queues', () => {
      const service2 = (service as any);

      service2.queues.set('SOL:1', [
        {
          playerId: 'player-123', socketId: 's1', betAmount: 1, tokenMint: 'SOL', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      expect(service2.findPlayerInQueues('player-123')).toBe(true);
      expect(service2.findPlayerInQueues('non-existent')).toBe(false);
    });

    it('should remove players from queues correctly', () => {
      const service2 = (service as any);

      service2.queues.set('SOL:1', [
        {
          playerId: 'player-123', socketId: 's1', betAmount: 1, tokenMint: 'SOL', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
        {
          playerId: 'player-456', socketId: 's2', betAmount: 1, tokenMint: 'SOL', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      const removedQueueKey = service2.removePlayerFromQueues('player-123');

      expect(removedQueueKey).toBe('SOL:1');
      expect(service2.queues.get('SOL:1')).toHaveLength(1);
      expect(service2.queues.get('SOL:1')[0].playerId).toBe('player-456');
    });

    it('should calculate estimated wait times based on queue length', () => {
      const service2 = (service as any);

      service2.queues.set('test-queue', [
        { playerId: 'p1' }, { playerId: 'p2' }, { playerId: 'p3' },
      ]);

      const waitTime = service2.calculateEstimatedWaitTime('test-queue');
      expect(waitTime).toBe(45); // 3 players * 15 seconds each
    });

    it('should return minimum wait time for empty queues', () => {
      const service2 = (service as any);

      const waitTime = service2.calculateEstimatedWaitTime('empty-queue');
      expect(waitTime).toBe(30); // Minimum 30 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle join queue errors gracefully', async () => {
      const connectionHandler = (mockSocketIO.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connection',
      )?.[1];
      connectionHandler(mockSocket);

      const joinQueueHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'join-queue',
      )?.[1];

      // Mock error during queue join
      const service2 = (service as any);
      const originalMethod = service2.handleJoinQueue;
      service2.handleJoinQueue = jest.fn().mockRejectedValue(new Error('Database error'));

      const queueData = {
        playerId: 'player-123',
        betAmount: 1.0,
        tokenMint: 'SOL-mint',
      };

      await joinQueueHandler(queueData);

      expect(mockSocket.emit).toHaveBeenCalledWith('queue-error', {
        message: 'Failed to join queue',
        error: 'Database error',
      });

      // Restore original method
      service2.handleJoinQueue = originalMethod;
    });

    it('should handle disconnection during queue membership', () => {
      const service2 = (service as any);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add player to queue
      service2.queues.set('SOL:1', [
        {
          playerId: 'player-123', socketId: 'disconnect-socket', betAmount: 1, tokenMint: 'SOL', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      // Simulate disconnection
      service2.handleDisconnection('disconnect-socket');

      expect(service2.queues.get('SOL:1')).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Removed disconnected player player-123 from queue SOL:1');

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should clean up intervals and close socket on shutdown', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2); // heartbeat + matching intervals
      expect(mockSocketIO.close).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should handle shutdown gracefully when intervals are not set', () => {
      const newService = new MatchmakingService(mockHttpServer);

      // Clear intervals before they're properly set
      (newService as any).heartbeatInterval = null;
      (newService as any).matchingInterval = null;

      // Should not throw error
      expect(() => newService.shutdown()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty socket sockets map', () => {
      mockSocketIO.sockets.sockets.clear();

      const service2 = (service as any);
      service2.queues.set('test:1', [
        {
          playerId: 'p1', socketId: 'missing-socket', betAmount: 1, tokenMint: 'test', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
        {
          playerId: 'p2', socketId: 'also-missing', betAmount: 1, tokenMint: 'test', joinedAt: new Date(), lastHeartbeat: new Date(),
        },
      ]);

      // Should not crash when trying to notify non-existent sockets
      expect(() => {
        jest.advanceTimersByTime(2000); // Trigger matching
      }).not.toThrow();
    });

    it('should handle malformed queue data', () => {
      const service2 = (service as any);

      // Add invalid queue data
      service2.queues.set('invalid:queue', [
        {
          playerId: null, socketId: '', betAmount: NaN, tokenMint: '', joinedAt: null, lastHeartbeat: null,
        },
      ]);

      // Should handle gracefully during heartbeat monitoring
      expect(() => {
        jest.advanceTimersByTime(15000);
      }).not.toThrow();
    });

    it('should handle concurrent queue modifications', async () => {
      const service2 = (service as any);
      const queueKey = 'concurrent:1';

      // Simulate concurrent queue access
      service2.queues.set(queueKey, []);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          service2.queues.get(queueKey).push({
            playerId: `player-${i}`,
            socketId: `socket-${i}`,
            betAmount: 1,
            tokenMint: 'concurrent',
            joinedAt: new Date(),
            lastHeartbeat: new Date(),
          }),
        );
      }

      await Promise.all(promises);

      expect(service2.queues.get(queueKey).length).toBe(10);
    });
  });
});
