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
      <header className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">🎯 Game Lobby</h1>
        </div>
        <div className="navbar-end gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Game
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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

          {/* Tabs */}
          <div className="tabs tabs-boxed mb-6">
            <a
              className={`tab ${activeTab === 'available' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <Users size={16} className="mr-2" />
              Available Games
              {availableGames && availableGames.length > 0 && (
                <span className="badge badge-primary badge-sm ml-2">{availableGames.length}</span>
              )}
            </a>
            <a
              className={`tab ${activeTab === 'running' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('running')}
            >
              <Clock size={16} className="mr-2" />
              Running Games
              {runningGames && runningGames.length > 0 && (
                <span className="badge badge-secondary badge-sm ml-2">{runningGames.length}</span>
              )}
            </a>
            <a
              className={`tab ${activeTab === 'my-games' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('my-games')}
            >
              <Trophy size={16} className="mr-2" />
              My Games
              {myGames && myGames.length > 0 && (
                <span className="badge badge-accent badge-sm ml-2">{myGames.length}</span>
              )}
            </a>
            <a
              className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} className="mr-2" />
              History
              {gameHistory && gameHistory.length > 0 && (
                <span className="badge badge-neutral badge-sm ml-2">{gameHistory.length}</span>
              )}
            </a>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
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