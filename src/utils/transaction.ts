import {
  Connection, TransactionSignature, SendOptions,
} from '@solana/web3.js';

export interface RetryTransactionOptions extends SendOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Retry a transaction with exponential backoff
 */
export async function retryTransaction(
  connection: Connection,
  transaction: () => Promise<TransactionSignature>,
  options: RetryTransactionOptions = {},
): Promise<TransactionSignature> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let lastError: Error = new Error('Transaction failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get fresh blockhash before each attempt
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const signature = await transaction();

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed',
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        lastError.message.includes('User rejected')
        || lastError.message.includes('insufficient funds')
        || lastError.message.includes('Invalid program')
      ) {
        throw lastError;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Log retry attempt in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
      }
    }
  }

  throw lastError;
}

/**
 * Check if a transaction error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  const retryableErrors = [
    'blockhash not found',
    'network error',
    'timeout',
    'rate limit',
    '429',
    'too many requests',
    'connection refused',
    'fetch failed',
  ];

  return retryableErrors.some((retryableError) => message.includes(retryableError));
}

/**
 * Format transaction error for user display
 */
export function formatTransactionError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('blockhash not found')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  } if (message.includes('insufficient funds')) {
    return 'Insufficient SOL balance to cover transaction and fees.';
  } if (message.includes('user rejected')) {
    return 'Transaction was rejected by wallet.';
  } if (message.includes('rate limit') || message.includes('429')) {
    return 'Network is busy. Please wait a moment and try again.';
  } if (message.includes('timeout')) {
    return 'Transaction timed out. Please try again.';
  } if (message.includes('invalid program')) {
    return 'Smart contract error. Please contact support.';
  }
  return `Transaction failed: ${error.message}`;
}
