import React, { useState, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Trophy, TrendingUp, TrendingDown, Calendar, ExternalLink, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface GameHistoryProps {
  gameHistory?: any[];
  loading?: boolean;
}

export const GameHistory: React.FC<GameHistoryProps> = ({ gameHistory, loading }) => {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper function to get explorer URL for transaction
  const getExplorerUrl = (signature: string) => {
    const endpoint = connection.rpcEndpoint;
    let cluster = 'devnet';

    if (endpoint.includes('mainnet')) {
      cluster = '';
    } else if (endpoint.includes('testnet')) {
      cluster = 'testnet';
    }

    const clusterParam = cluster ? `?cluster=${cluster}` : '';
    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  };

  // Helper function to get explorer URL for game account
  const getGameAccountUrl = (accountPda: string) => {
    const endpoint = connection.rpcEndpoint;
    let cluster = 'devnet';

    if (endpoint.includes('mainnet')) {
      cluster = '';
    } else if (endpoint.includes('testnet')) {
      cluster = 'testnet';
    }

    const clusterParam = cluster ? `?cluster=${cluster}` : '';
    return `https://explorer.solana.com/address/${accountPda}${clusterParam}`;
  };

  // Copy opponent ID to clipboard
  const copyOpponentId = async (gameId: string, opponentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(opponentId);
      setCopiedId(gameId); // Use gameId as unique identifier
      toast.success('Opponent address copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy address');
    }
  };

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
      {/* Filters - Mobile Optimized */}
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-between">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          <div className="form-control">
            <select
              className="select select-xs sm:select-sm select-bordered min-h-[32px] sm:h-10 text-xs sm:text-sm"
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
              className="select select-xs sm:select-sm select-bordered min-h-[32px] sm:h-10 text-xs sm:text-sm"
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

        <div className="text-xs sm:text-sm text-base-content/60 w-full sm:w-auto text-center sm:text-left mt-1 sm:mt-0">
          Showing {filteredHistory.length} {filteredHistory.length === 1 ? 'game' : 'games'}
        </div>
      </div>

      {/* Summary Stats - Mobile Optimized */}
      <div className="stats stats-vertical sm:stats-horizontal bg-base-200 w-full shadow-sm">
        <div className="stat py-3 sm:py-4">
          <div className="stat-figure text-success">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="stat-title text-xs sm:text-sm">Total Wins</div>
          <div className="stat-value text-success text-2xl sm:text-3xl">{stats.totalWins}</div>
          <div className="stat-desc text-xs">{stats.winRate}% win rate</div>
        </div>

        <div className="stat py-3 sm:py-4">
          <div className="stat-figure text-error">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="stat-title text-xs sm:text-sm">Total Losses</div>
          <div className="stat-value text-error text-2xl sm:text-3xl">{stats.totalLosses}</div>
          <div className="stat-desc text-xs">Net: {stats.netAmount.toFixed(2)} SOL</div>
        </div>

        <div className="stat py-3 sm:py-4">
          <div className="stat-figure text-info">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="stat-title text-xs sm:text-sm">Games Played</div>
          <div className="stat-value text-info text-2xl sm:text-3xl">{filteredHistory.length}</div>
          <div className="stat-desc text-xs">In selected period</div>
        </div>
      </div>

      {/* History List - Mobile Optimized */}
      <div className="space-y-2">
        {filteredHistory.map((game) => (
          <div
            key={game.id}
            className={`card bg-base-100 shadow-sm border-l-4 ${
              game.result === 'win' ? 'border-l-success' : 'border-l-error'
            }`}
          >
            <div className="card-body p-3 sm:p-4 space-y-2">
              {/* Header: Icon + Game Info + Net Amount */}
              <div className="flex items-start gap-2">
                {/* Win/Loss Icon */}
                <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                  game.result === 'win' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                }`}>
                  {game.result === 'win' ? (
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                    <span className="whitespace-nowrap">Game #{game.id.slice(-8)}</span>
                    <span className={`font-bold ${game.result === 'win' ? 'text-success' : 'text-error'}`}>
                      {game.result === 'win' ? '✓ Won' : '✗ Lost'}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-base-content/60 mt-0.5">
                    {new Date(game.completedAt).toLocaleDateString()}
                    <span className="hidden sm:inline"> {new Date(game.completedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-base-content/60 flex items-center gap-1">
                    <span>vs #{game.opponentId}</span>
                    <button
                      onClick={(e) => copyOpponentId(game.id, (game as any).opponentIdFull || game.opponentId, e)}
                      className="hover:text-base-content transition-colors p-0.5"
                      title="Copy full opponent address"
                    >
                      {copiedId === game.id ? (
                        <Check className="w-2.5 h-2.5 text-success" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Net Amount */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-xs sm:text-sm font-medium whitespace-nowrap">
                    {game.betAmount.toFixed(2)} SOL
                  </div>
                  <div className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                    game.result === 'win' ? 'text-success' : 'text-error'
                  }`}>
                    {game.result === 'win' ? '+' : ''}{game.netAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Game details - Responsive Grid */}
              <div className="pt-2 border-t border-base-300 space-y-1.5 sm:space-y-0">
                <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs text-base-content/60">
                  <div className="text-center">
                    <div className="font-semibold text-base-content">Your choice:</div>
                    <div className="capitalize font-mono">{game.yourChoice}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-base-content">Opponent:</div>
                    <div className="capitalize font-mono">{game.opponentChoice}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-base-content">Result:</div>
                    <div className="capitalize font-mono">{game.coinResult}</div>
                  </div>
                </div>

                {/* Explorer Button - More Prominent */}
                {(game as any).accountPda && (
                  <div className="flex justify-center mt-2">
                    <a
                      href={(game as any).signature ? getExplorerUrl((game as any).signature) : getGameAccountUrl((game as any).accountPda)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary w-full sm:w-auto gap-2"
                      title={(game as any).signature ? 'View transaction on explorer' : 'View game account on explorer (includes all transactions)'}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">View on Explorer</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};