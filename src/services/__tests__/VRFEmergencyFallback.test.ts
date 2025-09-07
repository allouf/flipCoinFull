import { VRFEmergencyFallback, getVRFEmergencyFallback } from '../VRFEmergencyFallback';
import { Connection } from '@solana/web3.js';

// Mock dependencies
jest.mock('../VRFStatusManager', () => ({
  vrfStatusManager: {
    completeGame: jest.fn(),
  },
}));

jest.mock('../VRFErrorDetector', () => ({
  getVRFErrorDetector: jest.fn(() => ({
    updateNetworkHealth: jest.fn(),
    classifyError: jest.fn(),
  })),
}));

describe('VRFEmergencyFallback', () => {
  let emergencyFallback: VRFEmergencyFallback;
  let mockConnection: Connection;

  beforeEach(() => {
    mockConnection = {} as Connection;
    emergencyFallback = new VRFEmergencyFallback(mockConnection);
    jest.clearAllMocks();
  });

  afterEach(() => {
    emergencyFallback.cleanup();
  });

  describe('Emergency Monitoring', () => {
    it('should start emergency monitoring for a game', () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const mockEmit = jest.spyOn(emergencyFallback, 'emit');

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection);

      expect(emergencyFallback.isGameInEmergencyState(gameId)).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('emergencyMonitoringStarted', {
        gameId,
        roomId,
        timeoutMs: 60000,
        method: 'timeout-win',
      });
    });

    it('should stop emergency monitoring successfully', () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const mockEmit = jest.spyOn(emergencyFallback, 'emit');

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection);
      expect(emergencyFallback.isGameInEmergencyState(gameId)).toBe(true);

      emergencyFallback.stopEmergencyMonitoring(gameId);
      expect(emergencyFallback.isGameInEmergencyState(gameId)).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith('emergencyMonitoringStopped', {
        gameId,
        resolved: true,
        method: 'vrf',
      });
    });

    it('should handle multiple games simultaneously', () => {
      const game1 = { gameId: 'game1', roomId: 100, selection: 'heads' as const };
      const game2 = { gameId: 'game2', roomId: 200, selection: 'tails' as const };

      emergencyFallback.startEmergencyMonitoring(game1.gameId, game1.roomId, game1.selection);
      emergencyFallback.startEmergencyMonitoring(game2.gameId, game2.roomId, game2.selection);

      expect(emergencyFallback.isGameInEmergencyState(game1.gameId)).toBe(true);
      expect(emergencyFallback.isGameInEmergencyState(game2.gameId)).toBe(true);

      const activeGames = emergencyFallback.getActiveEmergencyGames();
      expect(activeGames).toHaveLength(2);
    });

    it('should replace existing monitoring when restarted', () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      // Start monitoring twice
      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection);
      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection);

      const activeGames = emergencyFallback.getActiveEmergencyGames();
      expect(activeGames).toHaveLength(1); // Should not duplicate
    });
  });

  describe('Emergency Resolution Methods', () => {
    it('should use deterministic fallback method', (done) => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const options = {
        timeoutMs: 100, // Short timeout for testing
        fallbackMethod: 'deterministic' as const,
      };

      emergencyFallback.on('emergencyResolution', (result) => {
        expect(result.method).toBe('emergency');
        expect(result.result).toMatch(/^(heads|tails)$/);
        expect(result.reason).toContain('Deterministic fallback');
        done();
      });

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);
    });

    it('should use client-side random fallback method', (done) => {
      const gameId = 'test-game-124';
      const roomId = 457;
      const playerSelection = 'tails';

      const options = {
        timeoutMs: 100,
        fallbackMethod: 'client-side-random' as const,
      };

      emergencyFallback.on('emergencyResolution', (result) => {
        expect(result.method).toBe('emergency');
        expect(result.result).toMatch(/^(heads|tails)$/);
        expect(result.reason).toContain('Client-side pseudorandom');
        done();
      });

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);
    });

    it('should use timeout-win fallback method by default', (done) => {
      const gameId = 'test-game-125';
      const roomId = 458;
      const playerSelection = 'heads';

      const options = {
        timeoutMs: 100,
        fallbackMethod: 'timeout-win' as const,
      };

      emergencyFallback.on('emergencyResolution', (result) => {
        expect(result.method).toBe('emergency');
        expect(result.result).toBe(playerSelection); // Player should win
        expect(result.reason).toContain('Player awarded win');
        done();
      });

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);
    });
  });

  describe('Manual Retry', () => {
    it('should allow manual retry when enabled', async () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const options = {
        timeoutMs: 5000,
        enableManualRetry: true,
      };

      const mockEmit = jest.spyOn(emergencyFallback, 'emit');

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);
      
      const result = await emergencyFallback.manualRetryVRF(gameId);
      expect(result).toBe(true);
      
      expect(mockEmit).toHaveBeenCalledWith('manualRetryStarted', {
        gameId,
        attempt: 1,
        timeoutMs: 5000,
      });
    });

    it('should reject manual retry when disabled', async () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const options = {
        timeoutMs: 5000,
        enableManualRetry: false,
      };

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);
      
      const result = await emergencyFallback.manualRetryVRF(gameId);
      expect(result).toBe(false);
    });

    it('should reject manual retry for non-existent games', async () => {
      const result = await emergencyFallback.manualRetryVRF('non-existent-game');
      expect(result).toBe(false);
    });
  });

  describe('Active Games Tracking', () => {
    it('should track active emergency games correctly', () => {
      const game1 = { gameId: 'game1', roomId: 100, selection: 'heads' as const };
      const game2 = { gameId: 'game2', roomId: 200, selection: 'tails' as const };

      emergencyFallback.startEmergencyMonitoring(game1.gameId, game1.roomId, game1.selection);
      emergencyFallback.startEmergencyMonitoring(game2.gameId, game2.roomId, game2.selection);

      const activeGames = emergencyFallback.getActiveEmergencyGames();
      
      expect(activeGames).toHaveLength(2);
      expect(activeGames.find(g => g.gameId === game1.gameId)).toBeDefined();
      expect(activeGames.find(g => g.gameId === game2.gameId)).toBeDefined();
      
      // Check that time tracking is working
      activeGames.forEach(game => {
        expect(game.timeElapsed).toBeGreaterThanOrEqual(0);
        expect(game.timeRemaining).toBeLessThanOrEqual(60000);
      });
    });

    it('should update time remaining correctly', (done) => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      const options = {
        timeoutMs: 1000,
      };

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection, options);

      setTimeout(() => {
        const activeGames = emergencyFallback.getActiveEmergencyGames();
        const game = activeGames.find(g => g.gameId === gameId);
        
        expect(game).toBeDefined();
        expect(game!.timeElapsed).toBeGreaterThan(100);
        expect(game!.timeRemaining).toBeLessThan(1000);
        done();
      }, 200);
    });
  });

  describe('Force Emergency Resolution', () => {
    it('should force emergency resolution for active games', async () => {
      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      emergencyFallback.startEmergencyMonitoring(gameId, roomId, playerSelection);

      const result = await emergencyFallback.forceEmergencyResolution(gameId);
      
      expect(result).toBeDefined();
      expect(result!.method).toBe('emergency');
      expect(result!.result).toBe(playerSelection); // timeout-win default
    });

    it('should return null for non-existent games', async () => {
      const result = await emergencyFallback.forceEmergencyResolution('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should clean up all active monitoring', () => {
      const game1 = { gameId: 'game1', roomId: 100, selection: 'heads' as const };
      const game2 = { gameId: 'game2', roomId: 200, selection: 'tails' as const };

      emergencyFallback.startEmergencyMonitoring(game1.gameId, game1.roomId, game1.selection);
      emergencyFallback.startEmergencyMonitoring(game2.gameId, game2.roomId, game2.selection);

      expect(emergencyFallback.getActiveEmergencyGames()).toHaveLength(2);

      emergencyFallback.cleanup();

      expect(emergencyFallback.getActiveEmergencyGames()).toHaveLength(0);
      expect(emergencyFallback.isGameInEmergencyState(game1.gameId)).toBe(false);
      expect(emergencyFallback.isGameInEmergencyState(game2.gameId)).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getVRFEmergencyFallback(mockConnection);
      const instance2 = getVRFEmergencyFallback(mockConnection);
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across instances', () => {
      const instance1 = getVRFEmergencyFallback(mockConnection);
      const instance2 = getVRFEmergencyFallback(mockConnection);

      const gameId = 'test-game-123';
      const roomId = 456;
      const playerSelection = 'heads';

      instance1.startEmergencyMonitoring(gameId, roomId, playerSelection);
      
      expect(instance2.isGameInEmergencyState(gameId)).toBe(true);
      expect(instance2.getActiveEmergencyGames()).toHaveLength(1);
    });
  });
});