import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameDiscovery } from '../../hooks/useGameDiscovery';
import { GameData, GameStatus } from '../../types/game';
import { Filters } from './Filters';
import { GameCard } from './GameCard';
import { SearchBar } from './SearchBar';
import { Pagination } from './Pagination';
import { Tabs } from './Tabs';
import './styles.css';

// Global flag to prevent multiple GameLobby instances from making initial requests
let hasInitialLoadStarted = false;

interface GameLobbyProps {
  onJoinGame?: (gamePda: string, gameId: number) => void;
  onRejoinGame?: (gamePda: string, gameId: number) => void;
  onCreateGameClick?: () => void;
  shouldRefresh?: boolean;
}

type TabType = 'available' | 'running' | 'my-rooms' | 'history' | 'refund';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'time';
type BetRange = 'all' | 'low' | 'medium' | 'high';

export const GameLobby: React.FC<GameLobbyProps> = ({
  onJoinGame,
  onRejoinGame,
  onCreateGameClick,
  shouldRefresh
}) => {
  const { publicKey } = useWallet();
  const { games, isLoading, error, refreshGames } = useGameDiscovery();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [betAmountFilter, setBetAmountFilter] = useState<BetRange>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const itemsPerPage = 6;

  // Initial load of games when component mounts
  useEffect(() => {
    if (!hasInitialLoad && !hasInitialLoadStarted) {
      console.log('🔄 GameLobby mounted, loading games for the first time...');
      hasInitialLoadStarted = true;
      refreshGames();
      setHasInitialLoad(true);
    }
  }, [hasInitialLoad, refreshGames]);

  // Manual refresh when shouldRefresh prop changes
  useEffect(() => {
    if (shouldRefresh) {
      refreshGames();
    }
  }, [shouldRefresh, refreshGames]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, betAmountFilter, activeTab]);

  // Calculate tab counts (for all tabs regardless of active tab)
  const tabCounts = useMemo(() => {
    const available = games.filter(game =>
      game.status === 'WaitingForPlayer' &&
      (!publicKey || game.playerA !== publicKey.toString())
    ).length;

    const running = games.filter(game =>
      ['PlayersReady', 'CommitmentsReady', 'RevealingPhase'].includes(game.status)
    ).length;

    const myRooms = publicKey ? games.filter(game =>
      game.playerA === publicKey.toString()
    ).length : 0;

    return {
      available,
      running,
      'my-rooms': myRooms
    };
  }, [games, publicKey]);

  // Filter games based on current criteria
  const filteredGames = useMemo(() => {
    let filtered = [...games];

    // Filter by status/tab
    filtered = filtered.filter(game => {
      switch (activeTab) {
        case 'available':
          return game.status === 'WaitingForPlayer' &&
                 (!publicKey || game.playerA !== publicKey.toString());
        case 'running':
          return ['PlayersReady', 'CommitmentsReady', 'RevealingPhase'].includes(game.status);
        case 'my-rooms':
          return publicKey && game.playerA === publicKey.toString();
        default:
          return true;
      }
    });

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(game =>
        game.gameId.toString().includes(term) ||
        game.playerA.toLowerCase().includes(term)
      );
    }

    // Apply bet amount filter
    filtered = filtered.filter(game => {
      switch (betAmountFilter) {
        case 'low':
          return game.betAmount <= 0.1;
        case 'medium':
          return game.betAmount > 0.1 && game.betAmount <= 1;
        case 'high':
          return game.betAmount > 1;
        default:
          return true;
      }
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'highest':
          return b.betAmount - a.betAmount;
        case 'lowest':
          return a.betAmount - b.betAmount;
        case 'time':
          return b.timeRemaining - a.timeRemaining;
        default:
          return 0;
      }
    });

    return filtered;
  }, [games, activeTab, searchTerm, betAmountFilter, sortBy, publicKey]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const displayedGames = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGames.slice(start, start + itemsPerPage);
  }, [filteredGames, currentPage]);

  const handleJoinGame = (gamePda: string, gameId: number) => {
    console.log(`Joining game ${gameId} at ${gamePda}`);
    onJoinGame?.(gamePda, gameId);
  };

  const handleRejoinGame = (gamePda: string, gameId: number) => {
    console.log(`Rejoining game ${gameId} at ${gamePda}`);
    onRejoinGame?.(gamePda, gameId);
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="alert alert-error">
          <span>Error loading games: {error}</span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/60">Loading games...</p>
        </div>
      );
    }

    if (filteredGames.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {activeTab === 'available' ? '🎲' : activeTab === 'running' ? '⚡' : '🏠'}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            No {activeTab === 'available' ? 'Available' : activeTab === 'running' ? 'Running' : 'My'} Games
          </h3>
          <p className="text-base-content/60 mb-4">
            {activeTab === 'available'
              ? 'No one is waiting for a game right now. Be the first to create one!'
              : activeTab === 'running'
              ? 'No games are currently in progress.'
              : "You haven't created any games yet."}
          </p>
          {activeTab === 'available' && (
            <button
              className="btn btn-primary"
              onClick={() => onCreateGameClick?.()}
            >
              Create New Game
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {displayedGames.map((game) => (
          <GameCard
            key={game.gamePda}
            game={{
              ...game,
              status: game.status === 'TimedOut' ? 'Resolved' : game.status
            }}
            isCurrentPlayer={publicKey?.toString() === game.playerA}
            onJoin={handleJoinGame}
            onRejoin={handleRejoinGame}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="card-title text-2xl">Game Lobby</h2>
            <div className="flex items-center gap-4">
              <button
                className={`btn btn-sm btn-ghost ${isLoading ? 'loading' : ''}`}
                onClick={refreshGames}
                disabled={isLoading}
                title="Refresh game list"
              >
                {!isLoading && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              {publicKey && (
                <div className="text-sm text-base-content/60">
                  Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCounts={tabCounts}
          />

          {/* Filters */}
          <div className="my-4">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <Filters
              sortBy={sortBy}
              onSortChange={setSortBy}
              betFilter={betAmountFilter}
              onBetFilterChange={setBetAmountFilter}
            />
          </div>

          {/* Game List */}
          <div className="min-h-[400px]">
            {renderContent()}
          </div>

          {/* Pagination */}
          {filteredGames.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};
