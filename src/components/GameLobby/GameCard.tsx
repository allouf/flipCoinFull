import React from 'react';
import { GameData } from '../../types/game';

interface GameCardProps {
  game: GameData;
  isCurrentPlayer?: boolean;
  onJoin: (gamePda: string, gameId: number) => void;
  onRejoin: (gamePda: string, gameId: number) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isCurrentPlayer,
  onJoin,
  onRejoin,
}) => {
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (game.status) {
      case 'WaitingForPlayer':
        return 'badge-primary';
      case 'PlayersReady':
      case 'CommitmentsReady':
        return 'badge-warning';
      case 'RevealingPhase':
        return 'badge-info';
      case 'Resolved':
        return 'badge-success';
      default:
        return 'badge-ghost';
    }
  };

  const copyGameLink = () => {
    const url = `${window.location.origin}/game/${game.gameId}?pda=${game.gamePda}`;
    navigator.clipboard.writeText(url);
    console.log(`📋 Copied game link: ${url}`);
    // TODO: Add a toast notification here if you have a toast system
  };

  return (
    <div
      key={game.gamePda}
      className={`card bg-base-200 shadow-lg ${
        game.status === 'RevealingPhase' ? 'border-l-4 border-l-warning' : ''
      }`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="card-title text-lg flex items-center gap-2">
              {game.status === 'RevealingPhase' && '⚡'} Game #{game.gameId}
              <div className={`badge ${getStatusColor()} badge-sm`}>
                {game.status}
              </div>
            </h4>
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-base-content/60">Bet:</span>
                <span className="font-semibold">{game.betAmount} SOL</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-base-content/60">Player:</span>
                <span className="font-mono text-xs">
                  {game.playerA.slice(0, 4)}...{game.playerA.slice(-4)}
                </span>
              </div>
              {game.playerB && (
                <div className="flex items-center gap-1">
                  <span className="text-base-content/60">Opponent:</span>
                  <span className="font-mono text-xs">
                    {game.playerB.slice(0, 4)}...{game.playerB.slice(-4)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-base-content/60">Time Left:</span>
                <span
                  className={`font-semibold ${
                    game.timeRemaining < 60
                      ? 'text-error'
                      : game.timeRemaining < 120
                      ? 'text-warning'
                      : 'text-success'
                  }`}
                >
                  {formatTimeRemaining(game.timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {game.status === 'WaitingForPlayer' &&
              (isCurrentPlayer ? (
                <>
                  <button
                    onClick={() => onRejoin(game.gamePda, game.gameId)}
                    className="btn btn-success btn-sm"
                    title="Rejoin your game (free)"
                  >
                    🎮 Rejoin
                  </button>
                  <button
                    onClick={copyGameLink}
                    className="btn btn-outline btn-xs"
                    title="Copy game link to share"
                  >
                    📋 Share Link
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onJoin(game.gamePda, game.gameId)}
                  className="btn btn-primary btn-sm"
                >
                  Join Game
                </button>
              ))}

            {game.status === 'Resolved' && (
              <div
                className={`badge ${
                  game.winner === game.playerA ? 'badge-success' : 'badge-error'
                } badge-lg`}
              >
                {game.winner === game.playerA ? 'Won' : 'Lost'}
              </div>
            )}

            {['PlayersReady', 'CommitmentsReady', 'RevealingPhase'].includes(
              game.status
            ) && (
              <div className="badge badge-info badge-sm">Active Game</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
