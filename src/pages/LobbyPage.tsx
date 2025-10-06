import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useFairCoinFlipper } from '../hooks/useFairCoinFlipper';
import { useLobbyData } from '../hooks/useLobbyData';
import { useWebSocket } from '../hooks/useWebSocket';
import { AvailableGames } from '../components/lobby/AvailableGames';
import { RunningGames } from '../components/lobby/RunningGames';
import { MyGames } from '../components/lobby/MyGames';
import { GameHistory } from '../components/lobby/GameHistory';
import { CreateGameModal } from '../components/game/CreateGameModal';
import { Plus, RefreshCw, Users, Clock, Trophy, History } from 'lucide-react';

type LobbyTab = 'available' | 'running' | 'my-games' | 'history';

/**
 * LobbyPage - Game lobby dashboard with proper game listings
 *
 * Shows available games, running games, user's games, and history
 * Uses the NEW unified system but with proper lobby structure
 */
export const LobbyPage: React.FC = () => {
  const { connected } = useWallet();
  const fairCoinFlipperResult = useFairCoinFlipper();
  const [activeTab, setActiveTab] = useState<LobbyTab>('available');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  // Get real lobby data
  const {
    availableGames,
    runningGames,
    myGames,
    gameHistory,
    stats,
    loading,
    error,
    refreshData
  } = useLobbyData();

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto p-8 glass-card text-center">
          <h2 className="text-2xl font-bold mb-6">
            Connect Your Wallet
          </h2>
          <p className="text-base-content/70 mb-6">
            Connect your wallet to access the game lobby and start playing
          </p>
          <div className="flex justify-center">
            <WalletMultiButton className="!btn !btn-primary !btn-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!fairCoinFlipperResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h3 className="text-xl font-semibold">Initializing Game System...</h3>
          <p className="text-gray-600 mt-2">Connecting to blockchain...</p>
        </div>
      </div>
    );
  }

  const { gameState } = fairCoinFlipperResult;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      console.log('🔄 Lobby data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGameCreated = () => {
    // Refresh data to show new game
    refreshData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'available':
        return <AvailableGames availableGames={availableGames} stats={stats} loading={loading} />;
      case 'running':
        return <RunningGames runningGames={runningGames} loading={loading} />;
      case 'my-games':
        return <MyGames myGames={myGames} loading={loading} />;
      case 'history':
        return <GameHistory gameHistory={gameHistory} loading={loading} />;
      default:
        return <AvailableGames availableGames={availableGames} stats={stats} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      {/* Header */}
      <header className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20 min-h-[50px] sm:min-h-[64px] px-2 sm:px-4">
        <div className="navbar-start flex-shrink">
          <h1 className="text-sm sm:text-xl font-bold whitespace-nowrap flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-2xl">🎯</span>
            <span>Game Lobby</span>
          </h1>
        </div>
        <div className="navbar-end gap-1 sm:gap-4 flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-xs sm:btn-md min-h-[36px] h-[36px] sm:h-auto px-2 sm:px-4"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Create Game</span>
            <span className="sm:hidden text-xs">Create</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost btn-xs sm:btn-md min-h-[36px] h-[36px] w-[36px] sm:w-auto sm:h-auto p-1 sm:p-2"
          >
            <RefreshCw size={14} className={`sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">

          {/* Active Game Notice */}
          {gameState.phase !== 'idle' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800">🎮 Active Game</h3>
              <p className="text-blue-700 text-sm">
                You have an active game #{gameState.gameId} - Click to continue playing
              </p>
              <button
                onClick={() => window.location.href = `/game/${gameState.gameId}`}
                className="mt-2 btn btn-sm btn-primary"
              >
                Continue Game
              </button>
            </div>
          )}

          {/* Tabs - Mobile Optimized: 3-Row Design with Horizontal Scroll */}
          <div className="tabs tabs-boxed mb-4 sm:mb-6 overflow-x-auto overflow-y-visible flex-nowrap p-1" style={{ minHeight: '90px' }}>
            <a
              className={`tab flex-shrink-0 flex-col items-center justify-center gap-0.5 px-3 py-2 ${activeTab === 'available' ? 'tab-active' : ''}`}
              style={{ minWidth: '95px', minHeight: '75px' }}
              onClick={() => setActiveTab('available')}
            >
              <Users size={20} className="sm:hidden" />
              <Users size={16} className="hidden sm:inline" />
              <span className="text-sm font-bold whitespace-nowrap">Available</span>
              <span className="badge badge-primary badge-xs">{availableGames?.length || 0}</span>
            </a>
            <a
              className={`tab flex-shrink-0 flex-col items-center justify-center gap-0.5 px-3 py-2 ${activeTab === 'running' ? 'tab-active' : ''}`}
              style={{ minWidth: '95px', minHeight: '75px' }}
              onClick={() => setActiveTab('running')}
            >
              <Clock size={20} className="sm:hidden" />
              <Clock size={16} className="hidden sm:inline" />
              <span className="text-sm font-bold whitespace-nowrap">Running</span>
              <span className="badge badge-secondary badge-xs">{runningGames?.length || 0}</span>
            </a>
            <a
              className={`tab flex-shrink-0 flex-col items-center justify-center gap-0.5 px-3 py-2 ${activeTab === 'my-games' ? 'tab-active' : ''}`}
              style={{ minWidth: '95px', minHeight: '75px' }}
              onClick={() => setActiveTab('my-games')}
            >
              <Trophy size={20} className="sm:hidden" />
              <Trophy size={16} className="hidden sm:inline" />
              <span className="text-sm font-bold whitespace-nowrap">My Games</span>
              <span className="badge badge-accent badge-xs">{myGames?.length || 0}</span>
            </a>
            <a
              className={`tab flex-shrink-0 flex-col items-center justify-center gap-0.5 px-3 py-2 ${activeTab === 'history' ? 'tab-active' : ''}`}
              style={{ minWidth: '95px', minHeight: '75px' }}
              onClick={() => setActiveTab('history')}
            >
              <History size={20} className="sm:hidden" />
              <History size={16} className="hidden sm:inline" />
              <span className="text-sm font-bold whitespace-nowrap">History</span>
              <span className="badge badge-neutral badge-xs">{gameHistory?.length || 0}</span>
            </a>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Create Game Modal */}
      {showCreateModal && (
        <CreateGameModal
          onClose={() => setShowCreateModal(false)}
          onGameCreated={handleGameCreated}
        />
      )}
    </div>
  );
};