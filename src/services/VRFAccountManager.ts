import { PublicKey, Connection } from '@solana/web3.js';
import { VrfAccount, SwitchboardProgram } from '@switchboard-xyz/solana.js';
import { getVRFErrorDetector, VRFErrorClassification } from './VRFErrorDetector';

export interface VRFAccountConfig {
  publicKey: PublicKey;
  name: string;
  priority: number;
}

export interface VRFAccountHealth {
  isHealthy: boolean;
  queueDepth: number;
  avgResponseTime: number;
  successRate: number;
  lastUpdated: number;
}

export interface VRFHealthThresholds {
  maxQueueDepth: number;
  maxResponseTime: number; // milliseconds
  minSuccessRate: number; // 0.0 - 1.0
}

export interface VRFHealthStats {
  healthyAccounts: number;
  totalAccounts: number;
  avgResponseTime: number;
  avgSuccessRate: number;
}

export type SelectionStrategy = 'round-robin' | 'health-based';

export class VRFAccountManager {
  private accounts: VRFAccountConfig[];
  private healthData: Map<string, VRFAccountHealth>;
  private roundRobinIndex: number;
  private thresholds: VRFHealthThresholds;
  private quarantinedAccounts: Set<string>;
  private errorDetector = getVRFErrorDetector();

  constructor(
    accounts: VRFAccountConfig[],
    thresholds?: Partial<VRFHealthThresholds>
  ) {
    this.accounts = accounts.sort((a, b) => a.priority - b.priority);
    this.healthData = new Map();
    this.roundRobinIndex = 0;
    this.quarantinedAccounts = new Set();
    
    // Set default thresholds
    this.thresholds = {
      maxQueueDepth: 20,
      maxResponseTime: 10000, // 10 seconds
      minSuccessRate: 0.90,
      ...thresholds,
    };

    // Initialize all accounts as healthy
    this.accounts.forEach(account => {
      this.healthData.set(account.name, {
        isHealthy: true,
        queueDepth: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        lastUpdated: Date.now(),
      });
    });
  }

  /**
   * Get the next VRF account using the specified strategy
   */
  getNextAccount(strategy: SelectionStrategy = 'health-based'): VRFAccountConfig {
    if (strategy === 'round-robin') {
      return this.getRoundRobinAccount();
    }
    
    return this.getHealthBasedAccount();
  }

  /**
   * Get account using round-robin selection
   */
  private getRoundRobinAccount(): VRFAccountConfig {
    const account = this.accounts[this.roundRobinIndex];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % this.accounts.length;
    return account;
  }

  /**
   * Get account using health-based selection
   */
  private getHealthBasedAccount(): VRFAccountConfig {
    // Filter healthy accounts
    const healthyAccounts = this.accounts.filter(account => {
      const health = this.healthData.get(account.name);
      return health?.isHealthy ?? false;
    });

    if (healthyAccounts.length === 0) {
      // Fallback to round-robin if no healthy accounts
      return this.getRoundRobinAccount();
    }

    // Sort by performance metrics (lower queue depth, faster response, higher success rate)
    const sortedAccounts = healthyAccounts.sort((a, b) => {
      const healthA = this.healthData.get(a.name)!;
      const healthB = this.healthData.get(b.name)!;

      // Calculate composite score (lower is better)
      const scoreA = this.calculateHealthScore(healthA);
      const scoreB = this.calculateHealthScore(healthB);

      return scoreA - scoreB;
    });

    return sortedAccounts[0];
  }

  /**
   * Calculate health score for account ranking (lower is better)
   */
  private calculateHealthScore(health: VRFAccountHealth): number {
    // Normalize metrics to 0-1 scale
    const queueScore = Math.min(health.queueDepth / this.thresholds.maxQueueDepth, 1);
    const responseScore = Math.min(health.avgResponseTime / this.thresholds.maxResponseTime, 1);
    const successScore = 1 - health.successRate; // Invert so lower is better

    // Weighted combination
    return (queueScore * 0.4) + (responseScore * 0.4) + (successScore * 0.2);
  }

  /**
   * Update health data for a specific account
   */
  updateAccountHealth(accountName: string, health: Partial<VRFAccountHealth>): void {
    const currentHealth = this.healthData.get(accountName) || {
      isHealthy: true,
      queueDepth: 0,
      avgResponseTime: 0,
      successRate: 1.0,
      lastUpdated: Date.now(),
    };

    const updatedHealth: VRFAccountHealth = {
      ...currentHealth,
      ...health,
      lastUpdated: Date.now(),
    };

    // Determine if account is healthy based on thresholds
    updatedHealth.isHealthy = this.isAccountHealthy(updatedHealth);

    this.healthData.set(accountName, updatedHealth);
  }

  /**
   * Check if account meets health thresholds
   */
  private isAccountHealthy(health: VRFAccountHealth): boolean {
    return (
      health.queueDepth <= this.thresholds.maxQueueDepth &&
      health.avgResponseTime <= this.thresholds.maxResponseTime &&
      health.successRate >= this.thresholds.minSuccessRate
    );
  }

  /**
   * Get health data for a specific account
   */
  getAccountHealth(accountName: string): VRFAccountHealth | null {
    return this.healthData.get(accountName) || null;
  }

  /**
   * Get all configured accounts
   */
  getAllAccounts(): VRFAccountConfig[] {
    return [...this.accounts];
  }

  /**
   * Get account by name
   */
  getAccountByName(name: string): VRFAccountConfig | null {
    return this.accounts.find(account => account.name === name) || null;
  }

  /**
   * Get overall health statistics
   */
  getHealthStats(): VRFHealthStats {
    const healthyCount = Array.from(this.healthData.values())
      .filter(health => health.isHealthy).length;

    const totalResponseTime = Array.from(this.healthData.values())
      .reduce((sum, health) => sum + health.avgResponseTime, 0);

    const totalSuccessRate = Array.from(this.healthData.values())
      .reduce((sum, health) => sum + health.successRate, 0);

    const accountCount = this.healthData.size;

    return {
      healthyAccounts: healthyCount,
      totalAccounts: accountCount,
      avgResponseTime: accountCount > 0 ? totalResponseTime / accountCount : 0,
      avgSuccessRate: accountCount > 0 ? totalSuccessRate / accountCount : 0,
    };
  }

  /**
   * Check VRF account queue status using Switchboard SDK
   */
  async checkAccountQueue(
    connection: Connection,
    accountName: string
  ): Promise<{ queueDepth: number; isActive: boolean } | null> {
    try {
      const account = this.getAccountByName(accountName);
      if (!account) {
        return null;
      }

      // Create a Switchboard program instance
      const program = await SwitchboardProgram.fromConnection(connection);
      // VrfAccount.load returns a tuple [VrfAccount, VrfAccountData]
      const [vrfAccountInstance, vrfAccountData] = await VrfAccount.load(program, account.publicKey);
      const queueDepth = 0; // queueDepth not available in VrfAccountData
      const isActive = vrfAccountData?.status !== undefined || false;

      // Update health data with fresh queue information
      this.updateAccountHealth(accountName, { queueDepth });

      return { queueDepth, isActive };
    } catch (error) {
      console.error(`Failed to check queue for VRF account ${accountName}:`, error);
      
      // Mark account as unhealthy on error
      this.updateAccountHealth(accountName, {
        isHealthy: false,
        queueDepth: 999, // High number to indicate problem
      });

      return null;
    }
  }

  /**
   * Batch check all VRF account queues
   */
  async checkAllAccountQueues(connection: Connection): Promise<void> {
    const promises = this.accounts.map(account =>
      this.checkAccountQueue(connection, account.name)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get the next best account with queue check
   */
  async getNextAccountWithQueueCheck(
    connection: Connection,
    strategy: SelectionStrategy = 'health-based'
  ): Promise<VRFAccountConfig> {
    // First, update queue information for all accounts
    await this.checkAllAccountQueues(connection);
    
    // Then select using updated health data
    return this.getNextAccount(strategy);
  }

  /**
   * Handle VRF account failure and apply error-based recovery
   */
  handleAccountFailure(accountName: string, error: Error): VRFErrorClassification {
    const classification = this.errorDetector.classifyError(error, accountName);
    
    // Update account health based on error
    this.updateAccountHealthOnError(accountName, error, classification);
    
    // Quarantine account if critically problematic
    if (classification.severity === 'critical' || 
        this.errorDetector.getAccountFailureCount(accountName) >= 3) {
      this.quarantineAccount(accountName, classification.waitTimeMs || 300000); // 5 min default
      console.warn(`Account ${accountName} quarantined due to repeated failures`);
    }
    
    return classification;
  }

  /**
   * Quarantine an account temporarily to avoid repeated failures
   */
  quarantineAccount(accountName: string, durationMs: number): void {
    this.quarantinedAccounts.add(accountName);
    
    // Auto-release after duration
    setTimeout(() => {
      this.quarantinedAccounts.delete(accountName);
      this.errorDetector.clearAccountFailures(accountName);
      console.log(`Account ${accountName} released from quarantine`);
    }, durationMs);
  }

  /**
   * Get backup account excluding quarantined and problematic accounts
   */
  getBackupAccount(excludeAccounts: string[] = []): VRFAccountConfig | null {
    const availableAccounts = this.accounts.filter(account => {
      // Exclude quarantined accounts
      if (this.quarantinedAccounts.has(account.name)) return false;
      
      // Exclude specifically requested accounts
      if (excludeAccounts.includes(account.name)) return false;
      
      // Exclude accounts with high failure rates
      const failureCount = this.errorDetector.getAccountFailureCount(account.name);
      if (failureCount >= 2) return false;
      
      return true;
    });

    if (availableAccounts.length === 0) {
      console.warn('No backup VRF accounts available - all are quarantined or failing');
      return null;
    }

    // Return the healthiest available account
    availableAccounts.sort((a, b) => {
      const healthA = this.getAccountHealth(a.name);
      const healthB = this.getAccountHealth(b.name);
      
      if (!healthA && !healthB) return a.priority - b.priority;
      if (!healthA) return 1;
      if (!healthB) return -1;
      
      // Sort by success rate, then response time, then priority
      const successDiff = healthB.successRate - healthA.successRate;
      if (Math.abs(successDiff) > 0.1) return successDiff;
      
      const timeDiff = healthA.avgResponseTime - healthB.avgResponseTime;
      if (Math.abs(timeDiff) > 1000) return timeDiff;
      
      return a.priority - b.priority;
    });

    return availableAccounts[0];
  }

  /**
   * Update account health based on error classification
   */
  private updateAccountHealthOnError(
    accountName: string, 
    error: Error, 
    classification: VRFErrorClassification
  ): void {
    const currentHealth = this.getAccountHealth(accountName) || {
      isHealthy: true,
      queueDepth: 0,
      avgResponseTime: 5000,
      successRate: 1.0,
      lastUpdated: Date.now(),
    };

    let healthUpdate: Partial<VRFAccountHealth> = {
      isHealthy: false,
      lastUpdated: Date.now(),
    };

    // Adjust health metrics based on error type
    switch (classification.type) {
      case 'timeout':
        healthUpdate.avgResponseTime = Math.min(
          currentHealth.avgResponseTime * 1.5,
          30000
        );
        break;
      
      case 'queue_full':
        healthUpdate.queueDepth = Math.max(currentHealth.queueDepth + 5, 25);
        break;
      
      case 'oracle_offline':
        healthUpdate.successRate = Math.max(currentHealth.successRate * 0.5, 0.1);
        break;
      
      case 'account_invalid':
        healthUpdate.successRate = 0;
        healthUpdate.isHealthy = false;
        break;
      
      default:
        // Generic error handling
        healthUpdate.successRate = Math.max(currentHealth.successRate - 0.1, 0.2);
    }

    this.updateAccountHealth(accountName, healthUpdate);
  }

  /**
   * Check if emergency fallback is needed (all accounts failing)
   */
  requiresEmergencyFallback(): boolean {
    const healthyAccounts = this.accounts.filter(account => {
      if (this.quarantinedAccounts.has(account.name)) return false;
      
      const health = this.getAccountHealth(account.name);
      return health?.isHealthy && health.successRate > 0.3;
    });

    // Emergency if less than 2 healthy accounts available
    return healthyAccounts.length < 2;
  }

  /**
   * Get summary of current account states for debugging
   */
  getAccountStatusSummary(): {
    healthy: string[];
    quarantined: string[];
    failing: string[];
    total: number;
  } {
    const healthy: string[] = [];
    const failing: string[] = [];
    
    this.accounts.forEach(account => {
      const health = this.getAccountHealth(account.name);
      if (this.quarantinedAccounts.has(account.name)) {
        return; // Will be in quarantined list
      }
      
      if (health?.isHealthy && health.successRate > 0.5) {
        healthy.push(account.name);
      } else {
        failing.push(account.name);
      }
    });

    return {
      healthy,
      quarantined: Array.from(this.quarantinedAccounts),
      failing,
      total: this.accounts.length,
    };
  }
}

// Singleton instance for application-wide use
let vrfAccountManager: VRFAccountManager | null = null;

export const getVRFAccountManager = (
  accounts?: VRFAccountConfig[],
  thresholds?: Partial<VRFHealthThresholds>
): VRFAccountManager => {
  if (!vrfAccountManager && accounts) {
    vrfAccountManager = new VRFAccountManager(accounts, thresholds);
  }
  
  if (!vrfAccountManager) {
    throw new Error('VRFAccountManager not initialized. Provide accounts on first call.');
  }
  
  return vrfAccountManager;
};