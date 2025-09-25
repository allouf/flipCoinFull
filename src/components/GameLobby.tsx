import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGameDiscovery } from '../hooks/useGameDiscovery';

interface GameLobbyProps {
  onJoinGame?: (gamePda: string, gameId: number) => void;
  onRejoinGame?: (gamePda: string, gameId: number) => void;
  onCreateGameClick?: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  onJoinGame,
  onRejoinGame,
  onCreateGameClick
}) => {
  const { publicKey } = useWallet();
  const { games, isLoading, error, lastRefresh, refreshGames } = useGameDiscovery();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'available' | 'running' | 'my-rooms' | 'history' | 'refund'>('available');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate live time remaining for a game
  const calculateTimeRemaining = (game: any): number => {
    const gameCreatedAt = new Date(game.createdAt);
    const timeoutAt = new Date(gameCreatedAt.getTime() + (300 * 1000)); // 300 seconds timeout
    return Math.max(0, Math.floor((timeoutAt.getTime() - currentTime.getTime()) / 1000));
  };

  // Initial game loading when component mounts
  useEffect(() => {
    console.log('🔄 GameLobby mounted, loading games for the first time...');
    refreshGames();
  }, []); // Empty dependency array means this only runs once when component mounts

  // Note: shouldRefresh functionality removed - manual refresh only

  // Calculate counts for all tabs (regardless of active tab)
  const tabCounts = useMemo(() => {
    const availableGames = games.filter(game => {
      const isWaitingForPlayer = game.status === 'WaitingForPlayer';
      const isNotExpired = calculateTimeRemaining(game) > 0;
      const isNotMyGame = !publicKey || game.playerA !== publicKey.toString();
      return isWaitingForPlayer && isNotExpired && isNotMyGame;
    });

    const runningGames = games.filter(game => {
      const hasBothPlayers = game.status !== 'WaitingForPlayer' && game.status !== 'Resolved' && game.status !== 'TimedOut';
      const isNotExpired = calculateTimeRemaining(game) > 0;
      return hasBothPlayers && isNotExpired;
    });

    const myRooms = games.filter(game =>
      publicKey && game.playerA === publicKey.toString() && calculateTimeRemaining(game) > 0
    );

    return {
      available: availableGames.length,
      running: runningGames.length,
      myRooms: myRooms.length,
    };
  }, [games, publicKey, calculateTimeRemaining]);

  // Enhanced game filtering with search, sort, and pagination
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
          const hasBothPlayers = game.status !== 'WaitingForPlayer' && game.status !== 'Resolved' && game.status !== 'TimedOut';
          const isNotExpired = calculateTimeRemaining(game) > 0;
          return hasBothPlayers && isNotExpired;
        });
        break;

      case 'my-rooms':
        filtered = games.filter(game =>
          publicKey && game.playerA === publicKey.toString() && calculateTimeRemaining(game) > 0
        );
        break;

      default:
        filtered = games;
    }

    return filtered;
  }, [games, activeTab, publicKey, calculateTimeRemaining]);

  const handleJoinGame = (gamePda: string, gameId: number) => {
    console.log(`Joining game ${gameId} at ${gamePda}`);
    if (onJoinGame) {
      onJoinGame(gamePda, gameId);
    }
  };

  const handleRejoinGame = (gamePda: string, gameId: number) => {
    console.log(`Rejoining own game ${gameId} at ${gamePda}`);
    if (onRejoinGame) {
      onRejoinGame(gamePda, gameId);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderAvailableGames = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Available Games ({tabCounts.available})</h3>
        <button 
          onClick={refreshGames}
          disabled={isLoading}
          className="btn btn-sm btn-outline"
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {lastRefresh && (
        <p className="text-sm text-base-content/60">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="alert alert-error">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Error loading games: {error}</span>
        </div>
      )}

      {processedGames.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎲</div>
          <h3 className="text-xl font-semibold mb-2">
            {lastRefresh ? 'No Available Games' : 'Games Not Loaded'}
          </h3>
          <p className="text-base-content/60 mb-4">
            {lastRefresh 
              ? 'No one is waiting for a game right now. Be the first to create one!' 
              : 'Click "Refresh" to load available games from the blockchain.'
            }
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={refreshGames}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Loading...' : 'Load Games'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => {
                if (onCreateGameClick) {
                  onCreateGameClick();
                } else {
                  // Fallback: scroll to create game section
                  const createGameSection = document.querySelector('[data-section="create-game"]');
                  if (createGameSection) {
                    createGameSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }
              }}
            >
              Create New Game
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/60">Loading games from blockchain...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {processedGames.map((game) => (
            <div key={game.gamePda} className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="card-title text-lg">Game #{game.gameId}</h4>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Bet:</span>
                        <span className="font-semibold">{game.betAmount} SOL</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Player:</span>
                        <span className="font-mono text-xs">
                          {game.playerA.slice(0, 4)}...{game.playerA.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Time Left:</span>
                        <span className={`font-semibold ${calculateTimeRemaining(game) < 60 ? 'text-warning' : 'text-success'}`}>
                          {formatTimeRemaining(calculateTimeRemaining(game))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleJoinGame(game.gamePda, game.gameId)}
                      className="btn btn-primary btn-sm"
                      disabled={!publicKey}
                    >
                      Join Game
                    </button>
                    <div className="badge badge-success badge-sm">
                      {game.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMyRooms = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Games ({tabCounts.myRooms})</h3>
        <button onClick={refreshGames} disabled={isLoading} className="btn btn-sm btn-outline">
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {processedGames.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold mb-2">No Games Created</h3>
          <p className="text-base-content/60">
            You haven't created any games yet. Create one to start playing!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {processedGames.map((game) => (
            <div key={game.gamePda} className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="card-title text-lg">Game #{game.gameId}</h4>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Bet:</span>
                        <span className="font-semibold">{game.betAmount} SOL</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Created:</span>
                        <span className="text-sm">{game.createdAt.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Time Left:</span>
                        <span className={`font-semibold ${calculateTimeRemaining(game) < 60 ? 'text-warning' : 'text-success'}`}>
                          {formatTimeRemaining(calculateTimeRemaining(game))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleRejoinGame(game.gamePda, game.gameId)}
                      className="btn btn-success btn-sm"
                      title="Rejoin your game (free)"
                    >
                      🎮 Rejoin
                    </button>
                    <div className="badge badge-info badge-sm">
                      Waiting for Player
                    </div>
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}?game=${game.gamePda}&gameId=${game.gameId}`;
                        navigator.clipboard.writeText(url);
                        // Simple notification (can be improved with toast)
                        const button = document.activeElement as HTMLButtonElement;
                        if (button) {
                          const originalText = button.textContent;
                          button.textContent = '✅ Copied!';
                          setTimeout(() => {
                            button.textContent = originalText;
                          }, 2000);
                        }
                      }}
                      className="btn btn-outline btn-xs"
                      title="Copy game link to share"
                    >
                      📋 Share Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRunningGames = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Running Games ({tabCounts.running})</h3>
        <button 
          onClick={refreshGames}
          disabled={isLoading}
          className="btn btn-sm btn-outline"
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {lastRefresh && (
        <p className="text-sm text-base-content/60">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {processedGames.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">No Running Games</h3>
          <p className="text-base-content/60">
            No games are currently in progress. Check back later or create a new game!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {processedGames.map((game) => (
            <div key={game.gamePda} className="card bg-base-200 shadow-lg border-l-4 border-l-warning">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="card-title text-lg flex items-center gap-2">
                      ⚡ Game #{game.gameId}
                      <div className="badge badge-warning badge-sm">In Progress</div>
                    </h4>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Bet:</span>
                        <span className="font-semibold">{game.betAmount} SOL</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Status:</span>
                        <span className="font-semibold text-warning">{game.status}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/60">Time Left:</span>
                        <span className={`font-semibold ${calculateTimeRemaining(game) < 60 ? 'text-error' : 'text-warning'}`}>
                          {formatTimeRemaining(calculateTimeRemaining(game))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="badge badge-info badge-sm">
                      Spectate Only
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📜</div>
      <h3 className="text-xl font-semibold mb-2">Game History</h3>
      <p className="text-base-content/60">
        Game history feature coming soon. Track your wins, losses, and earnings.
      </p>
    </div>
  );

  const renderRefund = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">💰</div>
      <h3 className="text-xl font-semibold mb-2">Refund Center</h3>
      <p className="text-base-content/60">
        Refund expired games feature coming soon. Recover your SOL from timed-out games.
      </p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'available':
        return renderAvailableGames();
      case 'running':
        return renderRunningGames();
      case 'my-rooms':
        return renderMyRooms();
      case 'history':
        return renderHistory();
      case 'refund':
        return renderRefund();
      default:
        return renderAvailableGames();
    }
  };

  return (
    <div className="w-full">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between mb-6">
            <h2 className="card-title text-2xl">Game Lobby</h2>
            {publicKey && (
              <div className="text-sm text-base-content/60">
                Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="tabs tabs-boxed mb-6">
            <button 
              className={`tab ${activeTab === 'available' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Available ({tabCounts.available})
            </button>
            <button 
              className={`tab ${activeTab === 'running' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('running')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Running ({tabCounts.running})
            </button>
            <button 
              className={`tab ${activeTab === 'my-rooms' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('my-rooms')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6m8-6v6m-9 4h10" />
              </svg>
              My Rooms ({tabCounts.myRooms})
            </button>
            <button 
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              History
            </button>
            <button 
              className={`tab ${activeTab === 'refund' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('refund')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Refund
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
