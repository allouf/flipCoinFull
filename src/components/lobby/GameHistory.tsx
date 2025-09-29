import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface GameHistoryProps {
  gameHistory?: any[];
  loading?: boolean;
}

export const GameHistory: React.FC<GameHistoryProps> = ({ gameHistory, loading }) => {
  const { connected } = useWallet();
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const filteredHistory = useMemo(() => {
    let filtered = gameHistory || [];

    // Filter by result
    if (filter === 'wins') {
      filtered = filtered.filter(game => game.result === 'win');
    } else if (filter === 'losses') {
      filtered = filtered.filter(game => game.result === 'loss');
    }

    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (timeRange) {
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(game => new Date(game.completedAt) >= cutoff);
    }

    return filtered;
  }, [gameHistory, filter, timeRange]);

  const stats = useMemo(() => {
    const totalWins = filteredHistory.filter(g => g.result === 'win').length;
    const totalLosses = filteredHistory.filter(g => g.result === 'loss').length;
    const winRate = filteredHistory.length > 0 ? Math.round((totalWins / filteredHistory.length) * 100) : 0;
    const netAmount = filteredHistory.reduce((sum, game) => sum + game.netAmount, 0);

    return { totalWins, totalLosses, winRate, netAmount };
  }, [filteredHistory]);

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-base-content/60">
          Connect your wallet to view your complete game history and statistics.
        </p>
      </div>
    );
  }

  if (!gameHistory || gameHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-semibold mb-2">No Game History</h3>
        <p className="text-base-content/60">
          Your completed games will appear here. Start playing to build your history!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <div className="form-control">
            <select 
              className="select select-sm select-bordered"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All games</option>
              <option value="wins">Wins only</option>
              <option value="losses">Losses only</option>
            </select>
          </div>
          
          <div className="form-control">
            <select 
              className="select select-sm select-bordered"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-base-content/60">
          Showing {filteredHistory.length} games
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats stats-horizontal bg-base-200 w-full">
        <div className="stat">
          <div className="stat-figure text-success">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="stat-title">Total Wins</div>
          <div className="stat-value text-success">{stats.totalWins}</div>
          <div className="stat-desc">{stats.winRate}% win rate</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-error">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="stat-title">Total Losses</div>
          <div className="stat-value text-error">{stats.totalLosses}</div>
          <div className="stat-desc">Net: {stats.netAmount.toFixed(3)} SOL</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="stat-title">Games Played</div>
          <div className="stat-value text-info">{filteredHistory.length}</div>
          <div className="stat-desc">In selected period</div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2">
        {filteredHistory.map((game) => (
          <div 
            key={game.id} 
            className={`card bg-base-100 shadow-sm border-l-4 ${
              game.result === 'win' ? 'border-l-success' : 'border-l-error'
            }`}
          >
            <div className="card-body p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    game.result === 'win' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                  }`}>
                    {game.result === 'win' ? (
                      <Trophy className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm">
                      Game #{game.id.slice(-8)} • 
                      <span className={game.result === 'win' ? 'text-success' : 'text-error'}>
                        {game.result === 'win' ? 'Won' : 'Lost'}
                      </span>
                    </div>
                    <div className="text-xs text-base-content/60">
                      {new Date(game.completedAt).toLocaleString()} • 
                      Opponent: #{game.opponentId.slice(-4)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-medium">
                    {game.betAmount.toFixed(3)} SOL bet
                  </div>
                  <div className={`text-sm ${
                    game.result === 'win' ? 'text-success' : 'text-error'
                  }`}>
                    {game.result === 'win' ? '+' : '-'}{game.netAmount.toFixed(3)} SOL
                  </div>
                </div>
              </div>

              {/* Game details */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-base-300">
                <div className="flex items-center gap-4 text-xs text-base-content/60">
                  <span>Your choice: {game.yourChoice}</span>
                  <span>Opponent: {game.opponentChoice}</span>
                  <span>Result: {game.coinResult}</span>
                </div>
                
                <button className="btn btn-xs btn-ghost">
                  View on Explorer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};