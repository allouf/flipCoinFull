import { EventEmitter } from 'eventemitter3';
import { VRFAccountManager, VRFAccountConfig } from './VRFAccountManager';
import { getVRFTransactionRetry, VRFTransactionOptions } from './VRFTransactionRetry';
import { getVRFErrorDetector } from './VRFErrorDetector';
import { Connection } from '@solana/web3.js';

// Custom VRF Error Classes
export class VRFTimeoutError extends Error {
  constructor(message: string, public timeoutMs: number) {
    super(message);
    this.name = 'VRFTimeoutError';
  }
}

export class VRFQueueFullError extends Error {
  constructor(message: string, public queueDepth?: number) {
    super(message);
    this.name = 'VRFQueueFullError';
  }
}

export class VRFOracleOfflineError extends Error {
  constructor(message: string, public accountName?: string) {
    super(message);
    this.name = 'VRFOracleOfflineError';
  }
}

export interface VRFRetryConfig {
  timeoutMs: number;
  maxRetries: number;
  exponentialBackoff: boolean;
  baseDelayMs: number;
  maxDelayMs: number;
  rotateAccountsOnFailure: boolean;
  retryableErrorCodes: string[];
}

export interface VRFRetryResult<T = any> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  config: VRFRetryConfig;
  accountsUsed: string[];
}

export interface VRFStatusUpdate {
  status: 'attempting' | 'retrying' | 'failed' | 'completed';
  attempt: number;
  account?: string;
  error?: string;
  timeElapsed: number;
  estimatedWaitTime?: number;
  queuePosition?: number;
  success?: boolean;
}

type VRFFunction<T> = (account: VRFAccountConfig) => Promise<T>;

/**
 * VRFRetryHandler - Handles VRF request timeouts, retries, and account rotation
 * 
 * Features:
 * - Configurable timeout handling (default 10 seconds)
 * - Exponential backoff retry logic (max 3 attempts)
 * - Automatic VRF account rotation on failures
 * - Real-time status updates during processing
 * - Integration with VRFAccountManager for health tracking
 */
export class VRFRetryHandler extends EventEmitter {
  private vrfManager: VRFAccountManager;
  private defaultConfig: VRFRetryConfig;
  private connection: Connection;
  private errorDetector = getVRFErrorDetector();
  private consecutiveFailures: number = 0;

  constructor(vrfManager: VRFAccountManager, connection: Connection) {
    super();
    this.vrfManager = vrfManager;
    this.connection = connection;
    
    this.defaultConfig = {
      timeoutMs: 10000, // 10 seconds
      maxRetries: 3,
      exponentialBackoff: true,
      baseDelayMs: 1000, // 1 second
      maxDelayMs: 30000, // 30 seconds max delay
      rotateAccountsOnFailure: true,
      retryableErrorCodes: [
        'TIMEOUT',
        'NETWORK_ERROR',
        'QUEUE_FULL',
        'ORACLE_OFFLINE',
        'CONNECTION_ERROR',
        'RPC_ERROR',
      ],
    };
  }

  /**
   * Execute a VRF transaction with enhanced retry logic and fresh blockhash handling
   */
  async executeVRFTransactionWithRetry(
    transactionFn: (account: VRFAccountConfig, blockhash: string, lastValidBlockHeight: number) => Promise<any>,
    config?: Partial<VRFRetryConfig>
  ): Promise<VRFRetryResult<any>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    const accountsUsed: string[] = [];
    
    let lastError: Error | null = null;
    let currentAccount: VRFAccountConfig;
    const transactionRetry = getVRFTransactionRetry(this.connection);

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        // Get next VRF account (with intelligent backup selection)
        if (finalConfig.rotateAccountsOnFailure || attempt === 1) {
          if (attempt > 1) {
            // Try to get a backup account after failure
            const backupAccount = this.vrfManager.getBackupAccount(accountsUsed);
            if (backupAccount) {
              currentAccount = backupAccount;
            } else {
              // No backup available, use regular selection
              currentAccount = this.vrfManager.getNextAccount('health-based');
            }
          } else {
            currentAccount = this.vrfManager.getNextAccount('health-based');
          }
          
          if (!accountsUsed.includes(currentAccount.name)) {
            accountsUsed.push(currentAccount.name);
          }
        }

        // Check if we need emergency fallback
        if (this.consecutiveFailures >= 3 && this.vrfManager.requiresEmergencyFallback()) {
          throw new Error(
            'All VRF accounts are failing. Emergency fallback required. ' +
            'Please try again in a few minutes or contact support.'
          );
        }

        // Emit status update
        this.emitStatusUpdate({
          status: attempt === 1 ? 'attempting' : 'retrying',
          attempt,
          account: currentAccount!.name,
          timeElapsed: Date.now() - startTime,
          estimatedWaitTime: this.estimateWaitTime(currentAccount!.name),
        });

        // Execute transaction with comprehensive retry logic
        const transactionOptions: VRFTransactionOptions = {
          maxRetries: 2, // Inner transaction retries (separate from VRF account retries)
          baseRetryDelayMs: 500,
          maxRetryDelayMs: 5000,
          enableFreshBlockhash: true,
          timeoutMs: finalConfig.timeoutMs,
        };

        const result = await transactionRetry.executeVRFTransaction(
          (blockhash, lastValidBlockHeight) => 
            transactionFn(currentAccount!, blockhash, lastValidBlockHeight),
          currentAccount!,
          transactionOptions
        );

        if (result.success) {
          // Success - reset consecutive failures and update account health positively
          this.consecutiveFailures = 0;
          this.errorDetector.clearAccountFailures(currentAccount!.name);
          
          this.vrfManager.updateAccountHealth(currentAccount!.name, {
            isHealthy: true,
            avgResponseTime: result.totalDurationMs,
            successRate: Math.min(
              (this.vrfManager.getAccountHealth(currentAccount!.name)?.successRate || 0.9) + 0.1,
              1.0
            ),
          });

          // Emit success status
          this.emitStatusUpdate({
            status: 'completed',
            attempt,
            account: currentAccount!.name,
            timeElapsed: Date.now() - startTime,
            success: true,
          });

          return {
            success: true,
            result: result.signature,
            attempts: attempt,
            totalDuration: Date.now() - startTime,
            config: finalConfig,
            accountsUsed,
          };
        } else {
          // Transaction failed - handle error
          throw result.error || new Error('Unknown transaction error');
        }

      } catch (error) {
        lastError = error as Error;
        this.consecutiveFailures++;
        
        // Handle account failure using error detection and recovery
        if (currentAccount!) {
          const classification = this.vrfManager.handleAccountFailure(currentAccount.name, lastError);
          
          // Check if we should abort immediately
          if (classification.severity === 'critical' && classification.suggestedAction === 'abort') {
            break;
          }
          
          // Update error detector network health if needed
          if (classification.type === 'network') {
            this.errorDetector.updateNetworkHealth(false);
          }
        }

        // Check if error requires emergency fallback
        if (this.errorDetector.requiresEmergencyFallback(lastError, this.consecutiveFailures)) {
          console.error('Emergency fallback required due to critical VRF system failure');
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt >= finalConfig.maxRetries) {
          break;
        }

        // Wait before retry (with error-classification based delay)
        if (attempt < finalConfig.maxRetries) {
          const delay = this.errorDetector.getRecommendedWaitTime(lastError, attempt);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    this.emitStatusUpdate({
      status: 'failed',
      attempt: finalConfig.maxRetries,
      timeElapsed: Date.now() - startTime,
      error: lastError?.message,
      success: false,
    });

    return {
      success: false,
      error: lastError!,
      attempts: finalConfig.maxRetries,
      totalDuration: Date.now() - startTime,
      config: finalConfig,
      accountsUsed,
    };
  }

  /**
   * Execute a VRF function with retry logic and timeout handling (legacy method)
   */
  async executeWithRetry<T>(
    vrfFunction: VRFFunction<T>,
    config?: Partial<VRFRetryConfig>
  ): Promise<VRFRetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    const accountsUsed: string[] = [];
    
    let lastError: Error | null = null;
    let currentAccount: VRFAccountConfig;

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        // Get next VRF account (rotate on failures if enabled)
        if (finalConfig.rotateAccountsOnFailure || attempt === 1) {
          currentAccount = this.vrfManager.getNextAccount('health-based');
          if (!accountsUsed.includes(currentAccount.name)) {
            accountsUsed.push(currentAccount.name);
          }
        }

        // Emit status update
        this.emitStatusUpdate({
          status: attempt === 1 ? 'attempting' : 'retrying',
          attempt,
          account: currentAccount!.name,
          timeElapsed: Date.now() - startTime,
          estimatedWaitTime: this.estimateWaitTime(currentAccount!.name),
        });

        // Execute with timeout
        const result = await this.executeWithTimeout(
          vrfFunction,
          currentAccount!,
          finalConfig.timeoutMs
        );

        // Success - update account health positively
        this.vrfManager.updateAccountHealth(currentAccount!.name, {
          isHealthy: true,
          avgResponseTime: Date.now() - startTime,
          successRate: Math.min(
            (this.vrfManager.getAccountHealth(currentAccount!.name)?.successRate || 0.9) + 0.1,
            1.0
          ),
        });

        // Emit success status
        this.emitStatusUpdate({
          status: 'completed',
          attempt,
          account: currentAccount!.name,
          timeElapsed: Date.now() - startTime,
          success: true,
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          config: finalConfig,
          accountsUsed,
        };

      } catch (error) {
        lastError = error as Error;
        
        // Update account health negatively
        if (currentAccount!) {
          this.updateAccountHealthOnError(currentAccount.name, error as Error);
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error) || attempt >= finalConfig.maxRetries) {
          break;
        }

        // Wait before retry (with exponential backoff)
        if (attempt < finalConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, finalConfig);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    this.emitStatusUpdate({
      status: 'failed',
      attempt: finalConfig.maxRetries,
      timeElapsed: Date.now() - startTime,
      error: lastError?.message,
      success: false,
    });

    return {
      success: false,
      error: lastError!,
      attempts: finalConfig.maxRetries,
      totalDuration: Date.now() - startTime,
      config: finalConfig,
      accountsUsed,
    };
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: VRFFunction<T>,
    account: VRFAccountConfig,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new VRFTimeoutError(`VRF request timed out after ${timeoutMs}ms`, timeoutMs));
      }, timeoutMs);

      fn(account)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: VRFRetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelayMs;
    }

    // Exponential backoff: baseDelay * 2^(attempt-1)
    const delay = config.baseDelayMs * Math.pow(2, attempt - 1);
    
    // Cap at maxDelayMs
    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // VRF-specific errors that are retryable
    if (error instanceof VRFTimeoutError ||
        error instanceof VRFQueueFullError ||
        error instanceof VRFOracleOfflineError) {
      return true;
    }

    // Check error codes
    const errorCode = (error as any).code;
    if (errorCode && this.defaultConfig.retryableErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check error messages for common retryable patterns
    const retryablePatterns = [
      'timeout',
      'network error',
      'connection',
      'queue full',
      'oracle offline',
      'temporary',
      'rate limit',
      'failure', // Generic failures are retryable
      'failed',
      'error',
    ];

    const errorMessage = error.message.toLowerCase();
    const isRetryable = retryablePatterns.some(pattern => errorMessage.includes(pattern));

    // Default to retryable for most generic errors (be aggressive about retries)
    return isRetryable || !errorCode;
  }

  /**
   * Update account health based on error type
   */
  private updateAccountHealthOnError(accountName: string, error: Error): void {
    const currentHealth = this.vrfManager.getAccountHealth(accountName);
    
    let healthUpdate: any = {
      isHealthy: false,
    };

    if (error instanceof VRFTimeoutError) {
      healthUpdate.avgResponseTime = error.timeoutMs;
    } else if (error instanceof VRFQueueFullError) {
      healthUpdate.queueDepth = error.queueDepth || 999;
    }

    // Decrease success rate
    if (currentHealth) {
      healthUpdate.successRate = Math.max(currentHealth.successRate - 0.1, 0);
    }

    this.vrfManager.updateAccountHealth(accountName, healthUpdate);
  }

  /**
   * Estimate wait time for a VRF account
   */
  private estimateWaitTime(accountName: string): number {
    const health = this.vrfManager.getAccountHealth(accountName);
    if (!health) return 10000; // Default 10 seconds

    // Base estimate on queue depth and average response time
    const baseTime = health.avgResponseTime || 5000;
    const queueMultiplier = Math.max(health.queueDepth / 10, 1);
    
    return Math.round(baseTime * queueMultiplier);
  }

  /**
   * Emit status update event
   */
  private emitStatusUpdate(update: VRFStatusUpdate): void {
    this.emit('statusUpdate', update);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue position for an account (placeholder for future Switchboard integration)
   */
  async getQueuePosition(accountName: string): Promise<number | null> {
    try {
      // TODO: Implement actual Switchboard queue position tracking
      // This would require calling Switchboard's queue APIs
      const health = this.vrfManager.getAccountHealth(accountName);
      return health?.queueDepth || null;
    } catch (error) {
      console.error('Failed to get queue position:', error);
      return null;
    }
  }

  /**
   * Get current retry statistics
   */
  getRetryStats(): {
    totalRequests: number;
    successfulRequests: number;
    avgRetries: number;
    avgDuration: number;
  } {
    // TODO: Implement statistics tracking
    // This would require maintaining counters for requests
    return {
      totalRequests: 0,
      successfulRequests: 0,
      avgRetries: 0,
      avgDuration: 0,
    };
  }
}

// Singleton instance for application-wide use
let vrfRetryHandler: VRFRetryHandler | null = null;

export const getVRFRetryHandler = (vrfManager?: VRFAccountManager, connection?: Connection): VRFRetryHandler => {
  if (!vrfRetryHandler && vrfManager && connection) {
    vrfRetryHandler = new VRFRetryHandler(vrfManager, connection);
  }
  
  if (!vrfRetryHandler) {
    throw new Error('VRFRetryHandler not initialized. Provide VRFAccountManager and Connection on first call.');
  }
  
  return vrfRetryHandler;
};