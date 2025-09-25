#!/usr/bin/env node

// This script applies the critical fix for the coin flipper game state issue
// Problem: When User2 has committed but User1 hasn't, User2 incorrectly sees "Both players have committed"
// Solution: Only show revealing phase when BOTH players have actually committed

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying Coin Flipper Game State Fix...\n');

// Apply fix to useFairCoinFlipper.ts
function fixHookFile() {
  const filePath = path.join(__dirname, 'src', 'hooks', 'useFairCoinFlipper.ts');
  console.log('📝 Reading:', filePath);

  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Add waitingForOpponent to interface
  if (!content.includes('waitingForOpponent: boolean')) {
    content = content.replace(
      '  opponentChoice: CoinSide | null;\n  \n  // Game results',
      '  opponentChoice: CoinSide | null;\n  waitingForOpponent: boolean;  // Track if waiting for opponent to commit\n  \n  // Game results'
    );
    console.log('✅ Added waitingForOpponent to GameState interface');
  }

  // 2. Initialize waitingForOpponent
  if (!content.includes('waitingForOpponent: false,')) {
    content = content.replace(
      '    opponentChoice: null,\n    \n    // Game results',
      '    opponentChoice: null,\n    waitingForOpponent: false,\n    \n    // Game results'
    );
    console.log('✅ Added waitingForOpponent initialization');
  }

  // 3. Fix the rejoinExistingGame logic
  const rejoinPattern = /if \('playersReady' in status\) \{[\s\S]*?blockchainStatus = 'PlayersReady';/g;
  const rejoinReplacement = `if ('playersReady' in status) {
        // FIXED: Only show revealing phase when BOTH players have committed
        if (hasBothPlayersCommitted) {
          console.log('🎯 [REJOIN] Both players committed - ready to reveal');
          phase = 'revealing';
          waitingForOpponent = false;
        } else if (hasCurrentPlayerCommitted) {
          console.log('⏳ [REJOIN] Current player committed, waiting for opponent');
          phase = 'committing';
          waitingForOpponent = true;
        } else {
          console.log('🎲 [REJOIN] Current player needs to make commitment');
          phase = 'committing';
          waitingForOpponent = false;
        }
        blockchainStatus = 'PlayersReady';`;

  if (!content.includes('hasBothPlayersCommitted')) {
    // Add the variable declaration
    content = content.replace(
      'const hasCurrentPlayerCommitted = isPlayerA ? hasPlayerACommitted : hasPlayerBCommitted;',
      'const hasCurrentPlayerCommitted = isPlayerA ? hasPlayerACommitted : hasPlayerBCommitted;\n      const hasBothPlayersCommitted = hasPlayerACommitted && hasPlayerBCommitted;'
    );
    console.log('✅ Added hasBothPlayersCommitted variable');
  }

  // Apply the fix
  content = content.replace(rejoinPattern, rejoinReplacement);
  console.log('✅ Fixed phase determination logic in rejoinExistingGame');

  // 4. Add waitingForOpponent to state updates
  content = content.replace(
    /setGameState\(prev => \(\{[\s\S]*?playerRole: isPlayerA \? 'creator' : 'joiner',[\s\S]*?\}\)\);/g,
    (match) => {
      if (!match.includes('waitingForOpponent')) {
        return match.replace(
          'isLoading: false,',
          'isLoading: false,\n        waitingForOpponent,'
        );
      }
      return match;
    }
  );
  console.log('✅ Added waitingForOpponent to state updates');

  // Add comprehensive logging
  if (!content.includes('[REJOIN] Commitment Status Check')) {
    const loggingCode = `
      console.log('🔍 [REJOIN] Commitment Status Check:', {
        gameId,
        currentPlayer: isPlayerA ? 'Player A' : 'Player B',
        hasPlayerACommitted,
        hasPlayerBCommitted,
        hasCurrentPlayerCommitted,
        hasBothPlayersCommitted,
        blockchainStatus: Object.keys(status)[0]
      });`;

    content = content.replace(
      '// Determine the correct game phase based on blockchain status',
      loggingCode + '\n\n      // Determine the correct game phase based on blockchain status'
    );
    console.log('✅ Added comprehensive logging');
  }

  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed useFairCoinFlipper.ts\n');
}

// Apply fix to GameRoomPage.tsx
function fixUIFile() {
  const filePath = path.join(__dirname, 'src', 'pages', 'GameRoomPage.tsx');
  console.log('📝 Reading:', filePath);

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if fix already applied
  if (content.includes('gameState.waitingForOpponent')) {
    console.log('✅ UI fix already applied\n');
    return;
  }

  // Fix the committing case to handle waiting state
  const committingCase = `case 'committing':
        // Check if we're waiting for opponent
        if (gameState.waitingForOpponent) {
          return (
            <div className="text-center py-12">
              <div className="text-6xl mb-6 animate-pulse">⏳</div>
              <h3 className="text-2xl font-bold mb-4">Waiting for Opponent</h3>
              <p className="text-lg text-base-content/70 mb-8">
                You've made your choice! Waiting for the other player to make their selection...
              </p>
              <div className="mb-8">
                <div className="badge badge-info badge-lg">Your choice is locked in</div>
              </div>
              <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm">
                ← Back to Lobby
              </button>
            </div>
          );
        }

        return (`;

  content = content.replace(
    "case 'committing':\n        return (",
    committingCase
  );

  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed GameRoomPage.tsx\n');
}

try {
  fixHookFile();
  fixUIFile();

  console.log('🎉 All fixes applied successfully!');
  console.log('\n📋 Summary of changes:');
  console.log('1. Added waitingForOpponent state tracking');
  console.log('2. Fixed phase determination - only show revealing when BOTH players committed');
  console.log('3. Added comprehensive logging for debugging');
  console.log('4. Updated UI to show waiting state when player has committed but opponent hasn\'t');
  console.log('\n✨ The game will now correctly show:');
  console.log('   - "Choose Your Side" for players who haven\'t committed');
  console.log('   - "Waiting for Opponent" for players who have committed but opponent hasn\'t');
  console.log('   - "Time to Reveal" only when BOTH players have committed');
} catch (error) {
  console.error('❌ Error applying fixes:', error.message);
  process.exit(1);
}