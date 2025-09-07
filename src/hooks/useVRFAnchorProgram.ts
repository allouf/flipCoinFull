import { useEffect, useState, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import { VRFAccountManager, getVRFAccountManager, VRFAccountConfig } from '../services/VRFAccountManager';
import { VRFHealthMonitor, getVRFHealthMonitor } from '../services/VRFHealthMonitor';
import { VRFRetryHandler, getVRFRetryHandler, VRFRetryConfig } from '../services/VRFRetryHandler';
import { vrfStatusManager } from '../services/VRFStatusManager';
import { getSwitchboardQueueTracker } from '../services/SwitchboardQueueTracker';
import { initializeVRFConfig } from '../config/vrfConfig';
import { retryTransaction } from '../utils/transaction';
import { PublicKey } from '@solana/web3.js';

export interface VRFSelectionResult {
  selectedAccount: VRFAccountConfig;
  strategy: 'health-based' | 'round-robin';
  timestamp: number;
  queueDepth?: number;
  estimatedWaitTime?: number;
}

export interface VRFGameRequestOptions {
  useVRFAccountRotation?: boolean;
  selectionStrategy?: 'health-based' | 'round-robin';
  timeoutSeconds?: number;
  maxRetries?: number;
}

/**
 * Enhanced anchor program hook with VRF account management
 * Extends useAnchorProgram with VRF account selection and health monitoring
 */
export const useVRFAnchorProgram = () => {
  const { connection } = useConnection();
  const anchorProgram = useAnchorProgram();
  
  const [vrfManager, setVrfManager] = useState<VRFAccountManager | null>(null);
  const [healthMonitor, setHealthMonitor] = useState<VRFHealthMonitor | null>(null);
  const [retryHandler, setRetryHandler] = useState<VRFRetryHandler | null>(null);
  const [isVRFInitialized, setIsVRFInitialized] = useState(false);
  const [vrfStats, setVrfStats] = useState<{
    healthyAccounts: number;
    totalAccounts: number;
    avgResponseTime: number;
    avgSuccessRate: number;
  } | null>(null);

  const initializationRef = useRef(false);

  // Initialize VRF system on mount
  useEffect(() => {
    if (initializationRef.current || !connection) {
      return;
    }

    initializationRef.current = true;

    const initializeVRF = async () => {
      try {
        console.log('Initializing VRF account management system...');
        
        // Load configuration from environment
        const { accounts, thresholds } = initializeVRFConfig();
        
        // Initialize VRF account manager
        const manager = getVRFAccountManager(accounts, thresholds);
        setVrfManager(manager);
        
        // Initialize health monitor
        const monitor = getVRFHealthMonitor(connection);
        setHealthMonitor(monitor);
        
        // Initialize retry handler
        const retry = getVRFRetryHandler(manager, connection);
        setRetryHandler(retry);
        
        // Initialize queue tracker
        getSwitchboardQueueTracker(connection);
        
        // Start health monitoring
        monitor.startMonitoring();
        
        // Set up retry handler status updates
        retry.on('statusUpdate', (status) => {
          // Forward status updates to VRF status manager if we have an active game
          // This would be set by the game component when starting VRF processing
        });
        
        setIsVRFInitialized(true);
        
        console.log('VRF system initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize VRF system:', error);
        setIsVRFInitialized(false);
      }
    };

    initializeVRF();

    // Cleanup on unmount
    return () => {
      if (healthMonitor) {
        healthMonitor.stopMonitoring();
      }
    };
  }, [connection, healthMonitor]);

  // Update VRF stats periodically
  useEffect(() => {
    if (!vrfManager || !isVRFInitialized) return;

    const updateStats = () => {
      const stats = vrfManager.getHealthStats();
      setVrfStats(stats);
    };

    // Initial stats
    updateStats();

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, [vrfManager, isVRFInitialized]);

  /**
   * Select the next VRF account with health check
   */
  const selectVRFAccount = useCallback(async (
    strategy: 'health-based' | 'round-robin' = 'health-based'
  ): Promise<VRFSelectionResult> => {
    if (!vrfManager) {
      throw new Error('VRF manager not initialized');
    }

    const selectedAccount = await vrfManager.getNextAccountWithQueueCheck(
      connection,
      strategy
    );

    const health = vrfManager.getAccountHealth(selectedAccount.name);
    
    return {
      selectedAccount,
      strategy,
      timestamp: Date.now(),
      queueDepth: health?.queueDepth,
      estimatedWaitTime: health?.avgResponseTime,
    };
  }, [vrfManager, connection]);

  /**
   * Enhanced makeSelection with integrated VRF retry logic
   */
  const makeSelectionWithVRF = useCallback(async (
    roomId: number,
    selection: 'heads' | 'tails',
    options: VRFGameRequestOptions = {}
  ) => {
    if (!anchorProgram.program || !vrfManager || !retryHandler) {
      throw new Error('Program or VRF system not initialized');
    }

    const {
      useVRFAccountRotation = true,
      selectionStrategy = 'health-based',
      timeoutSeconds = 10,
      maxRetries = 3,
    } = options;

    // Generate unique game ID for this request
    const gameId = `game-${roomId}-${Date.now()}`;
    
    // Start VRF status tracking
    vrfStatusManager.startTracking(gameId, roomId, maxRetries);

    // Configure retry options
    const retryConfig: Partial<VRFRetryConfig> = {
      timeoutMs: timeoutSeconds * 1000,
      maxRetries,
      exponentialBackoff: true,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      rotateAccountsOnFailure: useVRFAccountRotation,
    };

    // Set up status update forwarding
    const statusHandler = (status: any) => {
      vrfStatusManager.updateStatus(gameId, status);
    };
    retryHandler.on('statusUpdate', statusHandler);

    try {
      // Create VRF function that integrates with existing transaction retry logic
      const vrfFunction = async (account: VRFAccountConfig) => {
        const result = await retryTransaction(
          connection,
          async () => {
            // Use the original makeSelection method with the selected VRF account
            const res = await anchorProgram.makeSelection(roomId, selection);
            return res.tx;
          },
          {
            maxRetries: 2, // Additional transaction-level retries
            retryDelay: 500,
          }
        );
      };

      // Execute with full retry logic
      const result = await retryHandler.executeWithRetry(vrfFunction, retryConfig);

      if (result.success) {
        vrfStatusManager.completeGame(gameId, true, result.result);
        
        return {
          tx: result.result ? String(result.result) : '',
          vrfStats: {
            attempts: result.attempts,
            totalDuration: result.totalDuration,
            accountsUsed: result.accountsUsed,
          },
          gameId,
        };
      } else {
        vrfStatusManager.completeGame(gameId, false, null, result.error?.message);
        throw result.error;
      }

    } finally {
      // Clean up event listener
      retryHandler.off('statusUpdate', statusHandler);
    }
  }, [anchorProgram, vrfManager, retryHandler, connection]);

  /**
   * Get VRF account health information
   */
  const getVRFAccountHealth = useCallback((accountName?: string) => {
    if (!vrfManager) return null;
    
    if (accountName) {
      return vrfManager.getAccountHealth(accountName);
    }
    
    // Return health for all accounts
    return vrfManager.getAllAccounts().reduce((acc, account) => {
      acc[account.name] = vrfManager.getAccountHealth(account.name);
      return acc;
    }, {} as Record<string, any>);
  }, [vrfManager]);

  /**
   * Get VRF performance summary
   */
  const getVRFPerformanceSummary = useCallback((accountName: string, sampleSize = 10) => {
    if (!healthMonitor) return null;
    
    return healthMonitor.getRecentPerformanceSummary(accountName, sampleSize);
  }, [healthMonitor]);

  /**
   * Force refresh of all VRF account health
   */
  const refreshVRFHealth = useCallback(async () => {
    if (!vrfManager) return;
    
    console.log('Refreshing VRF account health...');
    await vrfManager.checkAllAccountQueues(connection);
    
    // Update stats after refresh
    const stats = vrfManager.getHealthStats();
    setVrfStats(stats);
  }, [vrfManager, connection]);

  /**
   * Get list of healthy VRF accounts
   */
  const getHealthyVRFAccounts = useCallback(() => {
    if (!vrfManager) return [];
    
    return vrfManager.getAllAccounts().filter(account => {
      const health = vrfManager.getAccountHealth(account.name);
      return health?.isHealthy;
    });
  }, [vrfManager]);

  return {
    // Original anchor program functionality
    ...anchorProgram,
    
    // VRF-enhanced functionality
    makeSelectionWithVRF,
    selectVRFAccount,
    
    // VRF management
    isVRFInitialized,
    vrfStats,
    getVRFAccountHealth,
    getVRFPerformanceSummary,
    refreshVRFHealth,
    getHealthyVRFAccounts,
    
    // VRF system references (for advanced usage)
    vrfManager,
    healthMonitor,
  };
};