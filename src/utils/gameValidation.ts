import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { GameRoom } from '../hooks/useAnchorProgram';

export interface GameValidation {
  isValid: boolean;
  status: 'active' | 'expired' | 'completed' | 'not_found';
  details: string;
  timestamp: number;
}

export interface GamePhaseInfo {
  phase: string;
  timeoutAt: number;
  canContinue: boolean;
  requiresAction: boolean;
  actionType?: 'make_choice' | 'reveal' | 'timeout' | 'cancel';
}

const TIMEOUT_PERIODS = {
  WAITING_FOR_PLAYER: 2 * 60 * 60, // 2 hours
  PLAYER_SELECTION: 30 * 60,       // 30 minutes
  REVEAL_PHASE: 15 * 60,          // 15 minutes
};

export async function validateGameState(
  gameRoom: GameRoom | null,
  currentUserPubkey: PublicKey | null,
): Promise<GameValidation> {
  const now = Math.floor(Date.now() / 1000);

  // Handle non-existent game
  if (!gameRoom) {
    return {
      isValid: false,
      status: 'not_found',
      details: 'Game not found on the blockchain',
      timestamp: now,
    };
  }

  // Check if game is already completed
  if (gameRoom.status && 'resolved' in gameRoom.status) {
    return {
      isValid: false,
      status: 'completed',
      details: 'Game has already been completed',
      timestamp: now,
    };
  }

  // Calculate game age
  const createdAt = gameRoom.createdAt.toNumber();
  const gameAge = now - createdAt;

  // Check expiration based on game phase
  if ('waitingForPlayer' in gameRoom.status) {
    if (gameAge > TIMEOUT_PERIODS.WAITING_FOR_PLAYER) {
      return {
        isValid: false,
        status: 'expired',
        details: 'Game has expired while waiting for players',
        timestamp: now,
      };
    }
  } else if ('playersReady' in gameRoom.status) {
    if (gameAge > TIMEOUT_PERIODS.PLAYER_SELECTION) {
      return {
        isValid: false,
        status: 'expired',
        details: 'Game has expired during selection phase',
        timestamp: now,
      };
    }
  } else if ('revealingPhase' in gameRoom.status) {
    if (gameAge > TIMEOUT_PERIODS.REVEAL_PHASE) {
      return {
        isValid: false,
        status: 'expired',
        details: 'Game has expired during reveal phase',
        timestamp: now,
      };
    }
  }

  // Verify user participation if a public key is provided
  if (currentUserPubkey) {
    const isPlayerA = gameRoom.playerA.equals(currentUserPubkey);
    const isPlayerB = gameRoom.playerB && !gameRoom.playerB.equals(PublicKey.default) && gameRoom.playerB.equals(currentUserPubkey);

    if (!isPlayerA && !isPlayerB) {
      return {
        isValid: false,
        status: 'not_found',
        details: 'Current user is not a participant in this game',
        timestamp: now,
      };
    }
  }

  // Game is valid and active
  return {
    isValid: true,
    status: 'active',
    details: 'Game is valid and active',
    timestamp: now,
  };
}

export function getGamePhaseInfo(gameRoom: GameRoom): GamePhaseInfo {
  const now = Math.floor(Date.now() / 1000);
  const createdAt = gameRoom.createdAt.toNumber();

  if ('waitingForPlayer' in gameRoom.status) {
    return {
      phase: 'waiting',
      timeoutAt: createdAt + TIMEOUT_PERIODS.WAITING_FOR_PLAYER,
      canContinue: true,
      requiresAction: false,
    };
  }

  if ('playersReady' in gameRoom.status) {
    const hasPlayerACommitted = gameRoom.commitmentA && gameRoom.commitmentA.length > 0 && !gameRoom.commitmentA.every(byte => byte === 0);
    const hasPlayerBCommitted = gameRoom.commitmentB && gameRoom.commitmentB.length > 0 && !gameRoom.commitmentB.every(byte => byte === 0);

    return {
      phase: 'selection',
      timeoutAt: createdAt + TIMEOUT_PERIODS.PLAYER_SELECTION,
      canContinue: true,
      requiresAction: !hasPlayerACommitted || !hasPlayerBCommitted,
      actionType: 'make_choice',
    };
  }

  if ('revealingPhase' in gameRoom.status) {
    return {
      phase: 'revealing',
      timeoutAt: createdAt + TIMEOUT_PERIODS.REVEAL_PHASE,
      canContinue: true,
      requiresAction: true,
      actionType: 'reveal',
    };
  }

  if ('resolved' in gameRoom.status) {
    return {
      phase: 'completed',
      timeoutAt: 0,
      canContinue: false,
      requiresAction: false,
    };
  }

  // Default for unknown states
  return {
    phase: 'unknown',
    timeoutAt: 0,
    canContinue: false,
    requiresAction: false,
  };
}

export function formatTimeRemaining(timeoutAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = timeoutAt - now;

  if (remaining <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(remaining / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${remaining}s`;
}