/**
 * Solana Program Configuration
 *
 * This file contains the deployed program ID and related configuration
 * for the Coin Flipper smart contract.
 */

import { PublicKey } from '@solana/web3.js';

// Deployed Program ID on Solana Devnet (correct one)
export const PROGRAM_ID = new PublicKey('7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6');

// Program configuration
export const PROGRAM_CONFIG = {
  programId: PROGRAM_ID,
  houseFeePercentage: 7, // 7% house fee (as per documentation)
  minBetAmount: 0.01, // Minimum bet in SOL
  selectionTimeoutSeconds: 180000, // 30 minutes timeout - more generous for user experience
};

// Network endpoints - Using reliable public endpoints
export const RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
};

// Explorer URLs for transaction viewing
export const EXPLORER_URLS = {
  mainnet: 'https://explorer.solana.com',
  devnet: 'https://explorer.solana.com?cluster=devnet',
  testnet: 'https://explorer.solana.com?cluster=testnet',
  localnet: 'https://explorer.solana.com?cluster=custom&customUrl=http://localhost:8899',
};

// Helper function to get explorer URL for a transaction
export const getExplorerUrl = (signature: string, network: keyof typeof EXPLORER_URLS = 'devnet'): string => `${EXPLORER_URLS[network]}/tx/${signature}`;

// Helper function to get explorer URL for an account/program
export const getAccountExplorerUrl = (address: string, network: keyof typeof EXPLORER_URLS = 'devnet'): string => `${EXPLORER_URLS[network]}/address/${address}`;

// Alternative RPC endpoints for better reliability
export const ALTERNATIVE_RPC_ENDPOINTS = {
  devnet: [
    'https://api.devnet.solana.com',
    'https://devnet.helius-rpc.com',
    'https://rpc.ankr.com/solana_devnet',
  ],
  mainnet: [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
  ],
};

// Helper function to get a working RPC endpoint
export const getWorkingRpcEndpoint = async (network: 'devnet' | 'mainnet'): Promise<string> => {
  const endpoints = ALTERNATIVE_RPC_ENDPOINTS[network];

  // Use array method to avoid for-of restriction
  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < endpoints.length; i += 1) {
    const endpoint = endpoints[i];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getVersion',
        }),
      });

      if (response.ok) {
        return endpoint;
      }
    } catch (error) {
      // Continue to next endpoint - no continue statement needed with for loop
    }
  }

  // Return default if none work
  return RPC_ENDPOINTS[network];
};
