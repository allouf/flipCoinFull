import { PublicKey } from '@solana/web3.js';

// Program Configuration
export const PROGRAM_ID = new PublicKey('7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6');
export const HOUSE_WALLET = new PublicKey('5FaU7dgFgghJ437ScyqUXtExmn1SGpEkm9NYriZocp7Q');

// Game Configuration
export const HOUSE_FEE_PERCENTAGE = 7; // 7% house fee
export const HOUSE_FEE_BPS = 700; // 7% in basis points
export const MIN_BET_SOL = 0.01;
export const MAX_BET_SOL = 100;
export const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
export const RESOLUTION_FEE_PER_PLAYER = 0.001; // Resolution fee in SOL

// Network Configuration
export const NETWORK = process.env.REACT_APP_NETWORK || 'devnet';
export const RPC_ENDPOINT = process.env.REACT_APP_RPC_ENDPOINT || 'https://api.devnet.solana.com';

// UI Configuration
export const LAMPORTS_PER_SOL = 1000000000;

// Game States
export enum RoomStatus {
  WaitingForPlayer = 'WaitingForPlayer',
  SelectionsPending = 'SelectionsPending',
  Resolving = 'Resolving',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum CoinSide {
  Heads = 'Heads',
  Tails = 'Tails'
}

// PDA Seeds
export const GLOBAL_STATE_SEED = 'global_state';
export const GAME_ROOM_SEED = 'game_room';
export const ESCROW_SEED = 'escrow';

// Betting Presets (in SOL)
export const BET_PRESETS = [0.01, 0.1, 0.5, 1, 5, 10];

// VRF Configuration (Switchboard)
export const SWITCHBOARD_PROGRAM_ID = new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  SERVER_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3001',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  RECONNECT_DELAY: 1000, // 1 second
};
