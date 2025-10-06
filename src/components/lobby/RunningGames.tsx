import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Play, Eye } from 'lucide-react';

interface RunningGamesProps {
  runningGames?: any[];
  stats?: any;
  loading?: boolean;
}

export const RunningGames: React.FC<RunningGamesProps> = ({ runningGames, stats, loading }) => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();

  if (!runningGames || runningGames.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-semibold mb-2">No Running Games</h3>
        <p className="text-base-content/60">
          Games currently being played will appear here. You can spectate ongoing matches!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="stats stats-vertical sm:stats-horizontal bg-base-200 w-full">
        <div className="stat place-items-center sm:place-items-start">
          <div className="stat-figure text-primary">
            <Play className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm">Active Games</div>
          <div className="stat-value text-primary text-2xl sm:text-3xl">{runningGames.length}</div>
          <div className="stat-desc text-xs">Currently running</div>
        </div>
        <div className="stat place-items-center sm:place-items-start">
          <div className="stat-figure text-secondary">
            <Eye className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm">Spectators</div>
          <div className="stat-value text-secondary text-2xl sm:text-3xl">0</div>
          <div className="stat-desc text-xs">Watching games</div>
        </div>
      </div>

      {/* Games List - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        {runningGames.map((game) => {
          // Check if current user is a player in this game
          const userAddress = publicKey?.toString();
          const isPlayer = userAddress && (
            game.player1 === userAddress ||
            game.player2 === userAddress
          );

          return (
            <div key={game.id} className="card bg-base-100 shadow-xl">
              <div className="card-body p-3 sm:p-4 space-y-2 sm:space-y-3">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-xs sm:text-sm">Game #{game.id.slice(-8)}</h3>
                  <div className="badge badge-success badge-xs sm:badge-sm gap-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-[10px] sm:text-xs">Live</span>
                  </div>
                </div>

                {/* Creator Info - Compact */}
                <div className="text-[10px] sm:text-xs text-base-content/60">
                  {game.creatorId === userAddress ? '👤 You created' : `🎮 #${game.creatorId.slice(-6)}`} • {new Date(game.createdAt).toLocaleDateString()}
                </div>

                {/* Players - Compact */}
                <div className="flex justify-between items-center py-2 px-2 sm:px-3 bg-base-200/50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${game.player1 === userAddress ? 'bg-accent' : 'bg-primary'} text-primary-content`}>
                      <span className="text-[10px] sm:text-xs font-bold">{game.player1 === userAddress ? 'You' : 'P1'}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono">#{game.player1.slice(-4)}</span>
                  </div>

                  <div className="text-center px-2">
                    <div className="text-xs sm:text-sm font-bold">VS</div>
                    <div className="text-[10px] sm:text-xs text-warning font-semibold">{game.totalPot} SOL</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs font-mono">#{game.player2.slice(-4)}</span>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${game.player2 === userAddress ? 'bg-accent' : 'bg-secondary'} text-secondary-content`}>
                      <span className="text-[10px] sm:text-xs font-bold">{game.player2 === userAddress ? 'You' : 'P2'}</span>
                    </div>
                  </div>
                </div>

                {/* Status - Compact */}
                <div className="text-center py-1">
                  <div className="text-[10px] sm:text-xs text-base-content/60">
                    {game.phase === 'revealing' ? '🔓 Revealing...' : '🎲 Selecting...'}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className={`btn btn-xs sm:btn-sm w-full ${isPlayer ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  {isPlayer ? (
                    <>
                      <Play className="w-3 h-3" />
                      <span className="text-xs sm:text-sm">Continue</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span className="text-xs sm:text-sm">Watch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};