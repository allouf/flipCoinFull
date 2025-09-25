import { PublicKey } from '@solana/web3.js';

export type GameStatus = 
  | 'WaitingForPlayer'
  | 'PlayersReady'
  | 'CommitmentsReady'
  | 'RevealingPhase'
  | 'Resolved';

export type CoinSide = 'heads' | 'tails';

export interface PublicGameInfo {
  gameId: number;
  gamePda: string;
  playerA: string;
  playerB?: string;
  betAmount: number;
}

export interface GameData extends PublicGameInfo {
  createdAt: Date;
  timeRemaining: number;
  status: GameStatus;
  coinResult?: CoinSide;
  winner?: string;
  houseFee?: number;
  resolvedAt?: Date;
}

export interface GameStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  totalWagered: number;
  totalWinnings: number;
  netProfit: number;
  winRate: number;
  averageBet: number;
  favoriteChoice: CoinSide | 'none';
  currentStreak: {
    type: 'win' | 'lose' | 'none';
    count: number;
  };
  longestStreak: {
    type: 'win' | 'lose';
    count: number;
  };
  houseFeesPaid: number;
}

export interface GameFilters {
  searchTerm: string;
  sortBy: 'newest' | 'oldest' | 'highestBet' | 'lowestBet';
  betAmountRange: {
    min: number;
    max: number;
  };
  status?: GameStatus[];
  playerAddress?: string;
}
