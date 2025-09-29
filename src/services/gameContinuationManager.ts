import { PublicKey } from '@solana/web3.js';
import { GameRoom } from '../hooks/useAnchorProgram';
import { gameCache } from '../utils/gameCache';
import { gameSyncService } from './gameSyncService';
import { gameRecoveryService } from './gameRecoveryService';
import { validateGameState } from '../utils/gameValidation';

export interface ContinuationResult {
  success: boolean;
  gameId: string;
  action: 'continue' | 'recover' | 'restart' | 'none';
  details: string;
  gameState?: any;
}

export interface ContinuationOptions {
  forceRefresh?: boolean;
  autoRecover?: boolean;
  maxRetries?: number;
}

class GameContinuationManager {
  private static instance: GameContinuationManager;
  private program: any = null;

  private constructor() {}

  static getInstance(): GameContinuationManager {
    if (!GameContinuationManager.instance) {
      GameContinuationManager.instance = new GameContinuationManager();
    }
    return GameContinuationManager.instance;
  }

  initialize(program: any): void {
    this.program = program;
    console.log('🔄 Game continuation manager initialized');
  }

  async continueGame(
    gameId: string,
    currentUserPubkey: PublicKey,
    options: ContinuationOptions = {}
  ): Promise<ContinuationResult> {
    if (!this.program) {
      throw new Error('GameContinuationManager not initialized');
    }

    const {
      forceRefresh = false,
      autoRecover = true,
      maxRetries = 3,
    } = options;

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        // Step 1: Get game state from cache or blockchain
        let gameData = forceRefresh ? null : gameCache.getGame(gameId)?.gameData;

        if (!gameData) {
          // Try to fetch from blockchain
          console.log(`🔍 Fetching game ${gameId} from blockchain...`);
          const accounts = await this.program.account.game.all();
          const gameAccount = accounts.find(
            (acc: any) => (acc.account as any)?.gameId?.toString() === gameId
          );

          if (!gameAccount) {
            return {
              success: false,
              gameId,
              action: 'none',
              details: 'Game not found on blockchain',
            };
          }

          gameData = gameAccount.account as unknown as GameRoom;
        }

        // Step 2: Validate game state
        const validation = await validateGameState(gameData, currentUserPubkey);
        console.log(`🔍 Game ${gameId} validation:`, validation);

        // Step 3: Handle invalid states
        if (!validation.isValid) {
          if (autoRecover) {
            // Attempt recovery
            const recovery = await gameRecoveryService.attemptRecovery(
              gameId,
              currentUserPubkey
            );

            if (recovery.success) {
              // Recovery succeeded, try to continue with fresh state
              if (recovery.action === 'reset' || recovery.action === 'cancel') {
                return {
                  success: false,
                  gameId,
                  action: 'restart',
                  details: 'Game was reset or cancelled during recovery',
                };
              }

              // Force fresh data after recovery
              return await this.continueGame(gameId, currentUserPubkey, {
                ...options,
                forceRefresh: true,
              });
            }

            // Recovery failed
            return {
              success: false,
              gameId,
              action: 'none',
              details: `Recovery failed: ${recovery.details}`,
            };
          }

          // No auto-recovery, return validation failure
          return {
            success: false,
            gameId,
            action: 'none',
            details: validation.details,
          };
        }

        // Step 4: Verify player participation
        const isPlayerA = gameData.playerA.equals(currentUserPubkey);
        const isPlayerB = gameData.playerB && 
                         !gameData.playerB.equals(PublicKey.default) && 
                         gameData.playerB.equals(currentUserPubkey);

        if (!isPlayerA && !isPlayerB) {
          return {
            success: false,
            gameId,
            action: 'none',
            details: 'Current user is not a participant in this game',
          };
        }

        // Step 5: Update cache and start sync
        await gameCache.setGame(gameId, gameData, currentUserPubkey, {
          forceFresh: true,
          ttl: 30000, // 30 second TTL for active games
        });

        await gameSyncService.startSync({
          interval: 5000, // 5-second sync for active games
          maxRetries: 3,
          retryDelay: 1000,
        });

        // Step 6: Return success with game state
        return {
          success: true,
          gameId,
          action: 'continue',
          details: 'Successfully continued game',
          gameState: {
            phase: gameData.status ? Object.keys(gameData.status)[0] : 'unknown',
            isPlayerA,
            isPlayerB,
            betAmount: gameData.betAmount,
            hasCommitted: isPlayerA ? 
              gameData.commitmentA.length > 0 : 
              gameData.commitmentB.length > 0,
          },
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Continuation attempt ${retryCount + 1} failed:`, error);
        retryCount++;

        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying... (${maxRetries - retryCount} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // All retries failed
    return {
      success: false,
      gameId,
      action: 'none',
      details: `Failed after ${maxRetries} attempts: ${lastError?.message}`,
    };
  }

  isInitialized(): boolean {
    return !!this.program;
  }
}

// Export singleton instance
export const gameContinuationManager = GameContinuationManager.getInstance();