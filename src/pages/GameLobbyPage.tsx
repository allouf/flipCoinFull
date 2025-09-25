import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { CreateGameModal } from '../components/game/CreateGameModal';
import { AvailableGames } from '../components/lobby/AvailableGames';
import { RunningGames } from '../components/lobby/RunningGames';
import { MyGames } from '../components/lobby/MyGames';
import { GameHistory } from '../components/lobby/GameHistory';

type LobbyTab = 'available' | 'running' | 'my-games' | 'history';

export const GameLobbyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LobbyTab>('available');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const tabs = [
    { id: 'available' as const, label: 'Available', count: 0 },
    { id: 'running' as const, label: 'Running', count: 0 },
    { id: 'my-games' as const, label: 'My Games', count: 0 },
    { id: 'history' as const, label: 'History', count: 0 }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'available':
        return <AvailableGames />;
      case 'running':
        return <RunningGames />;
      case 'my-games':
        return <MyGames />;
      case 'history':
        return <GameHistory />;
      default:
        return <AvailableGames />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-bg bg-clip-text text-transparent">
            Game Lobby
          </h1>
          <p className="text-base-content/60 mt-1">
            Create or join coin flip games with other players
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-sm btn-outline gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-sm btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Game
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab gap-2 ${
              activeTab === tab.id ? 'tab-active' : ''
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <div className="badge badge-sm badge-primary">{tab.count}</div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <CreateGameModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};