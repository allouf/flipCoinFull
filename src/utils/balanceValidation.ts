import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Check if wallet has sufficient balance for a transaction
 * @param connection - Solana connection
 * @param walletPublicKey - User's wallet public key
 * @param betAmountSol - Bet amount in SOL
 * @param estimatedFee - Estimated transaction fee in SOL (default: 0.01)
 * @returns Balance check result object
 */
export async function checkSufficientBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  betAmountSol: number,
  estimatedFee = 0.01,
): Promise<{
    hasSufficientBalance: boolean;
    currentBalance: number;
    required: number;
    shortage: number;
  }> {
  try {
    // Get current balance in lamports
    const balanceInLamports = await connection.getBalance(walletPublicKey);
    const currentBalance = balanceInLamports / 1_000_000_000; // Convert to SOL

    // Calculate required amount (bet + fees)
    const required = betAmountSol + estimatedFee;

    // Calculate shortage if any
    const shortage = Math.max(0, required - currentBalance);
    return {
      hasSufficientBalance: currentBalance >= required,
      currentBalance,
      required,
      shortage,
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    // Return conservative values if balance check fails
    return {
      hasSufficientBalance: false,
      currentBalance: 0,
      required: betAmountSol + estimatedFee,
      shortage: betAmountSol + estimatedFee,
    };
  }
}

/**
 * Format a user-friendly insufficient balance message
 * @param currentBalance - Current wallet balance in SOL
 * @param required - Required amount in SOL
 * @param shortage - Shortage amount in SOL
 * @returns Formatted error message
 */
export function formatInsufficientBalanceMessage(
  currentBalance: number,
  required: number,
  shortage: number,
): string {
  return `Insufficient SOL balance. You have ${currentBalance.toFixed(3)} SOL but need ${required.toFixed(3)} SOL for this transaction. Please add ${shortage.toFixed(3)} more SOL to your wallet.`;
}
