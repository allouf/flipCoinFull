import { renderHook, act, waitFor } from '@testing-library/react';
import { io, Socket } from 'socket.io-client';
import { useMatchmaking } from '../useMatchmaking';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock @solana/wallet-adapter-react
const mockUseAnchorWallet = jest.fn();
jest.mock('@solana/wallet-adapter-react', () => ({
  useAnchorWallet: () => mockUseAnchorWallet(),
}));

// Mock useAnchorProgram hook
const mockUseAnchorProgram = jest.fn();
jest.mock('../useAnchorProgram', () => ({
  useAnchorProgram: () => mockUseAnchorProgram(),
}));

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted' as NotificationPermission),
};

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  configurable: true,
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useMatchmaking', () => {
  let mockSocket: Partial<Socket>;
  let mockWallet: any;
  let mockProgram: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock socket
    mockSocket = {
      connected: true,
      id: 'test-socket-id',
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
    };
    mockIo.mockReturnValue(mockSocket as Socket);

    // Setup mock wallet
    mockWallet = {
      publicKey: {
        toString: () => '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
        toBuffer: () => Buffer.from('test-key'),
      },
    };
    mockUseAnchorWallet.mockReturnValue(mockWallet);

    // Setup mock program
    mockProgram = {
      programId: {
        toString: () => 'test-program-id',
      },
    };
    mockUseAnchorProgram.mockReturnValue({ program: mockProgram });

    // Setup mock fetch
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.queueStatus).toEqual({ isInQueue: false });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.matchFound).toBe(null);
      expect(result.current.showMatchNotification).toBe(false);
      expect(result.current.popularQueues).toEqual([]);
      expect(result.current.isConnected).toBe(false);
    });

    it('should not initialize socket when wallet is not connected', () => {
      mockUseAnchorWallet.mockReturnValue(null);

      renderHook(() => useMatchmaking());

      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should initialize socket when wallet is connected', () => {
      renderHook(() => useMatchmaking());

      expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080');
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('should use custom socket URL when provided', () => {
      renderHook(() => useMatchmaking('wss://custom-server:9000'));

      expect(mockIo).toHaveBeenCalledWith('wss://custom-server:9000');
    });

    it('should use environment variable for socket URL', () => {
      const originalEnv = process.env.REACT_APP_MATCHMAKING_URL;
      process.env.REACT_APP_MATCHMAKING_URL = 'wss://env-server:8888';

      renderHook(() => useMatchmaking());

      expect(mockIo).toHaveBeenCalledWith('wss://env-server:8888');

      // Restore original env
      if (originalEnv) {
        process.env.REACT_APP_MATCHMAKING_URL = originalEnv;
      } else {
        delete process.env.REACT_APP_MATCHMAKING_URL;
      }
    });
  });

  describe('Socket Event Handlers', () => {
    it('should handle socket connection', () => {
      const { result } = renderHook(() => useMatchmaking());

      // Simulate connection event
      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connect',
      )?.[1];

      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle socket disconnection', () => {
      const { result } = renderHook(() => useMatchmaking());

      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'disconnect',
      )?.[1];

      act(() => {
        disconnectHandler();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.queueStatus).toEqual({ isInQueue: false });
      expect(result.current.matchFound).toBe(null);
      expect(result.current.showMatchNotification).toBe(false);
    });

    it('should handle connection error', () => {
      const { result } = renderHook(() => useMatchmaking());

      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'connect_error',
      )?.[1];

      const error = new Error('Connection failed');
      act(() => {
        errorHandler(error);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('Failed to connect to matchmaking server');
    });

    it('should handle queue-joined event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const queueJoinedHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'queue-joined',
      )?.[1];

      const queueData = {
        queueKey: 'SOL:1.0',
        position: 3,
        estimatedWaitTime: 45,
        playersWaiting: 5,
      };

      act(() => {
        queueJoinedHandler(queueData);
      });

      expect(result.current.queueStatus).toEqual({
        isInQueue: true,
        queuePosition: 3,
        estimatedWaitTime: 45,
        playersWaiting: 5,
        queueKey: 'SOL:1.0',
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle queue-left event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const queueLeftHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'queue-left',
      )?.[1];

      act(() => {
        queueLeftHandler();
      });

      expect(result.current.queueStatus).toEqual({ isInQueue: false });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle queue-error event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const queueErrorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'queue-error',
      )?.[1];

      const errorData = { message: 'Queue is full', error: 'QUEUE_FULL' };

      act(() => {
        queueErrorHandler(errorData);
      });

      expect(result.current.error).toBe('Queue is full');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.queueStatus).toEqual({ isInQueue: false });
    });

    it('should handle match-found event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const matchFoundHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'match-found',
      )?.[1];

      const matchData = {
        roomId: 'room_123',
        opponent: 'opponent-address',
        betAmount: 1.5,
        tokenMint: 'SOL-mint',
        autoAcceptTimeout: 10000,
      };

      act(() => {
        matchFoundHandler(matchData);
      });

      expect(result.current.matchFound).toEqual(matchData);
      expect(result.current.showMatchNotification).toBe(true);
      expect(result.current.queueStatus).toEqual({ isInQueue: false });
    });

    it('should request notification permission on match found', () => {
      mockNotification.permission = 'default';
      const requestPermissionSpy = jest.spyOn(mockNotification, 'requestPermission');

      const { result } = renderHook(() => useMatchmaking());

      const matchFoundHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'match-found',
      )?.[1];

      act(() => {
        matchFoundHandler({
          roomId: 'room_123',
          opponent: 'opponent',
          betAmount: 1,
          tokenMint: 'SOL',
          autoAcceptTimeout: 10000,
        });
      });

      expect(requestPermissionSpy).toHaveBeenCalled();
    });
  });

  describe('Queue Operations', () => {
    it('should join queue successfully', async () => {
      const { result } = renderHook(() => useMatchmaking());

      act(() => {
        result.current.joinQueue(1.5, 'SOL-mint');
      });

      expect(result.current.isLoading).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('join-queue', {
        playerId: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
        betAmount: 1.5,
        tokenMint: 'SOL-mint',
      });
    });

    it('should throw error when joining queue without wallet', async () => {
      mockUseAnchorWallet.mockReturnValue(null);
      const { result } = renderHook(() => useMatchmaking());

      await expect(result.current.joinQueue(1, 'SOL')).rejects.toThrow(
        'Wallet or program not available',
      );
    });

    it('should throw error when joining queue without program', async () => {
      mockUseAnchorProgram.mockReturnValue({ program: null });
      const { result } = renderHook(() => useMatchmaking());

      await expect(result.current.joinQueue(1, 'SOL')).rejects.toThrow(
        'Wallet or program not available',
      );
    });

    it('should leave queue successfully', async () => {
      const { result } = renderHook(() => useMatchmaking());

      act(() => {
        result.current.leaveQueue();
      });

      expect(result.current.isLoading).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-queue', {
        playerId: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
      });
    });

    it('should throw error when leaving queue without wallet', async () => {
      mockUseAnchorWallet.mockReturnValue(null);
      const { result } = renderHook(() => useMatchmaking());

      await expect(result.current.leaveQueue()).rejects.toThrow('Wallet not available');
    });

    it('should handle queue operation errors', async () => {
      const { result } = renderHook(() => useMatchmaking());
      const error = new Error('Network error');

      // Mock socket.emit to throw error
      (mockSocket.emit as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(result.current.joinQueue(1, 'SOL')).rejects.toThrow('Network error');
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Match Operations', () => {
    it('should accept match successfully', async () => {
      const { result } = renderHook(() => useMatchmaking());

      // Set up match data
      act(() => {
        result.current.matchFound = {
          roomId: 'room_123',
          opponent: 'opponent',
          betAmount: 1,
          tokenMint: 'SOL',
          autoAcceptTimeout: 10000,
        };
      });

      await act(async () => {
        await result.current.acceptMatch();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('accept-match', {
        roomId: 'room_123',
        playerId: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
      });
      expect(result.current.showMatchNotification).toBe(false);
    });

    it('should throw error when accepting match without match data', async () => {
      const { result } = renderHook(() => useMatchmaking());

      await expect(result.current.acceptMatch()).rejects.toThrow(
        'No match found or wallet not available',
      );
    });

    it('should decline match successfully', async () => {
      const { result } = renderHook(() => useMatchmaking());

      // Set up match data first
      act(() => {
        result.current.matchFound = {
          roomId: 'room_123',
          opponent: 'opponent',
          betAmount: 1,
          tokenMint: 'SOL',
          autoAcceptTimeout: 10000,
        };
        result.current.showMatchNotification = true;
      });

      await act(async () => {
        await result.current.declineMatch();
      });

      expect(result.current.matchFound).toBe(null);
      expect(result.current.showMatchNotification).toBe(false);
    });

    it('should handle match operation errors', async () => {
      const { result } = renderHook(() => useMatchmaking());

      // Set up match data
      act(() => {
        result.current.matchFound = {
          roomId: 'room_123',
          opponent: 'opponent',
          betAmount: 1,
          tokenMint: 'SOL',
          autoAcceptTimeout: 10000,
        };
      });

      const error = new Error('Match error');
      (mockSocket.emit as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(result.current.acceptMatch()).rejects.toThrow('Match error');
      expect(result.current.error).toBe('Match error');
    });
  });

  describe('Statistics and API calls', () => {
    it('should refresh stats successfully', async () => {
      const mockStats = [
        {
          tokenMint: 'SOL-mint',
          betAmount: 1.0,
          playersWaiting: 5,
          averageWaitTime: 30,
        },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats),
      } as Response);

      const { result } = renderHook(() => useMatchmaking('ws://localhost:8080'));

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/queue-stats');
      expect(result.current.popularQueues).toEqual(mockStats);
    });

    it('should handle refresh stats API error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('API error'),
      );

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch queue stats:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle non-ok response from stats API', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        await result.current.refreshStats();
      });

      // Should not update popularQueues on error
      expect(result.current.popularQueues).toEqual([]);
    });

    it('should auto-refresh stats when not in queue', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useMatchmaking());

      // Verify initial refresh
      expect(fetch).toHaveBeenCalledTimes(1);

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should have refreshed again
      expect(fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should not auto-refresh stats when in queue', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useMatchmaking());

      // Set in queue state
      act(() => {
        result.current.queueStatus = { isInQueue: true };
      });

      const initialCallCount = (fetch as jest.Mock).mock.calls.length;

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not have made additional calls
      expect((fetch as jest.Mock).mock.calls.length).toBe(initialCallCount);

      jest.useRealTimers();
    });
  });

  describe('Heartbeat System', () => {
    it('should send heartbeat periodically', () => {
      jest.useFakeTimers();

      renderHook(() => useMatchmaking());

      // Fast-forward 15 seconds
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', {
        playerId: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
      });

      jest.useRealTimers();
    });

    it('should not send heartbeat when socket is disconnected', () => {
      jest.useFakeTimers();
      mockSocket.connected = false;

      renderHook(() => useMatchmaking());

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('heartbeat', expect.any(Object));

      jest.useRealTimers();
    });

    it('should not send heartbeat when wallet is not available', () => {
      jest.useFakeTimers();
      mockWallet = null;
      mockUseAnchorWallet.mockReturnValue(null);

      renderHook(() => useMatchmaking());

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(mockSocket.emit).not.toHaveBeenCalledWith('heartbeat', expect.any(Object));

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup socket and intervals on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useMatchmaking());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockSocket.close).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should cleanup and reconnect when wallet changes', () => {
      const { rerender } = renderHook(() => useMatchmaking());

      // Change wallet
      const newWallet = {
        publicKey: {
          toString: () => 'new-wallet-address',
          toBuffer: () => Buffer.from('new-key'),
        },
      };
      mockUseAnchorWallet.mockReturnValue(newWallet);

      rerender();

      expect(mockSocket.close).toHaveBeenCalled();
      expect(mockIo).toHaveBeenCalledTimes(2); // Initial + reconnect
    });

    it('should cleanup when wallet is disconnected', () => {
      const { rerender } = renderHook(() => useMatchmaking());

      // Disconnect wallet
      mockUseAnchorWallet.mockReturnValue(null);

      rerender();

      expect(mockSocket.close).toHaveBeenCalled();
    });
  });

  describe('findQueuePositionPda helper function', () => {
    it('should find correct PDA', async () => {
      const { findQueuePositionPda } = await import('../useMatchmaking');
      const { PublicKey } = await import('@solana/web3.js');

      const playerKey = new PublicKey('7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL');
      const programId = new PublicKey('11111111111111111111111111111112');

      const pda = await findQueuePositionPda(playerKey, programId);

      expect(pda).toBeInstanceOf(PublicKey);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined socket URL gracefully', () => {
      delete process.env.REACT_APP_MATCHMAKING_URL;

      renderHook(() => useMatchmaking());

      expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080');
    });

    it('should handle socket events before socket is ready', () => {
      // Mock scenario where events are fired before socket is properly initialized
      const { result } = renderHook(() => useMatchmaking());

      // This should not throw an error
      expect(result.current.isConnected).toBe(false);
    });

    it('should handle queue stats updates correctly', () => {
      const { result } = renderHook(() => useMatchmaking());

      const statsUpdateHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'queue-stats-update',
      )?.[1];

      const statsUpdate = {
        queueKey: 'SOL:1.0',
        playersWaiting: 8,
        estimatedWaitTime: 25,
      };

      act(() => {
        statsUpdateHandler(statsUpdate);
      });

      expect(result.current.queueStatus.playersWaiting).toBe(8);
      expect(result.current.queueStatus.estimatedWaitTime).toBe(25);
    });

    it('should handle match-confirmed event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const matchConfirmedHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'match-confirmed',
      )?.[1];

      const confirmData = {
        roomId: 'room_123',
        opponent: 'opponent',
        betAmount: 1,
        tokenMint: 'SOL',
      };

      act(() => {
        matchConfirmedHandler(confirmData);
      });

      expect(result.current.showMatchNotification).toBe(false);
    });

    it('should handle match-error event', () => {
      const { result } = renderHook(() => useMatchmaking());

      const matchErrorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'match-error',
      )?.[1];

      const errorData = { message: 'Match creation failed' };

      act(() => {
        matchErrorHandler(errorData);
      });

      expect(result.current.error).toBe('Match creation failed');
      expect(result.current.matchFound).toBe(null);
      expect(result.current.showMatchNotification).toBe(false);
    });
  });
});
