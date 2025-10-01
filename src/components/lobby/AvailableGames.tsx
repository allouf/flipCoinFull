import React, { useState } from 'react';
import { Clock, Users, Coins, Hash } from 'lucide-react';
import { useAnchorProgram } from '../../hooks/useAnchorProgram';

interface AvailableGamesProps {
  availableGames?: any[];
  stats?: any;
  loading?: boolean;
}

export const AvailableGames: React.FC<AvailableGamesProps> = ({ availableGames, stats, loading }) => {
  const { joinRoom } = useAnchorProgram();
  const [betFilter, setBetFilter] = useState<string>('');

  const handleJoinGame = async (game: any) => {
    try {
      await joinRoom(parseInt(game.id), game.betAmount);
      // Note: Parent component will handle data refresh
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  // Filter games based on bet amount
  const filteredGames = availableGames?.filter(game => {
    if (!betFilter) return true;
    const amount = game.betAmount;
    switch (betFilter) {
      case '0.01': return amount === 0.01;
      case '0.1': return amount === 0.1;
      case '1': return amount === 1;
      case '5': return amount >= 5;
      default: return true;
    }
  }) || [];

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
      {/* Stats */}
      {stats && (
        <div className="stats stats-horizontal bg-base-200 mb-4">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-title">Total Games</div>
            <div className="stat-value text-primary">{availableGames?.length || 0}</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Coins className="w-8 h-8" />
            </div>
            <div className="stat-title">Total Pot</div>
            <div className="stat-value text-secondary">
              {availableGames?.reduce((sum, game) => sum + (game.betAmount * 2), 0).toFixed(2)} SOL
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-sm">Bet Amount</span>
          </label>
          <select
            className="select select-sm select-bordered min-w-[150px]"
            value={betFilter}
            onChange={(e) => setBetFilter(e.target.value)}
          >
            <option value="">All amounts</option>
            <option value="0.01">0.01 SOL</option>
            <option value="0.1">0.1 SOL</option>
            <option value="1">1 SOL</option>
            <option value="5">5 SOL+</option>
          </select>
        </div>
        {betFilter && (
          <div className="form-control justify-end">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setBetFilter('')}
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* No games matching filter message */}
      {filteredGames.length === 0 && availableGames && availableGames.length > 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No Games Match Your Filter</h3>
          <p className="text-base-content/60 mb-4">
            Try adjusting your filter or clear it to see all available games
          </p>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setBetFilter('')}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Games List */}
      {filteredGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => (
          <div key={game.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {/* Game ID */}
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-base-content/60" />
                <span className="text-xs font-mono text-base-content/60">
                  Game ID: {game.id}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-8">
                      <span className="text-xs">🎮</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">
                      Player {game.creatorId ? `#${game.creatorId.slice(-6)}` : 'Unknown'}
                    </h3>
                    <div className="text-xs text-base-content/60">
                      {new Date(game.createdAt).toLocaleDateString()} {' '}
                      {new Date(game.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="badge badge-primary badge-sm">Waiting</div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="font-mono font-bold text-lg">{game.betAmount.toFixed(3)} SOL</span>
                </div>
                <div className="text-xs text-base-content/60">
                  Win: {(game.betAmount * 2 * 0.93).toFixed(4)} SOL
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
      )}
    </div>
  );
};