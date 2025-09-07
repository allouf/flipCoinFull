import { Connection, TransactionSignature, PublicKey } from '@solana/web3.js';
import { getVRFErrorDetector, VRFErrorClassification } from './VRFErrorDetector';
import { isRetryableError, formatTransactionError } from '../utils/transaction';
import { VRFAccountConfig } from './VRFAccountManager';

export interface VRFTransactionOptions {
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  enableFreshBlockhash?: boolean;
  timeoutMs?: number;
}

export interface VRFTransactionResult {
  success: boolean;
  signature?: TransactionSignature;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
  blockhashRefreshCount: number;
  vrfAccount: VRFAccountConfig;
}

/**
 * VRF-specific transaction retry handler with advanced recovery strategies
 * 
 * Features:
 * - Fresh blockhash for each retry attempt
 * - VRF-specific error classification and handling
 * - Exponential backoff with jitter to reduce thundering herd
 * - Timeout protection with proper cleanup
 * - Integration with VRF account health tracking
 */
export class VRFTransactionRetry {
  private errorDetector = getVRFErrorDetector();

  constructor(private connection: Connection) {}

  /**
   * Execute a VRF transaction with comprehensive retry logic
   */
  async executeVRFTransaction(
    transactionFn: (blockhash: string, lastValidBlockHeight: number) => Promise<TransactionSignature>,
    vrfAccount: VRFAccountConfig,
    options: VRFTransactionOptions = {}
  ): Promise<VRFTransactionResult> {
    const {
      maxRetries = 3,
      baseRetryDelayMs = 1000,
      maxRetryDelayMs = 30000,
      enableFreshBlockhash = true,
      timeoutMs = 120000, // 2 minutes default
    } = options;

    const startTime = Date.now();
    let lastError: Error | null = null;
    let blockhashRefreshCount = 0;
    let currentBlockhash: string | null = null;
    let lastValidBlockHeight: number | null = null;

    // Set up timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`VRF transaction timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Get fresh blockhash if needed
          if (enableFreshBlockhash || !currentBlockhash) {
            const latestBlockhash = await this.connection.getLatestBlockhash('confirmed');
            currentBlockhash = latestBlockhash.blockhash;
            lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
            blockhashRefreshCount++;
          }

          // Execute transaction with timeout protection
          const signature = await Promise.race([
            transactionFn(currentBlockhash!, lastValidBlockHeight!),
            timeoutPromise,
          ]);

          // Success - confirm transaction
          const confirmation = await Promise.race([
            this.connection.confirmTransaction(
              {
                signature,
                blockhash: currentBlockhash!,
                lastValidBlockHeight: lastValidBlockHeight!,
              },
              'confirmed'
            ),
            timeoutPromise,
          ]);

          if (confirmation.value.err) {
            throw new Error(
              `VRF transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`
            );
          }

          // Success!
          return {
            success: true,
            signature,
            attempts: attempt,
            totalDurationMs: Date.now() - startTime,
            blockhashRefreshCount,
            vrfAccount,
          };

        } catch (error) {
          lastError = error as Error;

          // Classify error for smart retry decisions
          const classification = this.errorDetector.classifyError(lastError, vrfAccount.name);

          // Update network health if this appears to be a network issue
          if (classification.type === 'network') {
            this.errorDetector.updateNetworkHealth(false);
          }

          // Don't retry non-retryable errors
          if (!this.shouldRetryVRFError(lastError, classification)) {
            console.warn(
              `Non-retryable VRF error on account ${vrfAccount.name}: ${lastError.message}`
            );
            break;
          }

          // Don't retry if this is the last attempt
          if (attempt >= maxRetries) {
            console.error(
              `VRF transaction failed after ${attempt} attempts on account ${vrfAccount.name}`
            );
            break;
          }

          // Calculate retry delay with jitter and classification-based adjustments
          const baseDelay = classification.waitTimeMs || baseRetryDelayMs;
          const exponentialDelay = Math.min(
            baseDelay * Math.pow(2, attempt - 1),
            maxRetryDelayMs
          );
          
          // Add jitter to prevent thundering herd (±20%)
          const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
          const finalDelay = Math.max(exponentialDelay + jitter, 100);

          console.warn(
            `VRF transaction attempt ${attempt} failed on ${vrfAccount.name}, ` +
            `retrying in ${Math.round(finalDelay)}ms: ${classification.message}`
          );

          // Wait before retry
          await this.delay(finalDelay);

          // Force fresh blockhash on certain error types
          if (classification.type === 'timeout' || 
              classification.type === 'network' ||
              lastError.message.includes('blockhash')) {
            currentBlockhash = null; // Force refresh
          }
        }
      }

      // All retries exhausted
      return {
        success: false,
        error: lastError!,
        attempts: maxRetries,
        totalDurationMs: Date.now() - startTime,
        blockhashRefreshCount,
        vrfAccount,
      };

    } catch (timeoutError) {
      // Timeout occurred
      return {
        success: false,
        error: timeoutError as Error,
        attempts: maxRetries,
        totalDurationMs: Date.now() - startTime,
        blockhashRefreshCount,
        vrfAccount,
      };
    }
  }

  /**
   * Determine if a VRF error should be retried
   */
  private shouldRetryVRFError(error: Error, classification: VRFErrorClassification): boolean {
    const message = error.message.toLowerCase();

    // Never retry these critical errors
    const nonRetryablePatterns = [
      'user rejected',
      'user denied',
      'insufficient funds',
      'invalid program',
      'account not found',
      'unauthorized',
      'signature verification failed',
    ];

    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Use classification recommendation
    return classification.isRetryable;
  }

  /**
   * Execute multiple VRF transactions in sequence with shared blockhash
   */
  async executeVRFTransactionBatch(
    transactionFns: ((blockhash: string, lastValidBlockHeight: number) => Promise<TransactionSignature>)[],
    vrfAccount: VRFAccountConfig,
    options: VRFTransactionOptions = {}
  ): Promise<VRFTransactionResult[]> {
    const results: VRFTransactionResult[] = [];
    
    // Get single fresh blockhash for batch
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    
    // Execute each transaction with shared blockhash
    for (let i = 0; i < transactionFns.length; i++) {
      const transactionFn = transactionFns[i];
      
      const result = await this.executeVRFTransaction(
        () => transactionFn(blockhash, lastValidBlockHeight),
        vrfAccount,
        {
          ...options,
          enableFreshBlockhash: false, // Use shared blockhash
        }
      );
      
      results.push(result);
      
      // Stop batch on first failure if requested
      if (!result.success && options.maxRetries === 1) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get user-friendly error message for VRF transaction failures
   */
  getVRFErrorMessage(error: Error, vrfAccount: VRFAccountConfig): string {
    const classification = this.errorDetector.classifyError(error, vrfAccount.name);
    
    const baseMessage = formatTransactionError(error);
    
    // Add VRF-specific context
    switch (classification.type) {
      case 'timeout':
        return `${baseMessage} The VRF oracle (${vrfAccount.name}) is taking longer than usual to respond.`;
      
      case 'queue_full':
        return `${baseMessage} The VRF service is busy. We're automatically switching to a less congested oracle.`;
      
      case 'oracle_offline':
        return `${baseMessage} The VRF oracle (${vrfAccount.name}) appears to be offline. We're trying backup oracles.`;
      
      case 'network':
        return `${baseMessage} This appears to be a network connectivity issue.`;
      
      case 'account_invalid':
        return `${baseMessage} The VRF oracle account (${vrfAccount.name}) has configuration issues.`;
      
      default:
        return baseMessage;
    }
  }

  /**
   * Check blockhash validity before transaction
   */
  async isBlockhashValid(blockhash: string): Promise<boolean> {
    try {
      const result = await this.connection.isBlockhashValid(blockhash);
      return result.value;
    } catch (error) {
      console.warn('Failed to check blockhash validity:', error);
      return false;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton for reuse
let vrfTransactionRetry: VRFTransactionRetry | null = null;

export const getVRFTransactionRetry = (connection: Connection): VRFTransactionRetry => {
  if (!vrfTransactionRetry) {
    vrfTransactionRetry = new VRFTransactionRetry(connection);
  }
  return vrfTransactionRetry;
};