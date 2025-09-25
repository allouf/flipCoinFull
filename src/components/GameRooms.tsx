import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Clock, Users, Coins, Filter, RefreshCw, Copy, Search } from 'lucide-react';
import { useGameDiscovery, PublicGameInfo } from '../hooks/useGameDiscovery';
import { useFairCoinFlipper } from '../hooks/useFairCoinFlipper';

interface GameRoomsProps {
  onJoinGame?: (gamePda: string, gameId: number) => void;
}

export const GameRooms: React.FC<GameRoomsProps> = ({ onJoinGame }) => {
  const { connected, publicKey } = useWallet();
  const { games, isLoading, error, lastRefresh, refreshGames, generateGameShareUrl } = useGameDiscovery();
  const { joinExistingGame, gameState } = useFairCoinFlipper();

  // Filter states
  const [betRangeFilter, setBetRangeFilter] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [searchFilter, setSearchFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Bet range filter
      if (game.betAmount < betRangeFilter.min || game.betAmount > betRangeFilter.max) {
        return false;
      }

      // Search filter (game ID, player address, bet amount)
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const matchesGameId = game.gameId.toString().includes(search);
        const matchesPlayer = game.playerA.toLowerCase().includes(search);
        const matchesBet = game.betAmount.toString().includes(search);
        
        if (!matchesGameId && !matchesPlayer && !matchesBet) {
          return false;
        }
      }

      return true;
    });
  }, [games, betRangeFilter, searchFilter]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format player address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Handle join game
  const handleJoinGame = async (game: PublicGameInfo) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (game.playerA === publicKey.toString()) {
      alert('You cannot join your own game');
      return;
    }

    try {
      const success = await joinExistingGame(game.gameId);
      if (success && onJoinGame) {
        onJoinGame(game.gamePda, game.gameId);
      }
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };


  // Handle share game
  const handleShareGame = async (game: PublicGameInfo) => {
    const shareUrl = generateGameShareUrl(game.gameId, game.gamePda);
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Game link copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      prompt('Copy this link to share the game:', shareUrl);
    }
  };

  if (!connected) {
    return (
      <div className="glass-card p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-base-content/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Connect Wallet to Browse Games</h3>
        <p className="text-base-content/70">
          Connect your wallet to see available games and join the fun!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Game Rooms</h2>
          <p className="text-base-content/70">
            Browse and join public games • Auto-refreshes every 10s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline btn-sm gap-2 ${showFilters ? 'btn-active' : ''}`}
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            onClick={refreshGames}
            disabled={isLoading}
            className="btn btn-outline btn-sm gap-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Game ID, player, bet amount..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>

            {/* Bet Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Min Bet (SOL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={betRangeFilter.min}
                onChange={(e) => setBetRangeFilter(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Bet (SOL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={betRangeFilter.max}
                onChange={(e) => setBetRangeFilter(prev => ({ ...prev, max: parseFloat(e.target.value) || 100 }))}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-base-content/10">
            <span className="text-sm text-base-content/70">
              Showing {filteredGames.length} of {games.length} games
            </span>
            <button
              onClick={() => {
                setBetRangeFilter({ min: 0, max: 100 });
                setSearchFilter('');
              }}
              className="btn btn-ghost btn-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Last refresh indicator */}
      {lastRefresh && !isLoading && (
        <div className="text-sm text-base-content/60 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      {/* Loading state */}
      {isLoading && games.length === 0 && (
        <div className="glass-card p-8 text-center">
          <RefreshCw className="animate-spin mx-auto h-8 w-8 text-primary mb-4" />
          <p>Loading available games...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="alert alert-error">
          <span>Failed to load games: {error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredGames.length === 0 && games.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-base-content/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Games Available</h3>
          <p className="text-base-content/70 mb-4">
            Be the first to create a game and let others join!
          </p>
        </div>
      )}

      {/* No filtered results */}
      {!isLoading && !error && filteredGames.length === 0 && games.length > 0 && (
        <div className="glass-card p-8 text-center">
          <Filter className="mx-auto h-12 w-12 text-base-content/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Games Match Your Filters</h3>
          <p className="text-base-content/70 mb-4">
            Try adjusting your search criteria or clearing filters.
          </p>
          <button
            onClick={() => {
              setBetRangeFilter({ min: 0, max: 100 });
              setSearchFilter('');
            }}
            className="btn btn-primary btn-sm"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Games List */}
      {filteredGames.length > 0 && (
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <div key={game.gamePda} className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">{game.betAmount} SOL</span>
                    </div>
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatTimeRemaining(game.timeRemaining)} left</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-base-content/70">
                    <span>Game #{game.gameId}</span>
                    <span>Player: {formatAddress(game.playerA)}</span>
                    <span>Created: {game.createdAt.toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleShareGame(game)}
                    className="btn btn-ghost btn-sm gap-2"
                    title="Share game link"
                  >
                    <Copy size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleJoinGame(game)}
                    disabled={gameState.isLoading || game.playerA === publicKey?.toString()}
                    className="btn btn-primary gap-2"
                  >
                    <Users size={16} />
                    {game.playerA === publicKey?.toString() ? 'Your Game' : 'Join Game'}
                  </button>
                </div>
              </div>

              {/* Progress bar for time remaining */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-base-content/60 mb-1">
                  <span>Time Remaining</span>
                  <span>{((game.timeRemaining / 300) * 100).toFixed(0)}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={game.timeRemaining} 
                  max={300}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats footer */}
      {games.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex justify-center items-center gap-8 text-sm text-base-content/70">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{games.length} Active Games</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>{games.reduce((sum, game) => sum + game.betAmount, 0).toFixed(2)} SOL Total</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Auto-refresh: 10s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
