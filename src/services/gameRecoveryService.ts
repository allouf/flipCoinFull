import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { GameRoom } from '../hooks/useAnchorProgram';
import { gameCache } from '../utils/gameCache';
import { validateGameState } from '../utils/gameValidation';
import { gameSyncService } from './gameSyncService';

export interface RecoveryResult {
  success: boolean;
  gameId: string;
  action: 'timeout' | 'cancel' | 'reset' | 'manual_resolve' | 'none';
  details: string;
  recoveredState?: any;
}

export interface RecoveryStats {
  totalAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  lastRecoveryAttempt: number;
}

class GameRecoveryService {
  private static instance: GameRecoveryService;
  private program: Program | null = null;
  private stats: RecoveryStats = {
    totalAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    lastRecoveryAttempt: 0,
  };

  private constructor() {}

  static getInstance(): GameRecoveryService {
    if (!GameRecoveryService.instance) {
      GameRecoveryService.instance = new GameRecoveryService();
    }
    return GameRecoveryService.instance;
  }

  initialize(program: Program): void {
    this.program = program;
    console.log('🔧 Game recovery service initialized');
  }

  async attemptRecovery(
    gameId: string,
    currentUserPubkey: PublicKey
  ): Promise<RecoveryResult> {
    if (!this.program) {
      throw new Error('GameRecoveryService not initialized');
    }

    console.log(`🔄 Attempting recovery for game ${gameId}...`);
    this.stats.totalAttempts++;
    this.stats.lastRecoveryAttempt = Date.now();

    try {
      // First try to fetch game from cache
      const cachedGame = gameCache.getGame(gameId);
      let gameRoom: GameRoom | null = null;

      if (cachedGame?.gameData) {
        gameRoom = cachedGame.gameData;
      } else {
        // Try to fetch directly from blockchain
        const accounts = await this.program.account.game.all();
        gameRoom = accounts.find(
          (acc: any) => (acc.account as any)?.gameId?.toString() === gameId
        )?.account as unknown as GameRoom || null;
      }

      if (!gameRoom) {
        this.stats.failedRecoveries++;
        return {
          success: false,
          gameId,
          action: 'none',
          details: 'Game not found on blockchain',
        };
      }

      // Validate current state
      const validation = await validateGameState(gameRoom, currentUserPubkey);

      // If game is valid but stuck, determine appropriate action
      if (!validation.isValid && validation.status === 'expired') {
        return await this.handleExpiredGame(gameRoom, currentUserPubkey);
      }

      // If game is completed but cache is stale
      if (validation.status === 'completed') {
        return await this.handleCompletedGame(gameRoom, gameId);
      }

      // If game needs manual resolution
      if (gameRoom.status && 'revealingPhase' in gameRoom.status) {
        return await this.handleStuckReveal(gameRoom, currentUserPubkey);
      }

      // If no specific recovery action needed
      return {
        success: true,
        gameId,
        action: 'none',
        details: 'Game is in a valid state, no recovery needed',
      };

    } catch (error) {
      console.error(`Failed to recover game ${gameId}:`, error);
      this.stats.failedRecoveries++;
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        gameId,
        action: 'none',
        details: `Recovery failed: ${msg}`,
      };
    }
  }

  private async handleExpiredGame(
    gameRoom: GameRoom,
    currentUserPubkey: PublicKey
  ): Promise<RecoveryResult> {
    if (!this.program) throw new Error('Program not initialized');

    const gameId = gameRoom.gameId.toString();
    try {
      if ('waitingForPlayer' in gameRoom.status) {
        // Handle single-player timeout
        const isCreator = gameRoom.playerA.equals(currentUserPubkey);
        if (!isCreator) {
          return {
            success: false,
            gameId,
            action: 'none',
            details: 'Only the creator can cancel an expired waiting game',
          };
        }

        await this.program.methods
          .cancelGame()
          .accounts({
            game: new PublicKey(gameRoom.playerA),
            player: currentUserPubkey,
          })
          .rpc();

        this.stats.successfulRecoveries++;
        return {
          success: true,
          gameId,
          action: 'cancel',
          details: 'Successfully cancelled expired waiting game',
        };
      }

      // Handle two-player timeout
      if ('playersReady' in gameRoom.status || 'revealingPhase' in gameRoom.status) {
        await this.program.methods
          .handleTimeout()
          .accounts({
            game: new PublicKey(gameRoom.playerA),
            player1: gameRoom.playerA,
            player2: gameRoom.playerB!,
          })
          .rpc();

        this.stats.successfulRecoveries++;
        return {
          success: true,
          gameId,
          action: 'timeout',
          details: 'Successfully handled timeout for expired game',
        };
      }

      return {
        success: false,
        gameId,
        action: 'none',
        details: 'Game state does not allow recovery',
      };

    } catch (error) {
      console.error(`Failed to handle expired game ${gameId}:`, error);
      this.stats.failedRecoveries++;
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        gameId,
        action: 'none',
        details: `Failed to handle expired game: ${msg}`,
      };
    }
  }

  private async handleCompletedGame(
    gameRoom: GameRoom,
    gameId: string
  ): Promise<RecoveryResult> {
    // Clear from cache and sync service
    gameCache.invalidateGame(gameId);
    
    this.stats.successfulRecoveries++;
    return {
      success: true,
      gameId,
      action: 'reset',
      details: 'Game was already completed, cleared from cache',
      recoveredState: {
        winner: gameRoom.winner?.toString(),
        resolvedAt: gameRoom.resolvedAt?.toNumber(),
      },
    };
  }

  private async handleStuckReveal(
    gameRoom: GameRoom,
    currentUserPubkey: PublicKey
  ): Promise<RecoveryResult> {
    if (!this.program) throw new Error('Program not initialized');

    const gameId = gameRoom.gameId.toString();
    try {
      // Verify this user can perform manual resolution
      const canResolve = gameRoom.playerA.equals(currentUserPubkey) || 
                        (gameRoom.playerB && gameRoom.playerB.equals(currentUserPubkey));

      if (!canResolve) {
        return {
          success: false,
          gameId,
          action: 'none',
          details: 'Only participants can manually resolve a stuck game',
        };
      }

      await this.program.methods
        .resolveGameManual()
        .accounts({
          game: new PublicKey(gameRoom.playerA),
          player1: gameRoom.playerA,
          player2: gameRoom.playerB!,
          resolver: currentUserPubkey,
        })
        .rpc();

      this.stats.successfulRecoveries++;
      return {
        success: true,
        gameId,
        action: 'manual_resolve',
        details: 'Successfully resolved stuck game manually',
      };

    } catch (error) {
      console.error(`Failed to manually resolve game ${gameId}:`, error);
      this.stats.failedRecoveries++;
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        gameId,
        action: 'none',
        details: `Manual resolution failed: ${msg}`,
      };
    }
  }

  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  isInitialized(): boolean {
    return !!this.program;
  }
}

// Export singleton instance
export const gameRecoveryService = GameRecoveryService.getInstance();