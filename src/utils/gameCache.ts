import { PublicKey } from '@solana/web3.js';
import { GameRoom } from '../hooks/useAnchorProgram';
import { validateGameState, GameValidation } from './gameValidation';

export interface GameCacheEntry {
  gameData: GameRoom;
  lastVerified: number;
  phase: string;
  status: string;
  expiresAt: number;
  validation?: GameValidation;
}

interface CacheOptions {
  ttl?: number;          // Time-to-live in milliseconds
  forceFresh?: boolean;  // Force a fresh fetch, bypassing cache
}

class GameCache {
  private cache: Map<string, GameCacheEntry> = new Map();
  private static instance: GameCache;
  private readonly defaultTTL = 15000; // 15 seconds default TTL
  private readonly maxCacheSize = 100;  // Maximum number of entries to prevent memory issues

  private constructor() {}

  static getInstance(): GameCache {
    if (!GameCache.instance) {
      GameCache.instance = new GameCache();
    }
    return GameCache.instance;
  }

  async setGame(
    gameId: string,
    gameData: GameRoom,
    currentUserPubkey: PublicKey | null,
    options: CacheOptions = {}
  ): Promise<void> {
    const now = Date.now();
    const ttl = options.ttl || this.defaultTTL;

    // Validate the game state
    const validation = await validateGameState(gameData, currentUserPubkey);

    // Determine the game phase and status
    let phase = 'unknown';
    let status = 'unknown';

    if ('waitingForPlayer' in gameData.status) {
      phase = 'waiting';
      status = 'waiting_for_player';
    } else if ('playersReady' in gameData.status) {
      phase = 'playing';
      status = 'players_ready';
    } else if ('revealingPhase' in gameData.status) {
      phase = 'revealing';
      status = 'revealing';
    } else if ('resolved' in gameData.status) {
      phase = 'completed';
      status = 'resolved';
    }

    // Create cache entry
    const entry: GameCacheEntry = {
      gameData,
      lastVerified: now,
      phase,
      status,
      expiresAt: now + ttl,
      validation,
    };

    // Add to cache
    this.cache.set(gameId, entry);

    // Enforce cache size limit
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastVerified - b.lastVerified)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  getGame(gameId: string): GameCacheEntry | null {
    const entry = this.cache.get(gameId);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(gameId);
      return null;
    }

    return entry;
  }

  getAllGames(): GameCacheEntry[] {
    const now = Date.now();
    const validEntries: GameCacheEntry[] = [];

    for (const [gameId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(gameId);
        continue;
      }
      validEntries.push(entry);
    }

    return validEntries;
  }

  getActiveGames(): GameCacheEntry[] {
    return this.getAllGames().filter(entry => 
      entry.validation?.isValid && 
      entry.validation.status === 'active'
    );
  }

  invalidateGame(gameId: string): void {
    this.cache.delete(gameId);
  }

  clearExpiredEntries(): void {
    const now = Date.now();
    for (const [gameId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(gameId);
      }
    }
  }

  clearAll(): void {
    this.cache.clear();
  }

  // Game state helpers
  isGameActive(gameId: string): boolean {
    const entry = this.getGame(gameId);
    return entry?.validation?.isValid || false;
  }

  getGamePhase(gameId: string): string {
    const entry = this.getGame(gameId);
    return entry?.phase || 'unknown';
  }

  getGameStatus(gameId: string): string {
    const entry = this.getGame(gameId);
    return entry?.status || 'unknown';
  }

  // Cache statistics
  getCacheStats() {
    const now = Date.now();
    const total = this.cache.size;
    const expired = Array.from(this.cache.values()).filter(entry => now > entry.expiresAt).length;
    const active = total - expired;

    return {
      total,
      active,
      expired,
      maxSize: this.maxCacheSize,
    };
  }
}

// Export singleton instance
export const gameCache = GameCache.getInstance();