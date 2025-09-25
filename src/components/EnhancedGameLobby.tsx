import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameDiscovery } from '../hooks/useGameDiscovery';

interface EnhancedGameLobbyProps {
  onJoinGame?: (gamePda: string, gameId: number) => void;
  onRejoinGame?: (gamePda: string, gameId: number) => void;
  onCreateGameClick?: () => void;
  shouldRefresh?: boolean;
}

type TabType = 'available' | 'running' | 'my-games' | 'history';
type SortType = 'newest' | 'oldest' | 'highest' | 'lowest' | 'time';
type BetFilterType = 'all' | 'low' | 'medium' | 'high';

const EnhancedGameLobby: React.FC<EnhancedGameLobbyProps> = ({
  onJoinGame,
  onRejoinGame, 
  onCreateGameClick,
  shouldRefresh
}) => {
  const { publicKey } = useWallet();
  const { games, isLoading, error, lastRefresh, refreshGames } = useGameDiscovery();
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [betAmountFilter, setBetAmountFilter] = useState<BetFilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle external refresh trigger
  useEffect(() => {
    if (shouldRefresh) {
      handleRefresh();
    }
  }, [shouldRefresh]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, betAmountFilter, activeTab]);

  // Calculate time remaining
  const calculateTimeRemaining = useCallback((game: any): number => {
    const gameCreatedAt = new Date(game.createdAt);
    const timeoutAt = new Date(gameCreatedAt.getTime() + (300 * 1000)); // 5 minutes timeout
    return Math.max(0, Math.floor((timeoutAt.getTime() - currentTime.getTime()) / 1000));
  }, [currentTime]);

  // Enhanced refresh with loading state
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGames();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Brief delay for UX
    }
  }, [refreshGames]);

  // Game filtering functions
  const filterGamesByBetAmount = useCallback((games: any[]) => {
    if (betAmountFilter === 'all') return games;
    
    return games.filter(game => {
      const betAmount = parseFloat(game.betAmount);
      switch (betAmountFilter) {
        case 'low': return betAmount <= 0.1;
        case 'medium': return betAmount > 0.1 && betAmount <= 1;
        case 'high': return betAmount > 1;
        default: return true;
      }
    });
  }, [betAmountFilter]);

  const searchGames = useCallback((games: any[]) => {
    if (!searchTerm.trim()) return games;
    
    const term = searchTerm.toLowerCase();
    return games.filter(game => 
      game.gameId.toString().includes(term) ||
        game.playerA.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const sortGames = useCallback((games: any[]) => {
    return [...games].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return parseFloat(b.betAmount) - parseFloat(a.betAmount);
        case 'lowest':
          return parseFloat(a.betAmount) - parseFloat(b.betAmount);
        case 'time':
          return calculateTimeRemaining(b) - calculateTimeRemaining(a);
        default:
          return 0;
      }
    });
  }, [sortBy, calculateTimeRemaining]);

  // Process games based on active tab and filters
  const processedGames = useMemo(() => {
    let filtered;
    
    switch (activeTab) {
      case 'available':
        filtered = games.filter(game => {
          const isWaitingForPlayer = game.status === 'WaitingForPlayer';
          const isNotExpired = calculateTimeRemaining(game) > 0;
          const isNotMyGame = !publicKey || game.playerA !== publicKey.toString();
          return isWaitingForPlayer && isNotExpired && isNotMyGame;
        });
        break;
      
      case 'running':
        filtered = games.filter(game => {
          const hasBothPlayers = game.status !== 'WaitingForPlayer' && 
                               game.status !== 'Resolved' && 
                               game.status !== 'TimedOut';
          const isNotExpired = calculateTimeRemaining(game) > 0;
          return hasBothPlayers && isNotExpired;
        });
        break;
      
      case 'my-games':
        filtered = games.filter(game => 
          publicKey && (
            game.playerA === publicKey.toString()
          ) && calculateTimeRemaining(game) > 0
        );
        break;
      
      case 'history':
        filtered = games.filter(game => 
          publicKey && (
            game.playerA === publicKey.toString()
          ) && (game.status === 'Resolved' || game.status === 'TimedOut')
        );
        break;
      
      default:
        filtered = games;
    }
    
    // Apply filters and sorting
    const searched = searchGames(filtered);
    const betFiltered = filterGamesByBetAmount(searched);
    const sorted = sortGames(betFiltered);
    
    return sorted;
  }, [games, activeTab, publicKey, calculateTimeRemaining, searchGames, filterGamesByBetAmount, sortGames]);

  // Pagination
  const totalPages = Math.ceil(processedGames.length / itemsPerPage);
  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedGames.slice(startIndex, startIndex + itemsPerPage);
  }, [processedGames, currentPage, itemsPerPage]);

  // Utility functions
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getBetAmountColor = (amount: number): string => {
    if (amount <= 0.1) return 'text-emerald-600';
    if (amount <= 1) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'WaitingForPlayer': return 'badge-info';
      case 'PlayersReady': return 'badge-warning';
      case 'CommitmentsReady': return 'badge-secondary';
      case 'RevealingPhase': return 'badge-primary';
      case 'Resolved': return 'badge-success';
      case 'TimedOut': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('newest');
    setBetAmountFilter('all');
    setCurrentPage(1);
  };

  // Tab configuration
  const tabs = [
    { id: 'available' as TabType, label: 'Available', icon: '🎲', count: processedGames.length },
    { id: 'running' as TabType, label: 'Running', icon: '⚡', count: processedGames.length },
    { id: 'my-games' as TabType, label: 'My Games', icon: '👤', count: processedGames.length },
    { id: 'history' as TabType, label: 'History', icon: '📊', count: processedGames.length }
  ];

  return (
    <div className="enhanced-game-lobby">
      {/* Header */}
      <div className="lobby-header">
        <div className="header-content">
          <div className="title-section">
            <h2 className="lobby-title">
              <span className="title-icon">🏛️</span>
              Game Lobby
            </h2>
            <p className="lobby-subtitle">
              Find and join exciting coin flip games
            </p>
          </div>
          
          <div className="header-actions">
            <button 
              className={`refresh-btn ${isRefreshing || isLoading ? 'loading' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <span className="refresh-icon">🔄</span>
              {isRefreshing || isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            
            {onCreateGameClick && (
              <button 
                className="create-game-btn"
                onClick={onCreateGameClick}
              >
                <span className="btn-icon">➕</span>
                Create Game
              </button>
            )}
          </div>
        </div>
        
        {lastRefresh && (
          <div className="last-updated">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="lobby-tabs">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = activeTab === tab.id ? processedGames.length : 0;
          
          return (
            <button
              key={tab.id}
              className={`lobby-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {isActive && (
                <span className="tab-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="lobby-filters">
        <div className="filters-row">
          {/* Search */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by game ID or player address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Sort By */}
          <div className="filter-group">
            <label className="filter-label">Sort by:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Bet</option>
              <option value="lowest">Lowest Bet</option>
              <option value="time">Time Remaining</option>
            </select>
          </div>
          
          {/* Bet Amount Filter */}
          <div className="filter-group">
            <label className="filter-label">Bet Amount:</label>
            <select 
              value={betAmountFilter}
              onChange={(e) => setBetAmountFilter(e.target.value as BetFilterType)}
              className="filter-select"
            >
              <option value="all">All Amounts</option>
              <option value="low">≤ 0.1 SOL</option>
              <option value="medium">0.1 - 1 SOL</option>
              <option value="high">&gt; 1 SOL</option>
            </select>
          </div>
          
          {/* Clear Filters */}
          {(searchTerm || sortBy !== 'newest' || betAmountFilter !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {/* Results Summary */}
        <div className="results-summary">
          <span className="results-count">
            {processedGames.length} {processedGames.length === 1 ? 'game' : 'games'} found
          </span>
          {processedGames.length !== games.length && (
            <span className="filtered-indicator">
              (filtered from {games.length} total)
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-display">
          <span className="error-icon">⚠️</span>
          <span>Error loading games: {error}</span>
          <button onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Game List */}
      <div className="games-container">
        {isLoading && !isRefreshing ? (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Loading games from blockchain...</p>
          </div>
        ) : paginatedGames.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'available' ? '🎲' : 
               activeTab === 'running' ? '⚡' : 
               activeTab === 'my-games' ? '👤' : '📊'}
            </div>
            <h3 className="empty-title">
              {searchTerm ? 'No games match your search' : 
               activeTab === 'available' ? 'No available games' :
               activeTab === 'running' ? 'No running games' :
               activeTab === 'my-games' ? 'No games found' : 'No game history'}
            </h3>
            <p className="empty-description">
              {searchTerm ? 'Try adjusting your search terms or filters' :
               activeTab === 'available' ? 'Be the first to create a game!' :
               'Check back later for more games'}
            </p>
            {!searchTerm && activeTab === 'available' && (
              <div className="empty-actions">
                <button onClick={handleRefresh} className="secondary-btn">
                  Refresh Games
                </button>
                {onCreateGameClick && (
                  <button onClick={onCreateGameClick} className="primary-btn">
                    Create New Game
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Games Grid */}
            <div className="games-grid">
              {paginatedGames.map((game) => {
                const timeRemaining = calculateTimeRemaining(game);
                const isMyGame = publicKey && (
                  game.playerA === publicKey.toString() || 
                  game.playerB === publicKey.toString()
                );
                const canJoin = activeTab === 'available' && !isMyGame;
                
                return (
                  <div key={game.gamePda} className="game-card">
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="game-info">
                        <h4 className="game-title">
                          Game #{game.gameId}
                        </h4>
                        <div className={`game-status badge ${getStatusColor(game.status)}`}>
                          {game.status}
                        </div>
                      </div>
                      {isMyGame && (
                        <div className="my-game-indicator">
                          👤
                        </div>
                      )}
                    </div>
                    
                    {/* Card Body */}
                    <div className="card-body">
                      <div className="game-details">
                        <div className="detail-row">
                          <span className="detail-label">Bet Amount:</span>
                          <span className={`detail-value ${getBetAmountColor(parseFloat(game.betAmount))}`}>
                            {game.betAmount} SOL
                          </span>
                        </div>
                        
                        <div className="detail-row">
                          <span className="detail-label">Player A:</span>
                          <span className="detail-value address">
                            {formatAddress(game.playerA)}
                          </span>
                        </div>
                        
                        {game.playerB && game.playerB !== '11111111111111111111111111111111' && (
                          <div className="detail-row">
                            <span className="detail-label">Player B:</span>
                            <span className="detail-value address">
                              {formatAddress(game.playerB)}
                            </span>
                          </div>
                        )}
                        
                        <div className="detail-row">
                          <span className="detail-label">Time Left:</span>
                          <span className={`detail-value time ${timeRemaining < 60 ? 'urgent' : 'normal'}`}>
                            {formatTimeRemaining(timeRemaining)}
                          </span>
                        </div>
                        
                        <div className="detail-row">
                          <span className="detail-label">Created:</span>
                          <span className="detail-value">
                            {new Date(game.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Actions */}
                    <div className="card-actions">
                      {canJoin && (
                        <button 
                          className="join-game-btn"
                          onClick={() => onJoinGame?.(game.gamePda, game.gameId)}
                          disabled={timeRemaining <= 0}
                        >
                          <span className="btn-icon">🎯</span>
                          Join Game
                        </button>
                      )}
                      
                      {isMyGame && activeTab === 'my-games' && (
                        <button 
                          className="rejoin-game-btn"
                          onClick={() => onRejoinGame?.(game.gamePda, game.gameId)}
                        >
                          <span className="btn-icon">↩️</span>
                          Continue
                        </button>
                      )}
                      
                      {activeTab === 'history' && (
                        <div className="game-result">
                          {game.winner && (
                            <span className={`result-badge ${
                              isMyGame && 
                              ((publicKey?.toString() === game.winner) ? 'won' : 'lost')
                            }`}>
                              {isMyGame 
                                ? (publicKey?.toString() === game.winner ? '🏆 Won' : '😔 Lost')
                                : '🎯 Completed'
                              }
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                
                <div className="pagination-info">
                  <span className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </span>
                  
                  <span className="page-info">
                    Page {currentPage} of {totalPages} 
                    ({processedGames.length} total games)
                  </span>
                </div>
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedGameLobby;
