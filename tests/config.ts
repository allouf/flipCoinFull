import { PublicKey } from '@solana/web3.js';

// Deploy test program to devnet first and set its ID here
export const TEST_CONFIG = {
  // Your deployed program ID
  PROGRAM_ID: '7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6',
  
  // House wallet for test environment
  HOUSE_WALLET: '5FaU7dgFgghJ437ScyqUXtExmn1SGpEkm9NYriZocp7Q',
  
  // Network configuration
  NETWORK: 'devnet',
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
  
  // Game configuration - should match your deployed contract
  HOUSE_FEE_PERCENTAGE: 500, // 5%
  MIN_BET_AMOUNT: 1_000_000, // 0.001 SOL minimum
  MAX_BET_AMOUNT: 100_000_000_000, // 100 SOL maximum
  
  // Timeouts and retry configuration
  TRANSACTION_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};
