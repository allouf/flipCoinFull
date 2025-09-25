import { useEffect } from 'react';

interface GameStateSyncConfig {
  gameStatus: string;
  isCreator: boolean;
  playerSelection: string | null;
  opponentSelection: string | null;
  roomId: number;
  onStateChange: (change: { urgent: boolean; to: string; from?: string }) => void;
}

/**
 * Hook for monitoring game state synchronization and providing alerts
 * Currently provides basic functionality - can be enhanced later
 */
export const useGameStateSync = (config: GameStateSyncConfig) => {
  const { gameStatus, playerSelection, opponentSelection, onStateChange } = config;
  
  // Monitor for urgent state changes
  useEffect(() => {
    // Check if opponent selected while we haven't
    if (gameStatus === 'selecting' && !playerSelection && opponentSelection) {
      onStateChange({
        urgent: true,
        to: 'selecting',
        from: gameStatus
      });
    }
  }, [gameStatus, playerSelection, opponentSelection, onStateChange]);
  
  // Basic implementation - can be extended with more sophisticated monitoring
  // such as blockchain state polling, WebSocket connections, etc.
};
