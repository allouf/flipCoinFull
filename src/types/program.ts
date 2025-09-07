import { IdlAccounts, IdlTypes } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

/**
 * Placeholder type definitions for the coin flipper program
 * TODO: Replace with actual generated types from Anchor IDL
 */

export interface CoinFlipper {
  version: string;
  name: 'coin_flipper';
  // This would contain the full IDL structure
  // For now, using a placeholder
}

export interface GameRoom {
  authority: PublicKey;
  player1: PublicKey | null;
  player2: PublicKey | null;
  betAmount: number;
  token: PublicKey;
  player1Choice: number | null; // 0 = heads, 1 = tails
  player2Choice: number | null;
  gameState: GameState;
  vrfRequest: PublicKey | null;
  result: number | null;
  winner: PublicKey | null;
  createdAt: number;
  expiresAt: number;
  bump: number;
}

export enum GameState {
  WaitingForPlayers = 0,
  PlayersJoined = 1,
  ChoicesMade = 2,
  VrfRequested = 3,
  GameResolved = 4,
  GameExpired = 5,
}

export interface VrfRequest {
  gameRoom: PublicKey;
  vrf: PublicKey;
  switchboardState: PublicKey;
  result: number | null;
  resultSlot: number | null;
  bump: number;
}

// Event types that would be emitted by the program
export interface GameEvent {
  name: string;
  data: any;
}

export interface RoomCreatedEvent {
  roomId: PublicKey;
  authority: PublicKey;
  betAmount: number;
  token: PublicKey;
  expiresAt: number;
}

export interface PlayerJoinedEvent {
  roomId: PublicKey;
  player: PublicKey;
  playerNumber: number; // 1 or 2
}

export interface ChoiceMadeEvent {
  roomId: PublicKey;
  player: PublicKey;
  hasChoice: boolean; // Don't reveal the actual choice
}

export interface GameResolvedEvent {
  roomId: PublicKey;
  winner: PublicKey;
  loser: PublicKey;
  result: number; // 0 = heads, 1 = tails
  winnerChoice: number;
  betAmount: number;
  payout: number;
  houseFee: number;
}

// Instruction data types
export interface CreateRoomArgs {
  betAmount: number;
  expiryMinutes: number;
}

export interface JoinRoomArgs {
  // No additional args needed
}

export interface MakeChoiceArgs {
  choice: number; // 0 = heads, 1 = tails
}

export interface ResolveGameArgs {
  // VRF result would be passed in accounts
}
