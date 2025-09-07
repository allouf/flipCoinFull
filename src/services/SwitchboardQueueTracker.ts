import { Connection, PublicKey } from '@solana/web3.js';
import { VrfAccount, SwitchboardProgram } from '@switchboard-xyz/solana.js';

export interface SwitchboardQueueInfo {
  publicKey: PublicKey;
  authority: PublicKey;
  queueSize: number;
  currentSize: number;
  unpermissionedFeeds: boolean;
  maxSize: number;
  reward: number;
  minStake: number;
}

export interface VRFRequestInfo {
  publicKey: PublicKey;
  vrf: PublicKey;
  requestSlot: number;
  requestTimestamp: number;
  alphaBytes: Uint8Array;
  callback: {
    programId: PublicKey;
    accounts: PublicKey[];
    instruction: Uint8Array;
  };
}

export interface VRFQueuePosition {
  position: number;
  estimatedWaitTimeMs: number;
  queueSize: number;
  isActive: boolean;
}

/**
 * SwitchboardQueueTracker - Tracks VRF queue positions and wait times
 * 
 * Features:
 * - Real-time queue position tracking
 * - Wait time estimation based on historical data
 * - Queue health monitoring
 * - Integration with VRF account management
 */
export class SwitchboardQueueTracker {
  private connection: Connection;
  private queueInfoCache: Map<string, { info: SwitchboardQueueInfo; lastUpdate: number }>;
  private waitTimeHistory: Map<string, number[]>; // Historical wait times for estimation
  private readonly cacheTimeout = 30000; // 30 seconds
  private readonly historySize = 20; // Keep last 20 wait times

  constructor(connection: Connection) {
    this.connection = connection;
    this.queueInfoCache = new Map();
    this.waitTimeHistory = new Map();
  }

  /**
   * Get queue position for a VRF account
   */
  async getQueuePosition(vrfAccountPubkey: PublicKey): Promise<VRFQueuePosition | null> {
    try {
      // Load VRF account to get queue information
      // Create a Switchboard program instance
      const program = await SwitchboardProgram.fromConnection(this.connection);
      // VrfAccount.load returns a tuple [VrfAccount, VrfAccountData]
      const [vrfAccountInstance, vrfAccountData] = await VrfAccount.load(program, vrfAccountPubkey);
      
      if (!vrfAccountInstance || !vrfAccountData || !vrfAccountData.oracleQueue) {
        console.warn('VRF account not found or no queue assigned');
        return null;
      }

      // Get queue information
      const queueInfo = await this.getQueueInfo(vrfAccountData.oracleQueue);
      if (!queueInfo) {
        return null;
      }

      // Get current position in queue
      const position = await this.calculateQueuePosition([vrfAccountInstance, vrfAccountData]);
      const estimatedWaitTime = this.estimateWaitTime(vrfAccountData.oracleQueue.toString(), position, queueInfo);

      return {
        position,
        estimatedWaitTimeMs: estimatedWaitTime,
        queueSize: queueInfo.currentSize,
        isActive: vrfAccountData.status !== undefined || false,
      };

    } catch (error) {
      console.error('Failed to get queue position:', error);
      return null;
    }
  }

  /**
   * Get detailed queue information
   */
  async getQueueInfo(queuePubkey: PublicKey): Promise<SwitchboardQueueInfo | null> {
    const cacheKey = queuePubkey.toString();
    const cached = this.queueInfoCache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.lastUpdate < this.cacheTimeout) {
      return cached.info;
    }

    try {
      // TODO: Implement actual Switchboard queue data fetching
      // This would use the Switchboard SDK to get queue account data
      
      // Placeholder implementation
      const queueInfo: SwitchboardQueueInfo = {
        publicKey: queuePubkey,
        authority: new PublicKey('11111111111111111111111111111111'), // Placeholder
        queueSize: 100,
        currentSize: Math.floor(Math.random() * 50), // Simulated current size
        unpermissionedFeeds: true,
        maxSize: 100,
        reward: 0.001,
        minStake: 0.1,
      };

      // Cache the result
      this.queueInfoCache.set(cacheKey, {
        info: queueInfo,
        lastUpdate: Date.now(),
      });

      return queueInfo;

    } catch (error) {
      console.error('Failed to fetch queue info:', error);
      return null;
    }
  }

  /**
   * Calculate position in queue for a VRF account
   */
  private async calculateQueuePosition(vrfAccount: any): Promise<number> {
    try {
      // TODO: Implement actual queue position calculation
      // This would involve fetching the VRF request queue and finding our position
      
      // For now, simulate based on timestamp and randomness
      const basePosition = Math.floor(Math.random() * 20) + 1;
      
      // Adjust based on VRF account state
      if (!vrfAccount.isActive) {
        return 0; // Not in queue
      }

      return basePosition;

    } catch (error) {
      console.error('Failed to calculate queue position:', error);
      return -1; // Error state
    }
  }

  /**
   * Estimate wait time based on queue position and historical data
   */
  private estimateWaitTime(queueKey: string, position: number, queueInfo: SwitchboardQueueInfo): number {
    if (position <= 0) return 0;

    // Get historical wait times for this queue
    const history = this.waitTimeHistory.get(queueKey) || [];
    
    // Base estimate: assume each position takes 2-5 seconds to process
    const baseTimePerPosition = 3000; // 3 seconds average
    let estimatedTime = position * baseTimePerPosition;

    // Adjust based on historical data
    if (history.length > 0) {
      const avgHistoricalTime = history.reduce((sum, time) => sum + time, 0) / history.length;
      // Weight: 70% historical data, 30% base estimate
      estimatedTime = (avgHistoricalTime * 0.7) + (estimatedTime * 0.3);
    }

    // Apply queue congestion factor
    const congestionFactor = queueInfo.currentSize / queueInfo.maxSize;
    if (congestionFactor > 0.7) {
      estimatedTime *= (1 + congestionFactor); // Increase wait time for congested queues
    }

    return Math.round(estimatedTime);
  }

  /**
   * Record actual wait time for improving estimates
   */
  recordWaitTime(queueKey: string, actualWaitTimeMs: number): void {
    const history = this.waitTimeHistory.get(queueKey) || [];
    history.push(actualWaitTimeMs);

    // Keep only recent history
    if (history.length > this.historySize) {
      history.splice(0, history.length - this.historySize);
    }

    this.waitTimeHistory.set(queueKey, history);
  }

  /**
   * Get queue health metrics
   */
  async getQueueHealth(queuePubkey: PublicKey): Promise<{
    status: 'healthy' | 'congested' | 'critical';
    utilizationPercent: number;
    avgWaitTime: number;
    recommendedAction: string;
  } | null> {
    const queueInfo = await this.getQueueInfo(queuePubkey);
    if (!queueInfo) return null;

    const utilizationPercent = (queueInfo.currentSize / queueInfo.maxSize) * 100;
    const history = this.waitTimeHistory.get(queuePubkey.toString()) || [];
    const avgWaitTime = history.length > 0 
      ? history.reduce((sum, time) => sum + time, 0) / history.length 
      : 0;

    let status: 'healthy' | 'congested' | 'critical' = 'healthy';
    let recommendedAction = 'Queue is operating normally';

    if (utilizationPercent > 90) {
      status = 'critical';
      recommendedAction = 'Queue is severely congested. Consider using alternative VRF accounts.';
    } else if (utilizationPercent > 70 || avgWaitTime > 15000) {
      status = 'congested';
      recommendedAction = 'Queue is experiencing delays. Monitor wait times closely.';
    }

    return {
      status,
      utilizationPercent: Math.round(utilizationPercent),
      avgWaitTime: Math.round(avgWaitTime),
      recommendedAction,
    };
  }

  /**
   * Find the best available queue from multiple options
   */
  async findBestQueue(queuePubkeys: PublicKey[]): Promise<{
    queue: PublicKey;
    estimatedWaitTime: number;
    reason: string;
  } | null> {
    const queueAnalysis = await Promise.all(
      queuePubkeys.map(async (queue) => {
        const info = await this.getQueueInfo(queue);
        const health = await this.getQueueHealth(queue);
        
        if (!info || !health) {
          return null;
        }

        return {
          queue,
          info,
          health,
          score: this.calculateQueueScore(info, health),
        };
      })
    );

    const validQueues = queueAnalysis.filter(q => q !== null);
    if (validQueues.length === 0) {
      return null;
    }

    // Sort by score (higher is better)
    validQueues.sort((a, b) => b!.score - a!.score);
    const best = validQueues[0]!;

    return {
      queue: best.queue,
      estimatedWaitTime: best.health.avgWaitTime,
      reason: this.getSelectionReason(best.health, best.info),
    };
  }

  /**
   * Calculate queue score for selection (higher is better)
   */
  private calculateQueueScore(info: SwitchboardQueueInfo, health: any): number {
    let score = 100;

    // Penalize high utilization
    score -= health.utilizationPercent * 0.5;

    // Penalize long wait times
    score -= (health.avgWaitTime / 1000) * 2;

    // Prefer healthy status
    if (health.status === 'critical') score -= 30;
    else if (health.status === 'congested') score -= 15;

    return Math.max(score, 0);
  }

  /**
   * Get human-readable reason for queue selection
   */
  private getSelectionReason(health: any, info: SwitchboardQueueInfo): string {
    if (health.status === 'healthy') {
      return 'Queue is healthy with low wait times';
    } else if (health.status === 'congested') {
      return `Queue is congested (${health.utilizationPercent}% full) but still viable`;
    } else {
      return `Best available option despite ${health.utilizationPercent}% utilization`;
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.queueInfoCache.clear();
    this.waitTimeHistory.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    queuesCached: number;
    historicalDataPoints: number;
    oldestCacheEntry: number | null;
  } {
    let oldestEntry: number | null = null;
    let totalDataPoints = 0;

    for (const [, data] of this.queueInfoCache) {
      if (!oldestEntry || data.lastUpdate < oldestEntry) {
        oldestEntry = data.lastUpdate;
      }
    }

    for (const [, history] of this.waitTimeHistory) {
      totalDataPoints += history.length;
    }

    return {
      queuesCached: this.queueInfoCache.size,
      historicalDataPoints: totalDataPoints,
      oldestCacheEntry: oldestEntry,
    };
  }
}

// Singleton instance for application-wide use
let switchboardQueueTracker: SwitchboardQueueTracker | null = null;

export const getSwitchboardQueueTracker = (connection?: Connection): SwitchboardQueueTracker => {
  if (!switchboardQueueTracker && connection) {
    switchboardQueueTracker = new SwitchboardQueueTracker(connection);
  }
  
  if (!switchboardQueueTracker) {
    throw new Error('SwitchboardQueueTracker not initialized. Provide connection on first call.');
  }
  
  return switchboardQueueTracker;
};