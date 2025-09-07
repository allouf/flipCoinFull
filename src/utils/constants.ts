// Network Configuration
export const SOLANA_NETWORK = process.env.REACT_APP_SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_URL = process.env.REACT_APP_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Program IDs (to be updated when programs are deployed)
export const GAME_PROGRAM_ID = '11111111111111111111111111111111';
export const TREASURY_WALLET = '11111111111111111111111111111111';

// Game Configuration
export const HOUSE_FEE_PERCENTAGE = 0.01; // 1%
export const MIN_BET_AMOUNT = 0.01; // 0.01 SOL
export const MAX_BET_AMOUNT = 10; // 10 SOL
export const ROOM_TIMEOUT = 300; // 5 minutes in seconds

// UI Configuration
export const ANIMATION_DURATION = 1000; // 1 second
export const FLIP_ANIMATION_DURATION = 2000; // 2 seconds
export const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

// Wallet Configuration
export const SUPPORTED_WALLETS = [
  'phantom',
  'solflare',
  'sollet',
  'ledger',
  'torus',
];

// API Endpoints (if using backend)
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Local Storage Keys
export const STORAGE_KEYS = {
  WALLET_PREFERENCE: 'coinFlipper_wallet_preference',
  GAME_HISTORY: 'coinFlipper_game_history',
  USER_SETTINGS: 'coinFlipper_user_settings',
};

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this bet',
  ROOM_NOT_FOUND: 'Game room not found',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};
