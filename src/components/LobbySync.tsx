import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { gameCache } from '../utils/gameCache';
import { gameSyncService } from '../services/gameSyncService';
import { validateGameState } from '../utils/gameValidation';
import { formatTimeRemaining } from '../utils/gameValidation';

interface LobbySyncProps {
  onGameUpdate?: (games: any[]) => void;
  onError?: (error: string) => void;
  syncInterval?: number;
}

interface SyncStatus {
  lastSync: number;
  activeGames: number;
  pendingGames: number;
  completedGames: number;
  syncInProgress: boolean;
  error: string | null;
}

export const LobbySync: React.FC<LobbySyncProps> = ({
  onGameUpdate,
  onError,
  syncInterval = 30000, // 30 seconds default
}) => {
  const { publicKey } = useWallet();
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: 0,
    activeGames: 0,
    pendingGames: 0,
    completedGames: 0,
    syncInProgress: false,
    error: null,
  });
  const [expandedView, setExpandedView] = useState(false);

  // Function to process and filter games
  const processGames = useCallback(async () => {
    const allGames = gameCache.getAllGames();
    const now = Date.now();

    const processedGames = await Promise.all(
      allGames.map(async game => {
        // Validate each game
        const validation = await validateGameState(game.gameData, publicKey);
        return {
          ...game,
          validation,
          timeRemaining: game.expiresAt - now,
        };
      })
    );

    // Filter and categorize games
    const activeGames = processedGames.filter(
      game => game.validation.isValid && game.validation.status === 'active'
    );

    const pendingGames = processedGames.filter(
      game => 
        game.validation.isValid && 
        (game.phase === 'waiting' || game.phase === 'selection')
    );

    const completedGames = processedGames.filter(
      game => game.validation.status === 'completed'
    );

    // Update status
    setStatus(prev => ({
      ...prev,
      activeGames: activeGames.length,
      pendingGames: pendingGames.length,
      completedGames: completedGames.length,
    }));

    // Notify parent of game updates
    onGameUpdate?.(processedGames);

    return processedGames;
  }, [publicKey, onGameUpdate]);

  // Function to perform sync
  const performSync = useCallback(async () => {
    if (!publicKey || status.syncInProgress) return;

    setStatus(prev => ({ ...prev, syncInProgress: true, error: null }));

    try {
      // Initialize services if needed
      if (!gameSyncService.isInitialized()) {
        throw new Error('Sync service not initialized');
      }

      // Start sync service
      await gameSyncService.startSync({
        interval: syncInterval,
        maxRetries: 3,
        retryDelay: 1000,
      });

      // Process games after sync
      await processGames();

      setStatus(prev => ({
        ...prev,
        lastSync: Date.now(),
        syncInProgress: false,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setStatus(prev => ({
        ...prev,
        syncInProgress: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [publicKey, syncInterval, processGames, onError]);

  // Start sync on mount and when wallet changes
  useEffect(() => {
    if (publicKey) {
      performSync();
    }

    // Set up periodic sync
    const syncTimer = setInterval(performSync, syncInterval);

    return () => {
      clearInterval(syncTimer);
      gameSyncService.stopSync();
    };
  }, [publicKey, syncInterval, performSync]);

  // Subscribe to game updates from sync service
  useEffect(() => {
    const subscription = gameSyncService.subscribe((gameId: string) => {
      processGames();
    });

    return () => {
      gameSyncService.unsubscribe(subscription);
    };
  }, [processGames]);

  // Render loading state
  if (!publicKey) {
    return (
      <div className="alert alert-info">
        <div>
          Please connect your wallet to sync games
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sync Status Bar */}
      <div 
        className={`card bg-base-200 cursor-pointer transition-all duration-300 ${
          expandedView ? 'shadow-lg' : 'shadow'
        }`}
        onClick={() => setExpandedView(!expandedView)}
      >
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {status.syncInProgress ? (
                <span className="loading loading-spinner loading-sm text-primary"></span>
              ) : (
                <span className="text-success">✓</span>
              )}
              <div>
                <span className="font-medium">Lobby Sync</span>
                <span className="text-xs text-base-content/60 ml-2">
                  {status.lastSync ? (
                    `Last sync: ${new Date(status.lastSync).toLocaleTimeString()}`
                  ) : (
                    'Never synced'
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="badge badge-primary" title="Active Games">
                {status.activeGames} active
              </div>
              <div className="badge badge-secondary" title="Pending Games">
                {status.pendingGames} pending
              </div>
              <div className="badge badge-ghost" title="Completed Games">
                {status.completedGames} completed
              </div>
            </div>
          </div>

          {/* Expanded View */}
          {expandedView && (
            <div className="mt-4 space-y-4">
              {/* Sync Controls */}
              <div className="flex justify-between items-center">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    performSync();
                  }}
                  disabled={status.syncInProgress}
                  className="btn btn-sm btn-primary"
                >
                  {status.syncInProgress ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Syncing...
                    </>
                  ) : (
                    '🔄 Force Sync'
                  )}
                </button>
                <div className="text-sm text-base-content/60">
                  Next sync in: {formatTimeRemaining(status.lastSync + syncInterval)}
                </div>
              </div>

              {/* Sync Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="stat bg-base-300 rounded-lg p-4">
                  <div className="stat-title">Sync Service</div>
                  <div className="stat-value text-lg">
                    {gameSyncService.isInitialized() ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-error">Inactive</span>
                    )}
                  </div>
                  <div className="stat-desc">
                    {gameSyncService.getStats().activeSubscriptions} active subscriptions
                  </div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-4">
                  <div className="stat-title">Cache Status</div>
                  <div className="stat-value text-lg">
                    {gameCache.getCacheStats().active} entries
                  </div>
                  <div className="stat-desc">
                    {gameCache.getCacheStats().expired} expired entries
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {status.error && (
                <div className="alert alert-error">
                  <div>
                    <span className="font-bold">Error:</span> {status.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};