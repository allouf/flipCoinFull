import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { gameCache } from '../utils/gameCache';
import { gameSyncService } from '../services/gameSyncService';
import { gameRecoveryService } from '../services/gameRecoveryService';
import { validateGameState } from '../utils/gameValidation';

interface GameDiagnosticsProps {
  gameId: string;
  onActionComplete?: () => void;
}

export const GameDiagnostics: React.FC<GameDiagnosticsProps> = ({
  gameId,
  onActionComplete,
}) => {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

  // Fetch diagnostic data
  const refreshDiagnostics = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get cache state
      const cachedGame = gameCache.getGame(gameId);
      
      // Get sync service stats
      const syncStats = gameSyncService.getStats();
      
      // Get recovery stats
      const recoveryStats = gameRecoveryService.getStats();

      // Get current validation state if game data exists
      let validationState = null;
      if (cachedGame?.gameData) {
        validationState = await validateGameState(cachedGame.gameData, publicKey);
      }

      setDiagnosticData({
        cache: {
          exists: !!cachedGame,
          lastVerified: cachedGame?.lastVerified ? new Date(cachedGame.lastVerified).toLocaleString() : 'N/A',
          expiresAt: cachedGame?.expiresAt ? new Date(cachedGame.expiresAt).toLocaleString() : 'N/A',
          phase: cachedGame?.phase || 'N/A',
          status: cachedGame?.status || 'N/A',
        },
        sync: {
          lastSync: syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleString() : 'N/A',
          successfulSyncs: syncStats.successfulSyncs,
          failedSyncs: syncStats.failedSyncs,
          activeSubscriptions: syncStats.activeSubscriptions,
        },
        recovery: {
          totalAttempts: recoveryStats.totalAttempts,
          successfulRecoveries: recoveryStats.successfulRecoveries,
          failedRecoveries: recoveryStats.failedRecoveries,
          lastAttempt: recoveryStats.lastRecoveryAttempt ? new Date(recoveryStats.lastRecoveryAttempt).toLocaleString() : 'N/A',
        },
        validation: validationState,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshDiagnostics();
  }, [gameId, publicKey]);

  const handleForceRefresh = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear cache for this game
      gameCache.invalidateGame(gameId);
      
      // Force sync refresh
      await gameSyncService.startSync({
        interval: 5000,
        maxRetries: 3,
        retryDelay: 1000,
      });

      // Refresh diagnostics
      await refreshDiagnostics();

      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force refresh');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceRecovery = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await gameRecoveryService.attemptRecovery(gameId, publicKey);
      
      if (result.success) {
        // Refresh diagnostics after successful recovery
        await refreshDiagnostics();
        onActionComplete?.();
      } else {
        setError(`Recovery failed: ${result.details}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force recovery');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="alert alert-error">
        <div>
          <span className="font-bold">Error:</span> {error}
        </div>
      </div>
    );
  }

  if (!diagnosticData) {
    return (
      <div className="text-center p-4">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cache State */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Cache State</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td className="font-medium">Exists</td>
                  <td>{diagnosticData.cache.exists ? '✓' : '✗'}</td>
                </tr>
                <tr>
                  <td className="font-medium">Last Verified</td>
                  <td>{diagnosticData.cache.lastVerified}</td>
                </tr>
                <tr>
                  <td className="font-medium">Expires At</td>
                  <td>{diagnosticData.cache.expiresAt}</td>
                </tr>
                <tr>
                  <td className="font-medium">Phase</td>
                  <td>{diagnosticData.cache.phase}</td>
                </tr>
                <tr>
                  <td className="font-medium">Status</td>
                  <td>{diagnosticData.cache.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sync Stats */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Sync Statistics</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td className="font-medium">Last Sync</td>
                  <td>{diagnosticData.sync.lastSync}</td>
                </tr>
                <tr>
                  <td className="font-medium">Successful Syncs</td>
                  <td>{diagnosticData.sync.successfulSyncs}</td>
                </tr>
                <tr>
                  <td className="font-medium">Failed Syncs</td>
                  <td>{diagnosticData.sync.failedSyncs}</td>
                </tr>
                <tr>
                  <td className="font-medium">Active Subscriptions</td>
                  <td>{diagnosticData.sync.activeSubscriptions}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recovery Stats */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Recovery Statistics</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td className="font-medium">Total Attempts</td>
                  <td>{diagnosticData.recovery.totalAttempts}</td>
                </tr>
                <tr>
                  <td className="font-medium">Successful Recoveries</td>
                  <td>{diagnosticData.recovery.successfulRecoveries}</td>
                </tr>
                <tr>
                  <td className="font-medium">Failed Recoveries</td>
                  <td>{diagnosticData.recovery.failedRecoveries}</td>
                </tr>
                <tr>
                  <td className="font-medium">Last Attempt</td>
                  <td>{diagnosticData.recovery.lastAttempt}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Validation State */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Validation State</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td className="font-medium">Is Valid</td>
                  <td>
                    <span className={diagnosticData.validation?.isValid ? 'text-success' : 'text-error'}>
                      {diagnosticData.validation?.isValid ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">Status</td>
                  <td>{diagnosticData.validation?.status}</td>
                </tr>
                <tr>
                  <td className="font-medium">Details</td>
                  <td>{diagnosticData.validation?.details}</td>
                </tr>
                <tr>
                  <td className="font-medium">Last Check</td>
                  <td>
                    {diagnosticData.validation?.timestamp
                      ? new Date(diagnosticData.validation.timestamp * 1000).toLocaleString()
                      : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleForceRefresh}
          disabled={isLoading}
          className="btn btn-primary btn-sm"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            '🔄 Force Refresh'
          )}
        </button>
        <button
          onClick={handleForceRecovery}
          disabled={isLoading}
          className="btn btn-warning btn-sm"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            '🔧 Force Recovery'
          )}
        </button>
      </div>
    </div>
  );
};