import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { GameRoom } from '../hooks/useAnchorProgram';
import { gameCache } from '../utils/gameCache';
import { validateGameState } from '../utils/gameValidation';

export interface SyncOptions {
  interval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SyncStats {
  lastSync: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalGamesProcessed: number;
  activeSubscriptions: number;
}

class GameSyncService {
  private static instance: GameSyncService;
  private program: Program | null = null;
  private connection: Connection | null = null;
  private currentUserPubkey: PublicKey | null = null;
  private syncInterval: number | null = null;
  private subscriptions: Map<string, number> = new Map();
  private subscribers: Map<string, (gameId: string) => void> = new Map();
  private stats: SyncStats = {
    lastSync: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalGamesProcessed: 0,
    activeSubscriptions: 0,
  };

  private constructor() {}

  static getInstance(): GameSyncService {
    if (!GameSyncService.instance) {
      GameSyncService.instance = new GameSyncService();
    }
    return GameSyncService.instance;
  }

  initialize(program: Program, connection: Connection, userPubkey: PublicKey | null): void {
    this.program = program;
    this.connection = connection;
    this.currentUserPubkey = userPubkey;
    console.log('🔄 Game sync service initialized');
  }

  async startSync(options: SyncOptions = {}): Promise<void> {
    if (!this.program || !this.connection) {
      throw new Error('GameSyncService not initialized');
    }

    const {
      interval = 30000, // 30 seconds default
      maxRetries = 3,
      retryDelay = 1000,
    } = options;

    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    await this.performSync(maxRetries, retryDelay);

    // Start regular sync interval
    this.syncInterval = window.setInterval(
      () => this.performSync(maxRetries, retryDelay),
      interval
    );

    console.log(`🔄 Game sync started (interval: ${interval}ms)`);
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Clear all subscriptions
    for (const [gameId, subscriptionId] of this.subscriptions.entries()) {
      if (this.connection) {
        this.connection.removeAccountChangeListener(subscriptionId);
      }
      this.subscriptions.delete(gameId);
    }

    console.log('⏹️ Game sync stopped');
  }

  private async performSync(maxRetries: number, retryDelay: number): Promise<void> {
    if (!this.program || !this.connection) return;

    let retryCount = 0;
    let success = false;

    while (!success && retryCount < maxRetries) {
      try {
        const accounts = await this.program.account.game.all();
        console.log(`📡 Found ${accounts.length} games during sync`);

        // Process each game account
        for (const account of accounts) {
          const gameRoom = account.account as unknown as GameRoom;
          const gameId = gameRoom.gameId.toString();

          // Validate game state
          const validation = await validateGameState(gameRoom, this.currentUserPubkey);

          // Update cache
          await gameCache.setGame(
            gameId,
            gameRoom,
            this.currentUserPubkey,
            { ttl: 30000 } // 30 second TTL for synced data
          );

          // Subscribe to game updates if not already subscribed
          if (validation.isValid && !this.subscriptions.has(gameId)) {
            this.subscribeToGameUpdates(account.publicKey, gameId);
          }

          // Unsubscribe from invalid games
          if (!validation.isValid && this.subscriptions.has(gameId)) {
            const subscriptionId = this.subscriptions.get(gameId)!;
            this.connection.removeAccountChangeListener(subscriptionId);
            this.subscriptions.delete(gameId);
          }
        }

        // Update stats
        this.stats.lastSync = Date.now();
        this.stats.successfulSyncs++;
        this.stats.totalGamesProcessed += accounts.length;
        this.stats.activeSubscriptions = this.subscriptions.size;

        success = true;
        console.log(`✅ Sync completed successfully (${accounts.length} games processed)`);
      } catch (error) {
        console.error(`❌ Sync attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        this.stats.failedSyncs++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!success) {
      console.error(`⚠️ Sync failed after ${maxRetries} attempts`);
    }
  }

  private subscribeToGameUpdates(accountPubkey: PublicKey, gameId: string): void {
    if (!this.connection) return;

    const subscriptionId = this.connection.onAccountChange(
      accountPubkey,
      async (accountInfo) => {
        try {
          if (!this.program) return;

          // Decode updated account data
          const gameRoom = this.program.coder.accounts.decode(
            'Game',
            accountInfo.data
          ) as unknown as GameRoom;

          // Update cache with fresh data
          await gameCache.setGame(
            gameId,
            gameRoom,
            this.currentUserPubkey,
            { forceFresh: true }
          );

          console.log(`📟 Game ${gameId} updated:`, gameRoom.status);

          // Notify subscribers
          this.notifySubscribers(gameId);
        } catch (error) {
          console.error(`Failed to process game ${gameId} update:`, error);
        }
      },
      'confirmed'
    );

    this.subscriptions.set(gameId, subscriptionId);
    console.log(`🔔 Subscribed to updates for game ${gameId}`);
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  // Subscription methods
  subscribe(callback: (gameId: string) => void): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    return id;
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  private notifySubscribers(gameId: string): void {
    this.subscribers.forEach(callback => {
      try {
        callback(gameId);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  isInitialized(): boolean {
    return !!(this.program && this.connection);
  }

  isSyncing(): boolean {
    return !!this.syncInterval;
  }
}

// Export singleton instance
export const gameSyncService = GameSyncService.getInstance();