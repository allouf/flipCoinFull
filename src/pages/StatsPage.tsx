import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, Trophy, Target, Clock, DollarSign } from 'lucide-react';
import { useTransactionHistory } from '../hooks/useTransactionHistory';

export const StatsPage: React.FC = () => {
  const { connected } = useWallet();

  // Fetch game history and statistics
  const { data, isLoading } = useTransactionHistory({
    filters: {},
    page: 1,
    limit: 1000
  });

  // Extract stats from the fetched data
  const stats = data?.stats || {
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    netProfit: 0,
    totalVolume: 0,
    averageBet: 0,
    largestWin: 0,
    largestLoss: 0,
    currentStreak: 0,
    bestStreak: 0,
    worstStreak: 0,
    gamesThisWeek: 0,
    gamesLastWeek: 0,
    profitThisWeek: 0,
    profitLastWeek: 0
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-6xl">📊</div>
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-base-content/60 text-center max-w-md">
          Connect your Solana wallet to view your gaming statistics and history.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-base-content/60">Loading your statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-bg bg-clip-text text-transparent">
          Statistics
        </h1>
        <p className="text-base-content/60 mt-1">
          Your gaming performance and statistics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Games */}
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-primary">
            <Target className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Games</div>
          <div className="stat-value text-primary">{stats.totalGames}</div>
          <div className="stat-desc">Games played</div>
        </div>

        {/* Win Rate */}
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-success">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="stat-title">Win Rate</div>
          <div className="stat-value text-success">{(stats.winRate * 100).toFixed(1)}%</div>
          <div className="stat-desc">
            {stats.totalWins}W / {stats.totalLosses}L
          </div>
        </div>

        {/* Net Profit */}
        <div className="stat bg-base-200 rounded-lg">
          <div className={`stat-figure ${stats.netProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.netProfit >= 0 ? (
              <TrendingUp className="w-8 h-8" />
            ) : (
              <TrendingDown className="w-8 h-8" />
            )}
          </div>
          <div className="stat-title">Net Profit</div>
          <div className={`stat-value ${stats.netProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(3)} SOL
          </div>
          <div className="stat-desc">
            {(stats.netProfit + stats.totalVolume).toFixed(3)} won - {stats.totalVolume.toFixed(3)} wagered
          </div>
        </div>

        {/* Current Streak */}
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-secondary">
            <Clock className="w-8 h-8" />
          </div>
          <div className="stat-title">Current Streak</div>
          <div className="stat-value text-secondary">{stats.currentStreak}</div>
          <div className="stat-desc">Best: {stats.bestStreak}</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <DollarSign className="w-5 h-5" />
              Performance Metrics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base-content/70">Average Bet Size</span>
                <span className="font-mono">{stats.averageBet.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/70">Biggest Win</span>
                <span className="font-mono text-success">
                  +{stats.largestWin.toFixed(3)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/70">Total Volume</span>
                <span className="font-mono">{stats.totalVolume.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/70">House Fees Paid</span>
                <span className="font-mono">
                  {(stats.totalVolume * 0.07).toFixed(3)} SOL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Clock className="w-5 h-5" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {stats.totalGames === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎮</div>
                  <p className="text-base-content/60">
                    No games played yet.
                    <br />
                    Start playing to see your history!
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="text-base-content/60">
                    Recent game history will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <Trophy className="w-5 h-5" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* First Game */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.totalGames > 0 ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">🎮</div>
              <div className="text-xs font-medium">First Game</div>
            </div>

            {/* First Win */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.totalWins > 0 ? 'border-success bg-success/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs font-medium">First Win</div>
            </div>

            {/* Hot Streak */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.bestStreak >= 3 ? 'border-warning bg-warning/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">🔥</div>
              <div className="text-xs font-medium">Hot Streak</div>
            </div>

            {/* High Roller */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.largestWin >= 10 ? 'border-secondary bg-secondary/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xs font-medium">High Roller</div>
            </div>

            {/* Veteran */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.totalGames >= 100 ? 'border-accent bg-accent/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">🏅</div>
              <div className="text-xs font-medium">Veteran</div>
            </div>

            {/* Lucky */}
            <div className={`text-center p-4 rounded-lg border-2 ${
              stats.winRate >= 75 && stats.totalGames >= 10 ? 'border-info bg-info/10' : 'border-base-300 bg-base-200/50'
            }`}>
              <div className="text-2xl mb-1">🍀</div>
              <div className="text-xs font-medium">Lucky</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
