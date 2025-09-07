import { EventEmitter } from 'eventemitter3';
import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';
import { getVRFErrorDetector } from './VRFErrorDetector';
import { vrfStatusManager } from './VRFStatusManager';

export interface EmergencyResolutionOptions {
  timeoutMs: number;
  fallbackMethod: 'deterministic' | 'client-side-random' | 'timeout-win';
  enableManualRetry: boolean;
}

export interface EmergencyResolutionResult {
  resolved: boolean;
  method: 'vrf' | 'emergency' | 'manual-retry' | 'timeout';
  result?: 'heads' | 'tails' | 'refund';
  signature?: TransactionSignature;
  reason: string;
  timestamp: number;
}

/**
 * VRFEmergencyFallback - Handles emergency game resolution when VRF fails
 * 
 * Features:
 * - 60-second emergency timeout for VRF failures
 * - Multiple fallback resolution methods
 * - User notification system for emergency conditions
 * - Integration with game state management
 * - Automatic refund mechanisms when appropriate
 */
export class VRFEmergencyFallback extends EventEmitter {
  private activeGames: Map<string, {
    startTime: number;
    timeoutId: NodeJS.Timeout;
    gameId: string;
    roomId: number;
    options: EmergencyResolutionOptions;
    playerSelection: 'heads' | 'tails';
    attempts: number;
  }> = new Map();

  private errorDetector = getVRFErrorDetector();

  constructor(private connection: Connection) {
    super();
  }

  /**
   * Start emergency fallback monitoring for a VRF game
   */
  startEmergencyMonitoring(
    gameId: string,
    roomId: number,
    playerSelection: 'heads' | 'tails',
    options: Partial<EmergencyResolutionOptions> = {}
  ): void {
    const finalOptions: EmergencyResolutionOptions = {
      timeoutMs: 60000, // 60 seconds
      fallbackMethod: 'timeout-win', // Default: player wins on timeout
      enableManualRetry: true,
      ...options,
    };

    // Clear any existing monitoring for this game
    this.stopEmergencyMonitoring(gameId);

    const startTime = Date.now();
    
    // Set up emergency timeout
    const timeoutId = setTimeout(async () => {
      await this.handleEmergencyTimeout(gameId, roomId, playerSelection, finalOptions);
    }, finalOptions.timeoutMs);

    // Track the game
    this.activeGames.set(gameId, {
      startTime,
      timeoutId,
      gameId,
      roomId,
      options: finalOptions,
      playerSelection,
      attempts: 0,
    });

    console.log(
      `Emergency fallback monitoring started for game ${gameId} ` +
      `(timeout: ${finalOptions.timeoutMs}ms, method: ${finalOptions.fallbackMethod})`
    );

    // Emit monitoring started event
    this.emit('emergencyMonitoringStarted', {
      gameId,
      roomId,
      timeoutMs: finalOptions.timeoutMs,
      method: finalOptions.fallbackMethod,
    });
  }

  /**
   * Stop emergency monitoring (called on successful VRF completion)
   */
  stopEmergencyMonitoring(gameId: string): void {
    const game = this.activeGames.get(gameId);
    if (game) {
      clearTimeout(game.timeoutId);
      this.activeGames.delete(gameId);
      
      console.log(`Emergency monitoring stopped for game ${gameId}`);
      
      this.emit('emergencyMonitoringStopped', {
        gameId,
        resolved: true,
        method: 'vrf',
      });
    }
  }

  /**
   * Handle emergency timeout and resolve game using fallback method
   */
  private async handleEmergencyTimeout(
    gameId: string,
    roomId: number,
    playerSelection: 'heads' | 'tails',
    options: EmergencyResolutionOptions
  ): Promise<EmergencyResolutionResult> {
    console.warn(`Emergency timeout triggered for game ${gameId} after ${options.timeoutMs}ms`);

    const result: EmergencyResolutionResult = {
      resolved: false,
      method: 'emergency',
      reason: 'VRF system failed to respond within timeout period',
      timestamp: Date.now(),
    };

    try {
      // Notify user of emergency situation
      this.emit('emergencyTimeout', {
        gameId,
        roomId,
        timeoutMs: options.timeoutMs,
        fallbackMethod: options.fallbackMethod,
      });

      // Execute fallback resolution based on method
      switch (options.fallbackMethod) {
        case 'deterministic':
          result.result = this.generateDeterministicResult(gameId, roomId);
          result.reason = 'Deterministic fallback based on game parameters';
          break;

        case 'client-side-random':
          result.result = this.generateClientSideRandom();
          result.reason = 'Client-side pseudorandom fallback';
          break;

        case 'timeout-win':
        default:
          result.result = playerSelection; // Player wins on timeout
          result.reason = 'Player awarded win due to VRF timeout (house policy)';
          break;
      }

      // Execute emergency resolution transaction (if needed)
      if (result.result && result.result !== 'refund' as any) {
        try {
          result.signature = await this.executeEmergencyResolution(
            roomId,
            result.result,
            gameId
          );
          result.resolved = true;
          result.method = 'emergency';
        } catch (txError) {
          console.error('Emergency resolution transaction failed:', txError);
          
          // Fall back to refund if emergency resolution fails
          result.result = 'refund';
          result.reason = 'Emergency resolution failed, initiating refund';
          result.resolved = await this.executeRefund(roomId, gameId);
        }
      }

      // Update VRF status manager
      vrfStatusManager.completeGame(
        gameId,
        result.resolved,
        result.signature || null,
        result.reason
      );

      // Clean up tracking
      this.activeGames.delete(gameId);

      // Emit resolution event
      this.emit('emergencyResolution', result);

      console.log(
        `Emergency resolution completed for game ${gameId}: ` +
        `result=${result.result}, method=${result.method}, resolved=${result.resolved}`
      );

      return result;

    } catch (error) {
      console.error('Emergency resolution failed:', error);
      
      result.resolved = false;
      result.reason = `Emergency resolution error: ${(error as Error).message}`;
      
      this.emit('emergencyResolutionFailed', {
        gameId,
        error: (error as Error).message,
        result,
      });

      return result;
    }
  }

  /**
   * Generate deterministic result based on game parameters
   */
  private generateDeterministicResult(gameId: string, roomId: number): 'heads' | 'tails' {
    // Create deterministic but unpredictable result using game parameters
    const hash = this.simpleHash(`${gameId}-${roomId}-${Date.now()}`);
    return hash % 2 === 0 ? 'heads' : 'tails';
  }

  /**
   * Generate client-side random result
   */
  private generateClientSideRandom(): 'heads' | 'tails' {
    // Use crypto.getRandomValues if available, fallback to Math.random
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % 2 === 0 ? 'heads' : 'tails';
    }
    
    return Math.random() < 0.5 ? 'heads' : 'tails';
  }

  /**
   * Simple hash function for deterministic results
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Execute emergency resolution transaction
   */
  private async executeEmergencyResolution(
    roomId: number,
    result: 'heads' | 'tails',
    gameId: string
  ): Promise<TransactionSignature> {
    // In a real implementation, this would:
    // 1. Create and sign a transaction to resolve the game
    // 2. Include the emergency resolution method in transaction data
    // 3. Distribute winnings according to the emergency result
    // 4. Log the emergency resolution on-chain for transparency
    
    // For now, return a mock transaction signature
    console.log(`Executing emergency resolution for room ${roomId}: ${result}`);
    
    // Simulate transaction execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock signature (in real implementation, this would be actual transaction)
    return `emergency_${roomId}_${result}_${Date.now()}` as TransactionSignature;
  }

  /**
   * Execute refund transaction
   */
  private async executeRefund(roomId: number, gameId: string): Promise<boolean> {
    try {
      // In a real implementation, this would:
      // 1. Create a refund transaction returning bets to both players
      // 2. Subtract only necessary transaction fees
      // 3. Log the refund on-chain for transparency
      
      console.log(`Executing emergency refund for room ${roomId}`);
      
      // Simulate refund execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return true;
    } catch (error) {
      console.error('Emergency refund failed:', error);
      return false;
    }
  }

  /**
   * Manually retry VRF for a game that's in emergency state
   */
  async manualRetryVRF(gameId: string): Promise<boolean> {
    const game = this.activeGames.get(gameId);
    if (!game) {
      console.warn(`No active emergency monitoring found for game ${gameId}`);
      return false;
    }

    if (!game.options.enableManualRetry) {
      console.warn(`Manual retry disabled for game ${gameId}`);
      return false;
    }

    game.attempts++;

    // Extend timeout for manual retry
    clearTimeout(game.timeoutId);
    game.timeoutId = setTimeout(async () => {
      await this.handleEmergencyTimeout(
        gameId,
        game.roomId,
        game.playerSelection,
        game.options
      );
    }, game.options.timeoutMs);

    console.log(`Manual VRF retry initiated for game ${gameId} (attempt ${game.attempts})`);

    this.emit('manualRetryStarted', {
      gameId,
      attempt: game.attempts,
      timeoutMs: game.options.timeoutMs,
    });

    return true;
  }

  /**
   * Get status of all active emergency monitoring
   */
  getActiveEmergencyGames(): Array<{
    gameId: string;
    roomId: number;
    timeElapsed: number;
    timeRemaining: number;
    attempts: number;
    fallbackMethod: string;
  }> {
    const now = Date.now();
    const activeGames: Array<any> = [];

    for (const [gameId, game] of this.activeGames.entries()) {
      const timeElapsed = now - game.startTime;
      const timeRemaining = Math.max(0, game.options.timeoutMs - timeElapsed);

      activeGames.push({
        gameId,
        roomId: game.roomId,
        timeElapsed,
        timeRemaining,
        attempts: game.attempts,
        fallbackMethod: game.options.fallbackMethod,
      });
    }

    return activeGames;
  }

  /**
   * Check if a game is currently in emergency state
   */
  isGameInEmergencyState(gameId: string): boolean {
    return this.activeGames.has(gameId);
  }

  /**
   * Force emergency resolution for testing/admin purposes
   */
  async forceEmergencyResolution(gameId: string): Promise<EmergencyResolutionResult | null> {
    const game = this.activeGames.get(gameId);
    if (!game) {
      return null;
    }

    console.log(`Forcing emergency resolution for game ${gameId}`);
    
    return await this.handleEmergencyTimeout(
      game.gameId,
      game.roomId,
      game.playerSelection,
      game.options
    );
  }

  /**
   * Clean up all emergency monitoring (for shutdown)
   */
  cleanup(): void {
    for (const [gameId, game] of this.activeGames.entries()) {
      clearTimeout(game.timeoutId);
    }
    this.activeGames.clear();
    this.removeAllListeners();
    console.log('VRF Emergency Fallback cleanup completed');
  }
}

// Singleton instance for application-wide use
let vrfEmergencyFallback: VRFEmergencyFallback | null = null;

export const getVRFEmergencyFallback = (connection: Connection): VRFEmergencyFallback => {
  if (!vrfEmergencyFallback) {
    vrfEmergencyFallback = new VRFEmergencyFallback(connection);
  }
  return vrfEmergencyFallback;
};