import { Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { format } from 'date-fns';

export interface GameHistoryRecord {
  id: string;
  signature: string;
  timestamp: Date;
  player1: string;
  player2: string;
  betAmount: number;
  token: string;
  player1Choice: 'heads' | 'tails';
  player2Choice: 'heads' | 'tails';
  result: 'heads' | 'tails';
  winner: string;
  houseFee: number;
  status: 'completed' | 'pending' | 'cancelled';
  blockNumber: number;
  programAccount: string;
}

export interface GameHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  outcome?: 'wins' | 'losses' | 'all';
  minAmount?: number;
  maxAmount?: number;
  token?: string;
  opponent?: string;
}

export interface GameHistoryStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  netProfit: number;
  totalVolume: number;
  averageBet: number;
  largestWin: number;
  largestLoss: number;
  currentStreak: number;
  bestStreak: number;
  worstStreak: number;
  gamesThisWeek: number;
  gamesLastWeek: number;
  profitThisWeek: number;
  profitLastWeek: number;
}

export interface PaginatedGameHistory {
  data: GameHistoryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  stats: GameHistoryStats;
}

export class GameHistoryService {
  private connection: Connection;

  private program?: Program;

  private userPublicKey?: PublicKey;

  private cache: Map<string, any> = new Map();

  private dbName = 'CoinFlipperDB';

  private dbVersion = 1;

  private db?: IDBDatabase;

  constructor(connection: Connection, program?: Program) {
    this.connection = connection;
    this.program = program;
    this.initIndexedDB();
  }

  setUserPublicKey(publicKey: PublicKey | null) {
    this.userPublicKey = publicKey || undefined;
    // Clear cache when user changes
    this.cache.clear();
  }

  setProgram(program: Program) {
    this.program = program;
  }

  /**
   * Initialize IndexedDB for offline caching
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create game history store
        if (!db.objectStoreNames.contains('gameHistory')) {
          const historyStore = db.createObjectStore('gameHistory', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp');
          historyStore.createIndex('player', 'player');
          historyStore.createIndex('signature', 'signature', { unique: true });
        }

        // Create cache store for API responses
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Fetch paginated game history for the current user
   * TODO: Implement actual RPC calls to fetch game data
   */
  async getGameHistory(
    filters: GameHistoryFilters = {},
    page = 1,
    limit = 50,
  ): Promise<PaginatedGameHistory> {
    if (!this.userPublicKey) {
      throw new Error('User public key not set');
    }

    const cacheKey = this.generateCacheKey('gameHistory', filters, page, limit);

    // Try to get from memory cache first
    const cachedData = this.cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 30000) {
      return cachedData.data;
    }

    try {
      // TODO: Implement actual data fetching from Solana program accounts
      const data = await this.fetchGameHistoryFromRPC(filters, page, limit);

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // Store in IndexedDB for offline access
      await this.storeInIndexedDB('cache', { key: cacheKey, data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error('Failed to fetch game history:', error);

      // Try to get from IndexedDB cache
      const cachedFromDB = await this.getFromIndexedDB('cache', cacheKey);
      if (cachedFromDB) {
        return cachedFromDB.data;
      }

      throw error;
    }
  }

  /**
   * Fetch game history from Solana RPC using getProgramAccounts
   * TODO: Implement actual RPC calls with proper filters
   */
  private async fetchGameHistoryFromRPC(
    filters: GameHistoryFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedGameHistory> {
    if (!this.program || !this.userPublicKey) {
      throw new Error('Program or user public key not available');
    }

    // TODO: Implement actual program account fetching
    // This is a placeholder implementation
    const mockData: GameHistoryRecord[] = [
      {
        id: '1',
        signature: '5KJp7z8w2Ev3...abc123',
        timestamp: new Date('2025-09-01T10:00:00Z'),
        player1: this.userPublicKey.toString(),
        player2: 'BXt7z8w2Ev3...def456',
        betAmount: 0.1,
        token: 'SOL',
        player1Choice: 'heads',
        player2Choice: 'tails',
        result: 'heads',
        winner: this.userPublicKey.toString(),
        houseFee: 0.003,
        status: 'completed',
        blockNumber: 123456789,
        programAccount: 'program123...abc',
      },
      // TODO: Add more mock data or replace with real data fetching
    ];

    const stats = this.calculateStats(mockData, this.userPublicKey.toString());

    return {
      data: mockData.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: mockData.length,
        hasMore: page * limit < mockData.length,
      },
      stats,
    };
  }

  /**
   * Calculate comprehensive statistics from game history data
   */
  private calculateStats(games: GameHistoryRecord[], playerAddress: string): GameHistoryStats {
    if (games.length === 0) {
      return {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        netProfit: 0,
        totalVolume: 0,
        averageBet: 0,
        largestWin: 0,
        largestLoss: 0,
        currentStreak: 0,
        bestStreak: 0,
        worstStreak: 0,
        gamesThisWeek: 0,
        gamesLastWeek: 0,
        profitThisWeek: 0,
        profitLastWeek: 0,
      };
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let totalWins = 0;
    let totalLosses = 0;
    let netProfit = 0;
    let totalVolume = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let tempStreak = 0;
    let gamesThisWeek = 0;
    let gamesLastWeek = 0;
    let profitThisWeek = 0;
    let profitLastWeek = 0;

    // Sort games by timestamp (newest first)
    const sortedGames = [...games].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    sortedGames.forEach((game, index) => {
      const isWin = game.winner === playerAddress;
      const gameProfit = isWin ? game.betAmount - game.houseFee : -game.betAmount;

      // Basic stats
      if (isWin) {
        totalWins++;
        largestWin = Math.max(largestWin, gameProfit);
      } else {
        totalLosses++;
        largestLoss = Math.min(largestLoss, gameProfit);
      }

      netProfit += gameProfit;
      totalVolume += game.betAmount;

      // Streak calculation
      if (index === 0) {
        currentStreak = isWin ? 1 : -1;
        tempStreak = currentStreak;
      } else if ((isWin && tempStreak > 0) || (!isWin && tempStreak < 0)) {
        tempStreak += isWin ? 1 : -1;
        if (index === 0) currentStreak = tempStreak;
      } else {
        if (tempStreak > 0) {
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          worstStreak = Math.min(worstStreak, tempStreak);
        }
        tempStreak = isWin ? 1 : -1;
      }

      // Time-based stats
      if (game.timestamp >= oneWeekAgo) {
        gamesThisWeek++;
        profitThisWeek += gameProfit;
      } else if (game.timestamp >= twoWeeksAgo) {
        gamesLastWeek++;
        profitLastWeek += gameProfit;
      }
    });

    // Final streak updates
    if (tempStreak > 0) {
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      worstStreak = Math.min(worstStreak, tempStreak);
    }

    return {
      totalGames: games.length,
      totalWins,
      totalLosses,
      winRate: totalWins / games.length,
      netProfit,
      totalVolume,
      averageBet: totalVolume / games.length,
      largestWin,
      largestLoss,
      currentStreak,
      bestStreak,
      worstStreak,
      gamesThisWeek,
      gamesLastWeek,
      profitThisWeek,
      profitLastWeek,
    };
  }

  /**
   * Export game history data to CSV format
   */
  async exportToCSV(
    filters: GameHistoryFilters = {},
    filename?: string,
  ): Promise<string> {
    const allData: GameHistoryRecord[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all pages
    while (hasMore) {
      const result = await this.getGameHistory(filters, page, 1000);
      allData.push(...result.data);
      hasMore = result.pagination.hasMore;
      page++;
    }

    // TODO: Use papaparse to generate CSV
    // This is a placeholder implementation
    const csvHeaders = [
      'Date', 'Opponent', 'Amount', 'Token', 'Your Choice', 'Result',
      'Outcome', 'Profit/Loss', 'Transaction Signature',
    ];

    const csvRows = allData.map((game) => [
      format(game.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      game.player1 === this.userPublicKey?.toString() ? game.player2 : game.player1,
      game.betAmount.toString(),
      game.token,
      game.player1 === this.userPublicKey?.toString() ? game.player1Choice : game.player2Choice,
      game.result,
      game.winner === this.userPublicKey?.toString() ? 'Win' : 'Loss',
      (game.winner === this.userPublicKey?.toString() ? game.betAmount - game.houseFee : -game.betAmount).toString(),
      game.signature,
    ]);

    return [csvHeaders, ...csvRows].map((row) => row.join(',')).join('\n');
  }

  /**
   * Export game history data to JSON format
   */
  async exportToJSON(
    filters: GameHistoryFilters = {},
    filename?: string,
  ): Promise<string> {
    const allData: GameHistoryRecord[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all pages
    while (hasMore) {
      const result = await this.getGameHistory(filters, page, 1000);
      allData.push(...result.data);
      hasMore = result.pagination.hasMore;
      page++;
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      filters,
      totalRecords: allData.length,
      data: allData,
    }, null, 2);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();

    // Clear IndexedDB cache
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      transaction.objectStore('cache').clear();
    }
  }

  /**
   * Generate cache key for consistent caching
   */
  private generateCacheKey(
    type: string,
    filters: GameHistoryFilters,
    page: number,
    limit: number,
  ): string {
    const filterString = JSON.stringify(filters);
    return `${type}_${this.userPublicKey?.toString()}_${filterString}_${page}_${limit}`;
  }

  /**
   * Store data in IndexedDB
   */
  private async storeInIndexedDB(storeName: string, data: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from IndexedDB
   */
  private async getFromIndexedDB(storeName: string, key: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
let gameHistoryService: GameHistoryService | null = null;

export const getGameHistoryService = (connection: Connection, program?: Program): GameHistoryService => {
  if (!gameHistoryService) {
    gameHistoryService = new GameHistoryService(connection, program);
  } else if (program) {
    gameHistoryService.setProgram(program);
  }
  return gameHistoryService;
};
