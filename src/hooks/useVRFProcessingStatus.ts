import { useState, useEffect, useCallback } from 'react';
import { vrfStatusManager, VRFGameStatus } from '../services/VRFStatusManager';
import { VRFStatusUpdate } from '../services/VRFRetryHandler';

export interface VRFProcessingState {
  isProcessing: boolean;
  gameId: string | null;
  status: VRFGameStatus | null;
  progress: number; // 0-100
  statusText: string;
  canCancel: boolean;
  error: string | null;
  history: VRFStatusUpdate[];
}

export interface VRFProcessingHook {
  processingState: VRFProcessingState;
  startProcessing: (gameId: string, roomId: number) => void;
  cancelProcessing: () => void;
  clearError: () => void;
  getProcessingStats: () => ReturnType<typeof vrfStatusManager.getProcessingStats>;
  getAllActiveGames: () => VRFGameStatus[];
}

/**
 * useVRFProcessingStatus - Hook for managing VRF processing status in UI
 * 
 * Features:
 * - Real-time VRF processing status updates
 * - Progress calculation and user-friendly status text
 * - Error handling and retry status
 * - Processing history for debugging
 */
export const useVRFProcessingStatus = (): VRFProcessingHook => {
  const [processingState, setProcessingState] = useState<VRFProcessingState>({
    isProcessing: false,
    gameId: null,
    status: null,
    progress: 0,
    statusText: 'Ready',
    canCancel: false,
    error: null,
    history: [],
  });

  /**
   * Start VRF processing tracking
   */
  const startProcessing = useCallback((gameId: string, roomId: number) => {
    vrfStatusManager.startTracking(gameId, roomId);
    
    setProcessingState({
      isProcessing: true,
      gameId,
      status: null,
      progress: 10,
      statusText: 'Initializing VRF request...',
      canCancel: true,
      error: null,
      history: [],
    });
  }, []);

  /**
   * Cancel VRF processing
   */
  const cancelProcessing = useCallback(() => {
    if (processingState.gameId) {
      vrfStatusManager.completeGame(processingState.gameId, false, null, 'Cancelled by user');
    }
    
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      gameId: null,
      status: null,
      progress: 0,
      statusText: 'Cancelled',
      canCancel: false,
    }));
  }, [processingState.gameId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setProcessingState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Get processing statistics
   */
  const getProcessingStats = useCallback(() => {
    return vrfStatusManager.getProcessingStats();
  }, []);

  /**
   * Get all active games
   */
  const getAllActiveGames = useCallback(() => {
    return vrfStatusManager.getActiveGames();
  }, []);

  /**
   * Calculate progress percentage based on status
   */
  const calculateProgress = useCallback((status: VRFGameStatus): number => {
    switch (status.status) {
      case 'pending':
        return 10;
      case 'processing':
        // Base progress on attempt and time elapsed
        const attemptProgress = (status.attempt / status.maxAttempts) * 60;
        const timeProgress = Math.min((status.timeElapsed / 10000) * 20, 20); // Up to 20% for time
        return Math.min(attemptProgress + timeProgress, 80);
      case 'retrying':
        return Math.min(20 + (status.attempt / status.maxAttempts) * 50, 70);
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }, []);

  /**
   * Generate user-friendly status text
   */
  const generateStatusText = useCallback((status: VRFGameStatus): string => {
    switch (status.status) {
      case 'pending':
        return 'Preparing VRF request...';
      case 'processing':
        if (status.vrfAccount) {
          const waitTime = status.estimatedWaitTime 
            ? ` (est. ${Math.round(status.estimatedWaitTime / 1000)}s)`
            : '';
          return `Processing with ${status.vrfAccount}${waitTime}`;
        }
        return 'Processing VRF request...';
      case 'retrying':
        return `Retrying (attempt ${status.attempt}/${status.maxAttempts})...`;
      case 'completed':
        return 'VRF completed successfully!';
      case 'failed':
        return status.error || 'VRF processing failed';
      default:
        return 'Unknown status';
    }
  }, []);

  /**
   * Handle status updates from VRF manager
   */
  useEffect(() => {
    const handleStatusUpdate = (status: VRFGameStatus) => {
      // Only update if it's our tracked game
      if (status.gameId === processingState.gameId) {
        const progress = calculateProgress(status);
        const statusText = generateStatusText(status);
        const history = vrfStatusManager.getGameHistory(status.gameId);

        setProcessingState(prev => ({
          ...prev,
          status,
          progress,
          statusText,
          canCancel: status.status === 'processing' || status.status === 'retrying',
          error: status.error || null,
          history,
        }));
      }
    };

    const handleGameCompleted = (status: VRFGameStatus) => {
      if (status.gameId === processingState.gameId) {
        const progress = status.status === 'completed' ? 100 : 0;
        const statusText = generateStatusText(status);
        const history = vrfStatusManager.getGameHistory(status.gameId);

        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          status,
          progress,
          statusText,
          canCancel: false,
          error: status.error || null,
          history,
        }));

        // Auto-clear successful completions after 3 seconds
        if (status.status === 'completed') {
          setTimeout(() => {
            setProcessingState(prev => ({
              ...prev,
              gameId: null,
              status: null,
              progress: 0,
              statusText: 'Ready',
            }));
          }, 3000);
        }
      }
    };

    vrfStatusManager.on('statusUpdate', handleStatusUpdate);
    vrfStatusManager.on('gameCompleted', handleGameCompleted);

    return () => {
      vrfStatusManager.off('statusUpdate', handleStatusUpdate);
      vrfStatusManager.off('gameCompleted', handleGameCompleted);
    };
  }, [processingState.gameId, calculateProgress, generateStatusText]);

  return {
    processingState,
    startProcessing,
    cancelProcessing,
    clearError,
    getProcessingStats,
    getAllActiveGames,
  };
};