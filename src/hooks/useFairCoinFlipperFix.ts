// This file contains the critical fixes for the coin flipper game state management issue
// Problem: When a player has committed but the other hasn't, they incorrectly see "revealing" phase
// Solution: Only show revealing phase when BOTH players have committed

export const getCorrectGamePhase = (
  status: any,
  hasPlayerACommitted: boolean,
  hasPlayerBCommitted: boolean,
  hasCurrentPlayerCommitted: boolean,
  isPlayerA: boolean
) => {
  const hasBothPlayersCommitted = hasPlayerACommitted && hasPlayerBCommitted;

  console.log('🔍 [PHASE DETERMINATION] Commitment Status:', {
    currentPlayer: isPlayerA ? 'Player A' : 'Player B',
    hasPlayerACommitted,
    hasPlayerBCommitted,
    hasCurrentPlayerCommitted,
    hasBothPlayersCommitted,
    blockchainStatus: Object.keys(status)[0]
  });

  let phase = 'waiting';
  let blockchainStatus = 'WaitingForPlayer';
  let waitingForOpponent = false;

  if ('waitingForPlayer' in status) {
    console.log('📍 [PHASE] Waiting for player to join');
    phase = 'waiting';
    blockchainStatus = 'WaitingForPlayer';
  } else if ('playersReady' in status) {
    // CRITICAL FIX: Only show revealing phase when BOTH players have committed
    if (hasBothPlayersCommitted) {
      console.log('🎯 [PHASE] Both players committed - ready to reveal');
      phase = 'revealing';
    } else if (hasCurrentPlayerCommitted) {
      console.log('⏳ [PHASE] Current player committed, waiting for opponent');
      // Stay in committing phase but mark as waiting for opponent
      phase = 'committing';
      waitingForOpponent = true;
    } else {
      console.log('🎲 [PHASE] Current player needs to make commitment');
      phase = 'committing';
      waitingForOpponent = false;
    }
    blockchainStatus = 'PlayersReady';
  } else if ('commitmentsReady' in status) {
    console.log('🎭 [PHASE] Both commitments ready - revealing phase');
    phase = 'revealing';
    blockchainStatus = 'CommitmentsReady';
  } else if ('revealingPhase' in status) {
    console.log('🎪 [PHASE] In revealing phase');
    phase = 'revealing';
    blockchainStatus = 'RevealingPhase';
  } else if ('resolved' in status) {
    console.log('✅ [PHASE] Game resolved');
    phase = 'resolved';
    blockchainStatus = 'Resolved';
  }

  return {
    phase,
    blockchainStatus,
    waitingForOpponent,
    hasBothPlayersCommitted
  };
};

// Instructions to apply the fix:
// 1. In rejoinExistingGame function around line 879-900:
//    - Add: const hasBothPlayersCommitted = hasPlayerACommitted && hasPlayerBCommitted;
//    - Replace the phase determination logic with the logic from getCorrectGamePhase above
//    - Store waitingForOpponent flag in game state
//
// 2. In loadGameByPda function around line 1205-1227:
//    - Apply the same fix as in rejoinExistingGame
//    - Add the same logging and phase determination logic
//
// 3. In GameRoomPage.tsx, update the committing phase rendering:
//    - Check if waitingForOpponent flag is true
//    - If true, show "Waiting for opponent to make their choice" instead of choice buttons
//    - If false, show the normal choice selection interface