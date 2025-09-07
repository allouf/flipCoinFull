// Core game types
export interface Room {
  id: string;
  creator: string;
  betAmount: number;
  maxBet: number;
  minBet: number;
  isActive: boolean;
  player1?: string;
  player2?: string;
  createdAt: Date;
}

export interface GameResult {
  roomId: string;
  winner: string;
  loser: string;
  amount: number;
  flipResult: 'heads' | 'tails';
  timestamp: Date;
}

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number;
}

export interface GameStats {
  totalGames: number;
  totalVolume: number;
  activeRooms: number;
  userWins: number;
  userLosses: number;
}

// Solana-specific types
export interface SolanaTransaction {
  signature: string;
  blockTime: number | null;
  confirmationStatus: 'processed' | 'confirmed' | 'finalized';
}

export interface ProgramAccounts {
  gameProgram: string;
  treasury: string;
  // Add more program accounts as needed
}
