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
      
      // Additional refresh for subsequent attempts to combat stale state
      if (attempt > 0) {
        console.log(`🔄 Transaction attempt ${attempt + 1}/${maxRetries + 1} - refreshing connection state`);
        // Brief delay to let network state settle
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const signature = await transaction();
      
      console.log(`✨ Transaction submitted: ${signature}`);
      console.log(`⏳ Waiting for confirmation...`);

      // Wait for confirmation with extended timeout
      const confirmationPromise = connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed',
      );
      
      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000); // 60 second timeout
      });
      
      const confirmation = await Promise.race([confirmationPromise, timeoutPromise]) as any;

      if (confirmation.value?.err) {
        console.error(`❌ Transaction failed on-chain:`, confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log(`✅ Transaction confirmed: ${signature}`);
      
      // Brief delay to ensure blockchain state is fully updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      return signature;
    } catch (error) {
      lastError = error as Error;
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(lastError);
      
      console.log(`❌ Transaction attempt ${attempt + 1} failed:`, lastError.message);
      console.log(`🔄 Is retryable:`, isRetryable);

      // Don't retry on certain errors
      if (
        lastError.message.includes('User rejected')
        || lastError.message.includes('insufficient funds')
        || lastError.message.includes('insufficient lamports')
        || lastError.message.includes('Invalid program')
        || lastError.message.includes('ConstraintMut')
        || lastError.message.includes('no second player')
        || !isRetryable
      ) {
        // For user rejection, throw a more user-friendly error without the stack trace
        if (lastError.message.includes('User rejected')) {
          throw new Error('Transaction was cancelled by user.');
        }
        console.log(`🛑 Non-retryable error, giving up immediately`);
        throw lastError;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.log(`🛑 Max retries (${maxRetries}) reached, giving up`);
        break;
      }

      // Wait before retrying with exponential backoff + jitter
      const baseDelay = retryDelay * 2 ** attempt;
      const jitter = Math.random() * 500; // Add up to 500ms random jitter
      const delay = baseDelay + jitter;
      
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Log retry attempt in development (but not for user rejection)
      if (process.env.NODE_ENV === 'development' && !lastError.message.includes('User rejected')) {
        console.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, lastError.message);
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
    'blockhashnotfound',
    'simulation failed',
    'transaction simulation failed',
    'accountdidnotserialize',
    'network error',
    'network request failed',
    'timeout',
    'rate limit',
    '429',
    'too many requests',
    'connection refused',
    'fetch failed',
    'rpc response error',
    'failed to get recent blockhash',
  ];

  return retryableErrors.some((retryableError) => message.includes(retryableError));
}

/**
 * Format transaction error for user display
 */
export function formatTransactionError(error: Error): string {
  const message = error.message.toLowerCase();

  // Check for insufficient lamports error with specific amounts
  if (message.includes('insufficient lamports')) {
    const lamportsMatch = message.match(/insufficient lamports (\d+), need (\d+)/);
    if (lamportsMatch) {
      const available = parseInt(lamportsMatch[1], 10) / 1_000_000_000; // Convert to SOL
      const needed = parseInt(lamportsMatch[2], 10) / 1_000_000_000;
      const shortage = needed - available;
      return `Insufficient SOL balance. You have ${available.toFixed(3)} SOL but need ${needed.toFixed(3)} SOL. Please add ${shortage.toFixed(3)} more SOL to your wallet.`;
    }
    return 'Insufficient SOL balance to cover the bet amount and transaction fees.';
  }

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
  } if (message.includes('accountdidnotserialize')) {
    return 'Game account is corrupted. Try "Handle Timeout" or "Leave Game".';
  } if (message.includes('constraintmut') && message.includes('player_2')) {
    return 'Cannot process: Game has no second player. Try "Leave Game" instead.';
  } if (message.includes('no second player')) {
    return 'This game never had a second player. Use "Leave Game" to exit.';
  }
  return `Transaction failed: ${error.message}`;
}
