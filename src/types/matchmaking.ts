import { PublicKey } from '@solana/web3.js';

// Core matchmaking types
export interface Token {
  mint: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export interface QueueEntry {
  playerId: string;
  socketId: string;
  betAmount: number;
  tokenMint: string;
  joinedAt: Date;
  lastHeartbeat: Date;
}

export interface MatchData {
  roomId: string;
  opponent: string;
  betAmount: number;
  tokenMint: string;
  autoAcceptTimeout: number; // in milliseconds
}

export interface QueueStats {
  queueKey: string;
  playersWaiting: number;
  estimatedWaitTime: number; // in seconds
}

export interface PopularQueue {
  tokenMint: string;
  betAmount: number;
  playersWaiting: number;
  averageWaitTime: number; // in seconds
}

export interface QueueStatus {
  isInQueue: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number; // in seconds
  playersWaiting?: number;
  queueKey?: string;
}

// Socket event payloads
export interface JoinQueuePayload {
  playerId: string;
  betAmount: number;
  tokenMint: string;
}

export interface LeaveQueuePayload {
  playerId: string;
}

export interface AcceptMatchPayload {
  roomId: string;
  playerId: string;
}

export interface HeartbeatPayload {
  playerId: string;
}

// Socket event responses
export interface QueueJoinedResponse {
  queueKey: string;
  position: number;
  estimatedWaitTime: number;
  playersWaiting: number;
}

export interface QueueStatsUpdateResponse {
  queueKey: string;
  playersWaiting: number;
  estimatedWaitTime: number;
}

export interface MatchFoundResponse {
  roomId: string;
  opponent: string;
  betAmount: number;
  tokenMint: string;
  autoAcceptTimeout: number;
}

export interface MatchConfirmedResponse {
  roomId: string;
  opponent: string;
  betAmount: number;
  tokenMint: string;
}

export interface ErrorResponse {
  message: string;
  error?: string;
}

// Smart contract types
export interface QueuePositionAccount {
  player: PublicKey;
  betAmount: number; // u64 in contract, but JS handles as number
  tokenMint: PublicKey;
  joinedAt: number; // i64 timestamp
  status: QueueStatusEnum;
  bump: number; // u8
}

export enum QueueStatusEnum {
  Waiting = 'Waiting',
  Matched = 'Matched',
  Cancelled = 'Cancelled',
  TimedOut = 'TimedOut',
}

// Component prop types
export interface AutoMatchPanelProps {
  onJoinQueue: (betAmount: number, tokenMint: string) => void;
  onCancelQueue: () => void;
  isInQueue: boolean;
  isLoading: boolean;
  availableTokens: Token[];
  minBetAmount: number;
  maxBetAmount?: number;
}

export interface QueueStatusProps {
  isInQueue: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  playersWaiting?: number;
  queueKey?: string;
  onCancel: () => void;
  onRefresh?: () => void;
}

export interface MatchNotificationProps {
  isVisible: boolean;
  matchData?: MatchData;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

// Hook return types
export interface UseMatchmakingReturn {
  // Queue state
  queueStatus: QueueStatus;
  isLoading: boolean;
  error: string | null;

  // Match state
  matchFound: MatchData | null;
  showMatchNotification: boolean;

  // Queue stats
  popularQueues: PopularQueue[];

  // Actions
  joinQueue: (betAmount: number, tokenMint: string) => Promise<void>;
  leaveQueue: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  declineMatch: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Socket connection state
  isConnected: boolean;
}

// Service configuration types
export interface MatchmakingServiceConfig {
  socketUrl: string;
  heartbeatInterval: number; // milliseconds
  matchingInterval: number; // milliseconds
  queueTimeout: number; // seconds
  autoAcceptTimeout: number; // milliseconds
}

// Server-side types (for backend service)
export interface MatchResult {
  roomId: string;
  player1: QueueEntry;
  player2: QueueEntry;
  betAmount: number;
  tokenMint: string;
  createdAt: Date;
}

export interface ServerQueueStats {
  tokenMint: string;
  betAmount: number;
  playersWaiting: number;
  averageWaitTime: number;
  successRate: number; // percentage of successful matches
}

// Constants
export const QUEUE_TIMEOUTS = {
  HEARTBEAT_INTERVAL: 15000, // 15 seconds
  HEARTBEAT_TIMEOUT: 30000, // 30 seconds
  QUEUE_TIMEOUT: 300000, // 5 minutes
  AUTO_ACCEPT_TIMEOUT: 10000, // 10 seconds
  MATCHING_INTERVAL: 2000, // 2 seconds
} as const;

export const SUPPORTED_TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    logo: '/tokens/sol.png',
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    logo: '/tokens/usdc.png',
  },
} as const;

export default {
  QueueStatusEnum,
  QUEUE_TIMEOUTS,
  SUPPORTED_TOKENS,
};
