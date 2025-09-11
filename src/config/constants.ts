import { PublicKey } from '@solana/web3.js';

// Deployed Program ID on Devnet
export const PROGRAM_ID = new PublicKey('EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou');

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Game configuration
export const HOUSE_FEE_BASIS_POINTS = 300; // 3% house fee
export const MIN_BET_AMOUNT = 0.01; // 0.01 SOL minimum bet
export const GAME_TIMEOUT_SECONDS = 30; // 30 seconds to make a choice

// VRF Configuration (Switchboard)
export const SWITCHBOARD_PROGRAM_ID = new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  SERVER_URL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  HEARTBEAT_INTERVAL: 25000, // 25 seconds
  RECONNECT_DELAYS: [1000, 2000, 4000, 8000, 16000, 30000], // Exponential backoff
  MAX_RECONNECT_ATTEMPTS: 10,
};

// Real-time Updates Configuration
export const REALTIME_CONFIG = {
  EVENT_THROTTLE_MS: 100, // Throttle events to max 10 per second
  MAX_CACHED_EVENTS: 1000, // Maximum events to cache for deduplication
  OPTIMISTIC_TIMEOUT_MS: 30000, // 30 seconds before rolling back optimistic updates
  SUBSCRIPTION_CLEANUP_INTERVAL: 60000, // Clean up stale subscriptions every minute
};

// Cross-tab Synchronization
export const SYNC_CONFIG = {
  HEARTBEAT_INTERVAL: 2000, // 2 seconds
  LEADER_TIMEOUT: 5000, // 5 seconds
  CHANNEL_NAME: 'coin-flipper-sync',
  STALE_TAB_TIMEOUT: 10000, // 10 seconds
};
