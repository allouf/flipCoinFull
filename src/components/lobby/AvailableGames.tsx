import React from 'react';
import { Clock, Users, Coins } from 'lucide-react';
import { useAnchorProgram } from '../../hooks/useAnchorProgram';

interface AvailableGamesProps {
  availableGames?: any[];
  stats?: any;
  loading?: boolean;
}

export const AvailableGames: React.FC<AvailableGamesProps> = ({ availableGames, stats, loading }) => {
  const { joinRoom } = useAnchorProgram();

  const handleJoinGame = async (game: any) => {
    try {
      await joinRoom(parseInt(game.id), game.betAmount);
      // Note: Parent component will handle data refresh
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  if (!availableGames || availableGames.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-xl font-semibold mb-2">No Games Available</h3>
        <p className="text-base-content/60 mb-6">
          Be the first to create a game! Other players can then join and compete against you.
        </p>
        <div className="flex justify-center">
          <div className="stats stats-vertical lg:stats-horizontal bg-base-200">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Users className="w-8 h-8" />
              </div>
              <div className="stat-title">Active Players</div>
              <div className="stat-value text-primary">{stats?.activeGames || 0}</div>
              <div className="stat-desc">Currently playing</div>
            </div>
            <div className="stat">
              <div className="stat-figure text-secondary">
                <Clock className="w-8 h-8" />
              </div>
              <div className="stat-title">Waiting Games</div>
              <div className="stat-value text-secondary">{availableGames?.length || 0}</div>
              <div className="stat-desc">Ready to join</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm">Bet Amount</span>
          </label>
          <select className="select select-sm select-bordered w-32">
            <option value="">All amounts</option>
            <option value="0.01">0.01 SOL</option>
            <option value="0.1">0.1 SOL</option>
            <option value="1">1 SOL</option>
            <option value="5">5 SOL+</option>
          </select>
        </div>
      </div>

      {/* Games List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableGames.map((game) => (
          <div key={game.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-8">
                      <span className="text-xs">🎮</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Player #{game.creatorId.slice(-4)}</h3>
                    <div className="text-xs text-base-content/60">
                      Created {new Date(game.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="badge badge-primary badge-sm">Waiting</div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="font-mono font-medium">{game.betAmount} SOL</span>
                </div>
                <div className="text-xs text-base-content/60">
                  Winner: {(game.betAmount * 2 * 0.93).toFixed(3)} SOL
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleJoinGame(game)}
                  disabled={loading}
                >
                  {loading ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};