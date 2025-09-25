import React from 'react';
import { Play, Eye } from 'lucide-react';
import { useLobbyData } from '../../hooks/useLobbyData';

export const RunningGames: React.FC = () => {
  const { runningGames, stats } = useLobbyData();

  if (runningGames.length === 0) {
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
      <div className="stats stats-horizontal bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Play className="w-6 h-6" />
          </div>
          <div className="stat-title">Active Games</div>
          <div className="stat-value text-primary">{runningGames.length}</div>
          <div className="stat-desc">Currently running</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <Eye className="w-6 h-6" />
          </div>
          <div className="stat-title">Spectators</div>
          <div className="stat-value text-secondary">0</div>
          <div className="stat-desc">Watching games</div>
        </div>
      </div>

      {/* Games List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {runningGames.map((game) => (
          <div key={game.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <h3 className="card-title text-sm">Game #{game.id.slice(-8)}</h3>
                <div className="badge badge-success badge-sm gap-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  Live
                </div>
              </div>

              {/* Players */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <div className="avatar placeholder mb-1">
                    <div className="bg-primary text-primary-content rounded-full w-10">
                      <span className="text-xs">P1</span>
                    </div>
                  </div>
                  <div className="text-xs text-base-content/60">
                    #{game.player1.slice(-4)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold mb-1">VS</div>
                  <div className="text-xs text-base-content/60">Pot: {game.totalPot} SOL</div>
                </div>

                <div className="text-center">
                  <div className="avatar placeholder mb-1">
                    <div className="bg-secondary text-secondary-content rounded-full w-10">
                      <span className="text-xs">P2</span>
                    </div>
                  </div>
                  <div className="text-xs text-base-content/60">
                    #{game.player2.slice(-4)}
                  </div>
                </div>
              </div>

              {/* Game Status */}
              <div className="text-center mb-4">
                <div className="text-sm font-medium">{game.status}</div>
                <div className="text-xs text-base-content/60">
                  {game.phase === 'revealing' ? 'Revealing choices...' : 'Making selections...'}
                </div>
              </div>

              <div className="card-actions justify-center">
                <button className="btn btn-sm btn-outline gap-2">
                  <Eye className="w-4 h-4" />
                  Spectate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};