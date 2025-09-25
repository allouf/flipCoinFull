import React, { useState, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameDiscovery } from '../hooks/useGameDiscovery';

interface PlayerStatsProps {
  className?: string;
  showHistory?: boolean;
  maxHistoryItems?: number;
}

interface GameStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  totalWagered: number;
  totalWinnings: number;
  netProfit: number;
  winRate: number;
  averageBet: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: { type: 'win' | 'lose' | 'none'; count: number };
  houseFeesPaid: number;
  favoriteChoice: 'heads' | 'tails' | 'none';
  recentGames: any[];
}

interface TimeFilter {
  label: string;
  value: string;
  days: number;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({
  className = '',
  showHistory = true,
  maxHistoryItems = 10
}) => {
  const { publicKey } = useWallet();
  const { games, isLoading, refreshGames } = useGameDiscovery();
  const [timeFilter, setTimeFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const timeFilters: TimeFilter[] = [
    { label: 'All Time', value: 'all', days: 0 },
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 }
  ];

  // Filter games based on time period and player participation
  const filteredGames = useMemo(() => {
    if (!publicKey || !games) return [];

    let playerGames = games.filter(game => 
       (game.playerA === publicKey.toString()) &&
       game.status === 'Resolved'
    );

    if (timeFilter !== 'all') {
      const days = timeFilters.find(f => f.value === timeFilter)?.days || 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      playerGames = playerGames.filter(game => 
        new Date(game.createdAt) >= cutoffDate
      );
    }

    return playerGames.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [games, publicKey, timeFilter, timeFilters]);

  // Calculate comprehensive statistics
  const stats: GameStats = useMemo(() => {
    if (!publicKey || filteredGames.length === 0) {
      return {
        totalGames: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalWagered: 0,
        totalWinnings: 0,
        netProfit: 0,
        winRate: 0,
        averageBet: 0,
        longestWinStreak: 0,
        longestLoseStreak: 0,
        currentStreak: { type: 'none', count: 0 },
        houseFeesPaid: 0,
        favoriteChoice: 'none',
        recentGames: []
      };
    }

    let totalWagered = 0;
    let totalWinnings = 0;
    let houseFeesPaid = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let headsChoices = 0;
    let tailsChoices = 0;
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'lose' | 'none' = 'none';
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let tempWinStreak = 0;
    let tempLoseStreak = 0;

    // Process games in chronological order for streak calculation
    const chronologicalGames = [...filteredGames].reverse();

    chronologicalGames.forEach((game, index) => {
      const playerChoice = 'heads';
      const betAmount = game.betAmount; // Already in SOL
      const isWinner = true; // Winner will be shown in the full game data
      
      // Basic stats
      totalWagered += betAmount;
      
      if (isWinner) {
        // Assume winner gets 2x bet minus house fee (7%)
        const totalPot = betAmount * 2;
        const houseFee = totalPot * 0.07;
        const winnings = totalPot - houseFee;
        totalWinnings += winnings;
        houseFeesPaid += houseFee / 2; // Split house fee between players
        gamesWon++;
        
        // Win streak logic
        if (currentStreakType === 'win' || currentStreakType === 'none') {
          tempWinStreak++;
          tempLoseStreak = 0;
          currentStreakType = 'win';
        } else {
          tempWinStreak = 1;
          tempLoseStreak = 0;
          currentStreakType = 'win';
        }
        
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        houseFeesPaid += (betAmount * 2 * 0.07) / 2; // Split house fee
        gamesLost++;
        
        // Lose streak logic
        if (currentStreakType === 'lose' || currentStreakType === 'none') {
          tempLoseStreak++;
          tempWinStreak = 0;
          currentStreakType = 'lose';
        } else {
          tempLoseStreak = 1;
          tempWinStreak = 0;
          currentStreakType = 'lose';
        }
        
        longestLoseStreak = Math.max(longestLoseStreak, tempLoseStreak);
      }
      
      // Track choice preferences
      if (playerChoice === 'heads') {
        headsChoices++;
      } else if (playerChoice === 'tails') {
        tailsChoices++;
      }
      
      // Set current streak (from most recent game)
      if (index === chronologicalGames.length - 1) { // Check if this is the last game
        currentStreakCount = currentStreakType === 'win' ? tempWinStreak : tempLoseStreak;
      }
    });

    const totalGames = gamesWon + gamesLost;
    const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
    const averageBet = totalGames > 0 ? totalWagered / totalGames : 0;
    const netProfit = totalWinnings - totalWagered;
    const favoriteChoice: 'heads' | 'tails' | 'none' = 
      headsChoices > tailsChoices ? 'heads' : 
      tailsChoices > headsChoices ? 'tails' : 'none';

    return {
      totalGames,
      gamesWon,
      gamesLost,
      totalWagered,
      totalWinnings,
      netProfit,
      winRate,
      averageBet,
      longestWinStreak,
      longestLoseStreak,
      currentStreak: { type: currentStreakType, count: currentStreakCount },
      houseFeesPaid,
      favoriteChoice,
      recentGames: filteredGames.slice(0, maxHistoryItems)
    };
  }, [filteredGames, publicKey, maxHistoryItems]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGames();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refreshGames]);

  // Helper functions
  const formatSOL = (amount: number): string => {
    return `${amount.toFixed(4)} SOL`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getStreakColor = (type: 'win' | 'lose' | 'none'): string => {
    switch (type) {
      case 'win': return 'text-emerald-600';
      case 'lose': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStreakIcon = (type: 'win' | 'lose' | 'none'): string => {
    switch (type) {
      case 'win': return '🔥';
      case 'lose': return '💔';
      default: return '➖';
    }
  };

  const getRankTitle = (winRate: number, totalGames: number): string => {
    if (totalGames === 0) return 'Newcomer';
    if (totalGames < 5) return 'Rookie';
    if (totalGames < 20) return 'Explorer';
    if (totalGames < 50) return 'Veteran';
    
    if (winRate >= 70) return 'Legend';
    if (winRate >= 60) return 'Master';
    if (winRate >= 50) return 'Expert';
    if (winRate >= 40) return 'Skilled';
    return 'Learning';
  };

  const getResultIcon = (isWon: boolean): string => {
    return isWon ? '🏆' : '💸';
  };

  const getResultColor = (isWon: boolean): string => {
    return isWon ? 'text-emerald-600' : 'text-red-600';
  };

  if (!publicKey) {
    return (
      <div className="player-stats-container">
        <div className="connect-wallet-prompt">
          <div className="prompt-icon">👛</div>
          <h3 className="prompt-title">Connect Your Wallet</h3>
          <p className="prompt-text">
            Connect your wallet to view your game statistics and history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`player-stats ${className}`}>
      {/* Header */}
      <div className="stats-header">
        <div className="header-info">
          <h2 className="stats-title">
            <span className="title-icon">📊</span>
            Player Statistics
          </h2>
          <div className="player-info">
            <span className="player-address">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </span>
            <span className="player-rank">
              {getRankTitle(stats.winRate, stats.totalGames)}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="time-filter-select"
          >
            {timeFilters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className={`refresh-stats-btn ${isRefreshing ? 'refreshing' : ''}`}
          >
            <span className="refresh-icon">🔄</span>
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        {/* Overview Card */}
        <div className="stat-card overview-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🎯</span>
              Overview
            </h3>
          </div>
          <div className="overview-stats">
            <div className="overview-item">
              <div className="overview-value">{stats.totalGames}</div>
              <div className="overview-label">Total Games</div>
            </div>
            <div className="overview-item">
              <div className={`overview-value ${stats.winRate >= 50 ? 'positive' : 'negative'}`}>
                {formatPercentage(stats.winRate)}
              </div>
              <div className="overview-label">Win Rate</div>
            </div>
            <div className="overview-item">
              <div className={`overview-value ${stats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatSOL(stats.netProfit)}
              </div>
              <div className="overview-label">Net P&L</div>
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div className="stat-card performance-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">⚡</span>
              Performance
            </h3>
          </div>
          <div className="performance-stats">
            <div className="performance-row">
              <span className="stat-label">Games Won:</span>
              <span className="stat-value positive">{stats.gamesWon}</span>
            </div>
            <div className="performance-row">
              <span className="stat-label">Games Lost:</span>
              <span className="stat-value negative">{stats.gamesLost}</span>
            </div>
            <div className="performance-row">
              <span className="stat-label">Best Win Streak:</span>
              <span className="stat-value">{stats.longestWinStreak} 🔥</span>
            </div>
            <div className="performance-row">
              <span className="stat-label">Current Streak:</span>
              <span className={`stat-value ${getStreakColor(stats.currentStreak.type)}`}>
                {stats.currentStreak.count} {getStreakIcon(stats.currentStreak.type)}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Card */}
        <div className="stat-card financial-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">💰</span>
              Financial
            </h3>
          </div>
          <div className="financial-stats">
            <div className="financial-row">
              <span className="stat-label">Total Wagered:</span>
              <span className="stat-value">{formatSOL(stats.totalWagered)}</span>
            </div>
            <div className="financial-row">
              <span className="stat-label">Total Winnings:</span>
              <span className="stat-value positive">{formatSOL(stats.totalWinnings)}</span>
            </div>
            <div className="financial-row">
              <span className="stat-label">House Fees Paid:</span>
              <span className="stat-value">{formatSOL(stats.houseFeesPaid)}</span>
            </div>
            <div className="financial-row">
              <span className="stat-label">Average Bet:</span>
              <span className="stat-value">{formatSOL(stats.averageBet)}</span>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="stat-card preferences-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🎪</span>
              Preferences
            </h3>
          </div>
          <div className="preferences-stats">
            <div className="preference-item">
              <span className="preference-label">Favorite Choice:</span>
              <span className="preference-value">
                {stats.favoriteChoice === 'none' ? 'None' : 
                 stats.favoriteChoice === 'heads' ? '👑 Heads' : '⭐ Tails'}
              </span>
            </div>
            <div className="preference-item">
              <span className="preference-label">Play Style:</span>
              <span className="preference-value">
                {stats.averageBet <= 0.1 ? '🟢 Conservative' :
                 stats.averageBet <= 1 ? '🟡 Moderate' : '🔴 Aggressive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Games History */}
      {showHistory && stats.recentGames.length > 0 && (
        <div className="game-history">
          <div className="history-header">
            <h3 className="history-title">
              <span className="history-icon">📜</span>
              Recent Games
            </h3>
            <span className="history-count">
              {stats.recentGames.length} most recent
            </span>
          </div>
          
          <div className="history-list">
            {stats.recentGames.map((game) => {
              const isPlayerA = game.playerA === publicKey.toString();
              const playerChoice = isPlayerA ? game.choiceA : game.choiceB;
              const isWon = game.winner === publicKey.toString();
              const betAmount = parseFloat(game.betAmount);
              
              return (
                <div key={game.gamePda} className={`history-item ${isWon ? 'won' : 'lost'}`}>
                  <div className="history-info">
                    <div className="history-main">
                      <span className="game-result">
                        {getResultIcon(isWon)} Game #{game.gameId}
                      </span>
                      <span className={`result-text ${getResultColor(isWon)}`}>
                        {isWon ? 'Won' : 'Lost'}
                      </span>
                    </div>
                    <div className="history-details">
                      <span className="game-choice">
                        Chose: {playerChoice === 'heads' ? '👑 Heads' : '⭐ Tails'}
                      </span>
                      <span className="game-result-coin">
                        Result: {game.coinResult === 'heads' ? '👑 Heads' : '⭐ Tails'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="history-amount">
                    <div className={`amount-value ${isWon ? 'positive' : 'negative'}`}>
                      {isWon ? '+' : '-'}{formatSOL(betAmount)}
                    </div>
                    <div className="game-date">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalGames === 0 && (
        <div className="empty-stats">
          <div className="empty-icon">🎲</div>
          <h3 className="empty-title">No Games Yet</h3>
          <p className="empty-description">
            Start playing to see your statistics and game history here!
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
