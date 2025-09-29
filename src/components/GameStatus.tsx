import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { gameCache } from '../utils/gameCache';
import { formatTimeRemaining } from '../utils/gameValidation';
import { gameRecoveryService } from '../services/gameRecoveryService';

interface GameStatusProps {
  gameId: string;
  onRecoveryComplete?: () => void;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  gameId,
  onRecoveryComplete,
}) => {
  const { publicKey } = useWallet();
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameData = gameCache.getGame(gameId);
  const gameState = gameData?.validation;

  useEffect(() => {
    // Clear error when game state changes
    if (gameState?.isValid) {
      setError(null);
    }
  }, [gameState?.isValid]);

  const handleRecoveryAttempt = async () => {
    if (!publicKey) return;

    setIsRecovering(true);
    setError(null);

    try {
      const result = await gameRecoveryService.attemptRecovery(
        gameId,
        publicKey
      );

      if (result.success) {
        onRecoveryComplete?.();
      } else {
        setError(result.details);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover game');
    } finally {
      setIsRecovering(false);
    }
  };

  if (!gameData) {
    return (
      <div className="alert alert-error">
        <div>
          <span className="font-bold">Error:</span> Game data not found
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <div>
          <span className="font-bold">Error:</span> {error}
          <button
            onClick={() => setError(null)}
            className="btn btn-ghost btn-xs float-right"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!gameState?.isValid) {
    return (
      <div className="space-y-4">
        <div className="alert alert-warning">
          <div>
            <span className="font-bold">Warning:</span> {gameState?.details}
          </div>
        </div>
        
        {gameState?.status === 'expired' && (
          <div className="text-center">
            <button
              onClick={handleRecoveryAttempt}
              disabled={isRecovering}
              className="btn btn-primary btn-sm"
            >
              {isRecovering ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Recovering...
                </>
              ) : (
                '🔄 Attempt Recovery'
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Game is valid, show phase-specific status
  switch (gameData.phase) {
    case 'waiting':
      return (
        <div className="bg-info/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Waiting for Players</h3>
              <p className="text-sm opacity-70">Share the game ID to invite players</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">
                {formatTimeRemaining(gameData.expiresAt)}
              </div>
              <div className="text-xs opacity-70">until expiry</div>
            </div>
          </div>
        </div>
      );

    case 'selection':
      return (
        <div className="bg-success/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Selection Phase</h3>
              <p className="text-sm opacity-70">
                {gameData.gameData.commitmentA.length > 0 ? '✓' : '○'} Player A
                {' • '}
                {gameData.gameData.commitmentB.length > 0 ? '✓' : '○'} Player B
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">
                {formatTimeRemaining(gameData.expiresAt)}
              </div>
              <div className="text-xs opacity-70">remaining</div>
            </div>
          </div>
        </div>
      );

    case 'revealing':
      return (
        <div className="bg-warning/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Reveal Phase</h3>
              <p className="text-sm opacity-70">Ready to reveal results</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">
                {formatTimeRemaining(gameData.expiresAt)}
              </div>
              <div className="text-xs opacity-70">to reveal</div>
            </div>
          </div>
        </div>
      );

    case 'completed':
      const winner = gameData.gameData.winner?.toString();
      const isWinner = winner && publicKey?.toString() === winner;

      return (
        <div className={`rounded-lg p-4 ${isWinner ? 'bg-success/10' : 'bg-error/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {isWinner ? '🎉 You Won!' : '😔 Game Over'}
              </h3>
              <p className="text-sm opacity-70">
                Game completed
              </p>
            </div>
            <div className="badge badge-ghost">
              Completed
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="alert alert-info">
          <div>
            <span className="font-bold">Status:</span> {gameData.phase}
          </div>
        </div>
      );
  }
};