import { VRFTimeoutError, VRFQueueFullError, VRFOracleOfflineError } from './VRFRetryHandler';
import { Connection } from '@solana/web3.js';

export interface VRFErrorClassification {
  type: 'timeout' | 'queue_full' | 'oracle_offline' | 'network' | 'account_invalid' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  suggestedAction: 'retry' | 'switch_account' | 'fallback' | 'abort';
  waitTimeMs?: number;
  message: string;
}

export interface VRFErrorPattern {
  pattern: RegExp | string;
  classification: VRFErrorClassification;
}

/**
 * VRFErrorDetector - Advanced error classification and recovery recommendations
 * 
 * Features:
 * - Pattern-based error classification for Switchboard VRF errors
 * - Severity assessment and recovery action recommendations
 * - Network condition awareness for smarter retry decisions
 * - Integration with account health management
 */
export class VRFErrorDetector {
  private errorPatterns: VRFErrorPattern[] = [];
  private networkHealthCache: { timestamp: number; isHealthy: boolean } | null = null;
  private accountFailureTracker: Map<string, { count: number; lastFailure: number }> = new Map();

  constructor() {
    this.initializeErrorPatterns();
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      // Timeout-related errors
      {
        pattern: /timeout|timed out|request timeout/i,
        classification: {
          type: 'timeout',
          severity: 'medium',
          isRetryable: true,
          suggestedAction: 'retry',
          waitTimeMs: 2000,
          message: 'VRF request timed out. Retrying with different account...',
        },
      },
      
      // Queue congestion errors
      {
        pattern: /queue.*full|queue.*congested|too many requests/i,
        classification: {
          type: 'queue_full',
          severity: 'high',
          isRetryable: true,
          suggestedAction: 'switch_account',
          waitTimeMs: 5000,
          message: 'VRF queue is congested. Switching to less busy account...',
        },
      },
      
      // Oracle offline/maintenance
      {
        pattern: /oracle.*offline|oracle.*unavailable|maintenance/i,
        classification: {
          type: 'oracle_offline',
          severity: 'critical',
          isRetryable: true,
          suggestedAction: 'switch_account',
          waitTimeMs: 10000,
          message: 'VRF oracle is offline. Trying backup account...',
        },
      },
      
      // Network connectivity issues
      {
        pattern: /network|connection|fetch.*failed|rpc.*error/i,
        classification: {
          type: 'network',
          severity: 'medium',
          isRetryable: true,
          suggestedAction: 'retry',
          waitTimeMs: 1000,
          message: 'Network connectivity issue. Retrying...',
        },
      },
      
      // Account validation errors
      {
        pattern: /invalid.*account|account.*not.*found|unauthorized/i,
        classification: {
          type: 'account_invalid',
          severity: 'high',
          isRetryable: true,
          suggestedAction: 'switch_account',
          waitTimeMs: 0,
          message: 'VRF account is invalid or unauthorized. Switching account...',
        },
      },
      
      // Switchboard-specific errors
      {
        pattern: /switchboard.*error|vrf.*error|random.*generation.*failed/i,
        classification: {
          type: 'oracle_offline',
          severity: 'high',
          isRetryable: true,
          suggestedAction: 'switch_account',
          waitTimeMs: 3000,
          message: 'Switchboard VRF service error. Trying alternative account...',
        },
      },
    ];
  }

  /**
   * Classify an error and provide recovery recommendations
   */
  classifyError(error: Error, accountName?: string): VRFErrorClassification {
    // Handle known VRF error types
    if (error instanceof VRFTimeoutError) {
      return {
        type: 'timeout',
        severity: 'medium',
        isRetryable: true,
        suggestedAction: 'retry',
        waitTimeMs: 2000,
        message: `VRF request timed out after ${error.timeoutMs}ms. Retrying with different account...`,
      };
    }

    if (error instanceof VRFQueueFullError) {
      return {
        type: 'queue_full',
        severity: 'high',
        isRetryable: true,
        suggestedAction: 'switch_account',
        waitTimeMs: 5000,
        message: `VRF queue is full (depth: ${error.queueDepth}). Switching to less busy account...`,
      };
    }

    if (error instanceof VRFOracleOfflineError) {
      return {
        type: 'oracle_offline',
        severity: 'critical',
        isRetryable: true,
        suggestedAction: 'switch_account',
        waitTimeMs: 10000,
        message: `VRF oracle ${error.accountName} is offline. Trying backup account...`,
      };
    }

    // Pattern-based classification
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code?.toString().toLowerCase() || '';
    const fullErrorText = `${errorMessage} ${errorCode}`;

    for (const pattern of this.errorPatterns) {
      const regex = typeof pattern.pattern === 'string' 
        ? new RegExp(pattern.pattern, 'i') 
        : pattern.pattern;
      
      if (regex.test(fullErrorText)) {
        return this.adjustClassificationBySeverity(pattern.classification, accountName);
      }
    }

    // Default classification for unknown errors
    return {
      type: 'unknown',
      severity: 'medium',
      isRetryable: true,
      suggestedAction: 'retry',
      waitTimeMs: 1000,
      message: 'Unknown VRF error occurred. Attempting retry...',
    };
  }

  /**
   * Adjust classification based on account failure history and network conditions
   */
  private adjustClassificationBySeverity(
    base: VRFErrorClassification, 
    accountName?: string
  ): VRFErrorClassification {
    const classification = { ...base };

    // Track account failures
    if (accountName) {
      const failures = this.accountFailureTracker.get(accountName) || { count: 0, lastFailure: 0 };
      failures.count += 1;
      failures.lastFailure = Date.now();
      this.accountFailureTracker.set(accountName, failures);

      // Escalate severity if account has repeated failures
      if (failures.count >= 3) {
        classification.severity = 'critical';
        classification.suggestedAction = 'switch_account';
        classification.message = `Account ${accountName} has failed ${failures.count} times. Switching to backup...`;
      }
    }

    // Check network health and adjust accordingly
    if (this.isNetworkUnhealthy()) {
      classification.severity = 'high';
      classification.waitTimeMs = (classification.waitTimeMs || 1000) * 2;
      classification.message += ' (Network conditions are poor)';
    }

    return classification;
  }

  /**
   * Check if network is currently unhealthy
   */
  private isNetworkUnhealthy(): boolean {
    if (!this.networkHealthCache) return false;
    
    const cacheAge = Date.now() - this.networkHealthCache.timestamp;
    if (cacheAge > 30000) { // 30 second cache
      this.networkHealthCache = null;
      return false;
    }
    
    return !this.networkHealthCache.isHealthy;
  }

  /**
   * Update network health status
   */
  updateNetworkHealth(isHealthy: boolean): void {
    this.networkHealthCache = {
      timestamp: Date.now(),
      isHealthy,
    };
  }

  /**
   * Check if error indicates a critical system failure requiring fallback
   */
  requiresEmergencyFallback(error: Error, consecutiveFailures: number): boolean {
    const classification = this.classifyError(error);
    
    // Critical errors or too many consecutive failures
    if (classification.severity === 'critical' || consecutiveFailures >= 3) {
      return true;
    }

    // Multiple timeouts in a row suggest systemic issues
    if (classification.type === 'timeout' && consecutiveFailures >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Get recommended wait time before retry
   */
  getRecommendedWaitTime(error: Error, attemptNumber: number): number {
    const classification = this.classifyError(error);
    const baseWaitTime = classification.waitTimeMs || 1000;
    
    // Apply exponential backoff for retries
    const backoffMultiplier = Math.min(Math.pow(2, attemptNumber - 1), 8);
    
    return Math.min(baseWaitTime * backoffMultiplier, 30000); // Cap at 30 seconds
  }

  /**
   * Clear failure history for an account (after successful operation)
   */
  clearAccountFailures(accountName: string): void {
    this.accountFailureTracker.delete(accountName);
  }

  /**
   * Get failure count for an account
   */
  getAccountFailureCount(accountName: string): number {
    return this.accountFailureTracker.get(accountName)?.count || 0;
  }

  /**
   * Get accounts with high failure rates that should be avoided
   */
  getProblematicAccounts(failureThreshold = 3, timeWindowMs = 300000): string[] {
    const now = Date.now();
    const problematicAccounts: string[] = [];

    for (const [accountName, failures] of this.accountFailureTracker.entries()) {
      if (failures.count >= failureThreshold && 
          (now - failures.lastFailure) < timeWindowMs) {
        problematicAccounts.push(accountName);
      }
    }

    return problematicAccounts;
  }
}

// Singleton instance for application-wide use
let vrfErrorDetector: VRFErrorDetector | null = null;

export const getVRFErrorDetector = (): VRFErrorDetector => {
  if (!vrfErrorDetector) {
    vrfErrorDetector = new VRFErrorDetector();
  }
  return vrfErrorDetector;
};