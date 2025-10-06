import React, { useState } from 'react';
import { Clock, Users, Coins, Hash, Play } from 'lucide-react';
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
        <div className="flex justify-center w-full px-4">
          <div className="stats stats-vertical sm:stats-horizontal bg-base-200 w-full max-w-md">
            <div className="stat place-items-center sm:place-items-start">
              <div className="stat-figure text-primary">
                <Users className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="stat-title text-xs sm:text-sm">Active Players</div>
              <div className="stat-value text-primary text-2xl sm:text-3xl">{stats?.activeGames || 0}</div>
              <div className="stat-desc text-xs">Currently playing</div>
            </div>
            <div className="stat place-items-center sm:place-items-start">
              <div className="stat-figure text-secondary">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="stat-title text-xs sm:text-sm">Waiting Games</div>
              <div className="stat-value text-secondary text-2xl sm:text-3xl">{availableGames?.length || 0}</div>
              <div className="stat-desc text-xs">Ready to join</div>
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
        <div className="stats stats-vertical sm:stats-horizontal bg-base-200 mb-4 w-full">
          <div className="stat place-items-center sm:place-items-start">
            <div className="stat-figure text-primary">
              <Users className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Games</div>
            <div className="stat-value text-primary text-2xl sm:text-3xl">{availableGames?.length || 0}</div>
          </div>
          <div className="stat place-items-center sm:place-items-start">
            <div className="stat-figure text-secondary">
              <Coins className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm">Total Pot</div>
            <div className="stat-value text-secondary text-lg sm:text-3xl">
              {availableGames?.reduce((sum, game) => sum + (game.betAmount * 2), 0).toFixed(2)} <span className="text-sm sm:text-base">SOL</span>
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
            className="select select-sm select-bordered min-w-[150px] h-10"
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

      {/* Games List - Mobile Optimized */}
      {filteredGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {filteredGames.map((game) => (
          <div key={game.id} className="card bg-base-100 shadow-xl">
            <div className="card-body p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Header: Game ID & Badge */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-base-content/60" />
                  <span className="text-[10px] sm:text-xs font-mono text-base-content/60">
                    #{game.id}
                  </span>
                </div>
                <div className="badge badge-warning badge-xs sm:badge-sm">waiting</div>
              </div>

              {/* Creator & Date - Compact */}
              <div className="flex items-center gap-1.5">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-6 sm:w-8">
                    <span className="text-[10px] sm:text-xs">🎮</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-xs sm:text-sm truncate">
                    {game.creatorId ? `#${game.creatorId.slice(-6)}` : 'Unknown'}
                  </h3>
                  <div className="text-[10px] sm:text-xs text-base-content/60">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Bet Amount & Potential Win */}
              <div className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-warning flex-shrink-0" />
                  <span className="font-mono font-bold text-sm sm:text-base">{game.betAmount.toFixed(2)} SOL</span>
                </div>
                <div className="text-[10px] sm:text-xs text-success font-semibold">
                  Win {(game.betAmount * 2 * 0.93).toFixed(2)}
                </div>
              </div>

              {/* Join Button - Full Width */}
              <button
                className="btn btn-xs sm:btn-sm btn-primary w-full"
                onClick={() => handleJoinGame(game)}
                disabled={loading}
              >
                <Play className="w-3 h-3" />
                <span className="text-xs sm:text-sm">{loading ? 'Joining...' : 'Join Game'}</span>
              </button>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};