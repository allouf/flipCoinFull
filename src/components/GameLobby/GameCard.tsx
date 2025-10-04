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
      className={`card bg-base-200 shadow-lg hover:shadow-xl transition-shadow ${
        game.status === 'RevealingPhase' ? 'border-l-4 border-l-warning' : ''
      }`}
    >
      <div className="card-body p-3 sm:p-6">
        {/* Header: Game ID and Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h4 className="text-sm sm:text-lg font-bold flex items-center gap-1.5">
            {game.status === 'RevealingPhase' && <span className="text-warning">⚡</span>}
            <span>Game #{game.gameId}</span>
          </h4>
          <div className={`badge ${getStatusColor()} badge-sm text-[10px] sm:text-xs`}>
            {game.status}
          </div>
        </div>

        {/* Game Info - Compact Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-3 gap-y-1.5 sm:gap-4 mb-3 text-xs">
          {/* Bet Amount - Most Important */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
            <span className="text-base-content/60">Bet:</span>
            <span className="font-bold text-sm sm:text-base text-primary">{game.betAmount} SOL</span>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center gap-1">
            <span className="text-base-content/60">Time:</span>
            <span
              className={`font-semibold text-xs sm:text-sm ${
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

          {/* Player A */}
          <div className="flex items-center gap-1">
            <span className="text-base-content/60">Creator:</span>
            <span className="font-mono text-[10px] sm:text-xs">
              {game.playerA.slice(0, 4)}...{game.playerA.slice(-4)}
            </span>
          </div>

          {/* Player B if exists */}
          {game.playerB && (
            <div className="flex items-center gap-1">
              <span className="text-base-content/60">Opponent:</span>
              <span className="font-mono text-[10px] sm:text-xs">
                {game.playerB.slice(0, 4)}...{game.playerB.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {game.status === 'WaitingForPlayer' &&
            (isCurrentPlayer ? (
              <>
                <button
                  onClick={() => onRejoin(game.gamePda, game.gameId)}
                  className="btn btn-success btn-sm flex-1 h-11 text-xs sm:text-sm"
                  title="Rejoin your game (free)"
                >
                  🎮 Rejoin
                </button>
                <button
                  onClick={copyGameLink}
                  className="btn btn-outline btn-sm h-11 px-3"
                  title="Copy game link to share"
                >
                  📋
                </button>
              </>
            ) : (
              <button
                onClick={() => onJoin(game.gamePda, game.gameId)}
                className="btn btn-primary btn-sm w-full h-11 text-xs sm:text-sm font-semibold"
              >
                Join Game
              </button>
            ))}

          {game.status === 'Resolved' && (
            <div
              className={`badge ${
                game.winner === game.playerA ? 'badge-success' : 'badge-error'
              } badge-lg w-full h-11 text-sm`}
            >
              {game.winner === game.playerA ? '🏆 Won' : '❌ Lost'}
            </div>
          )}

          {['PlayersReady', 'CommitmentsReady', 'RevealingPhase'].includes(
            game.status
          ) && (
            <div className="badge badge-info w-full h-11 text-sm">⚡ Active Game</div>
          )}
        </div>
      </div>
    </div>
  );
};
