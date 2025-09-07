import { useState, useEffect, useCallback } from 'react';
import { useConnectionStatus, ConnectionStatusHook, ConnectionHealth } from './useConnectionStatus';
import { getVRFAccountManager } from '../services/VRFAccountManager';
import { getVRFHealthMonitor } from '../services/VRFHealthMonitor';
import { useConnection } from '@solana/wallet-adapter-react';

export interface VRFHealth {
  status: 'excellent' | 'good' | 'poor' | 'critical';
  healthyAccounts: number;
  totalAccounts: number;
  avgResponseTime: number;
  avgSuccessRate: number;
  lastHealthCheck: number | null;
}

export interface EnhancedConnectionStatusHook extends ConnectionStatusHook {
  vrfHealth: VRFHealth | null;
  solanaRpcHealth: SolanaRPCHealth | null;
  getOverallSystemHealth: () => SystemHealth;
  refreshVRFHealth: () => Promise<void>;
  getVRFAccountDetails: () => VRFAccountDetail[];
}

export interface SolanaRPCHealth {
  status: 'excellent' | 'good' | 'poor' | 'down';
  latency: number | null;
  blockHeight: number | null;
  lastCheck: number | null;
  errors: string[];
}

export interface SystemHealth {
  overall: 'excellent' | 'good' | 'poor' | 'critical';
  websocket: ConnectionHealth;
  vrf: VRFHealth | null;
  solanaRpc: SolanaRPCHealth | null;
  issues: string[];
  recommendations: string[];
}

export interface VRFAccountDetail {
  name: string;
  publicKey: string;
  isHealthy: boolean;
  queueDepth: number;
  avgResponseTime: number;
  successRate: number;
  lastUpdated: number;
  priority: number;
}

/**
 * Enhanced connection status hook that monitors WebSocket, VRF accounts, and Solana RPC health
 */
export const useEnhancedConnectionStatus = (): EnhancedConnectionStatusHook => {
  const { connection } = useConnection();
  const baseConnectionStatus = useConnectionStatus();
  
  const [vrfHealth, setVrfHealth] = useState<VRFHealth | null>(null);
  const [solanaRpcHealth, setSolanaRpcHealth] = useState<SolanaRPCHealth | null>(null);

  /**
   * Check VRF system health
   */
  const checkVRFHealth = useCallback(async (): Promise<VRFHealth | null> => {
    try {
      const vrfManager = getVRFAccountManager();
      const stats = vrfManager.getHealthStats();
      
      // Determine VRF health status
      let status: VRFHealth['status'] = 'excellent';
      
      if (stats.healthyAccounts === 0) {
        status = 'critical';
      } else if (stats.healthyAccounts / stats.totalAccounts < 0.5) {
        status = 'poor';
      } else if (stats.avgResponseTime > 8000 || stats.avgSuccessRate < 0.95) {
        status = 'good';
      }

      const health: VRFHealth = {
        status,
        healthyAccounts: stats.healthyAccounts,
        totalAccounts: stats.totalAccounts,
        avgResponseTime: Math.round(stats.avgResponseTime),
        avgSuccessRate: Math.round(stats.avgSuccessRate * 100) / 100,
        lastHealthCheck: Date.now(),
      };

      setVrfHealth(health);
      return health;
      
    } catch (error) {
      console.error('Failed to check VRF health:', error);
      
      const criticalHealth: VRFHealth = {
        status: 'critical',
        healthyAccounts: 0,
        totalAccounts: 0,
        avgResponseTime: 0,
        avgSuccessRate: 0,
        lastHealthCheck: Date.now(),
      };
      
      setVrfHealth(criticalHealth);
      return criticalHealth;
    }
  }, []);

  /**
   * Check Solana RPC health
   */
  const checkSolanaRPCHealth = useCallback(async (): Promise<SolanaRPCHealth> => {
    const errors: string[] = [];
    let status: SolanaRPCHealth['status'] = 'excellent';
    let latency: number | null = null;
    let blockHeight: number | null = null;

    try {
      // Measure RPC latency
      const startTime = Date.now();
      blockHeight = await connection.getBlockHeight();
      latency = Date.now() - startTime;

      // Determine status based on latency
      if (latency > 2000) {
        status = 'poor';
        errors.push(`High RPC latency: ${latency}ms`);
      } else if (latency > 1000) {
        status = 'good';
      }

    } catch (error) {
      status = 'down';
      errors.push(`RPC connection failed: ${(error as Error).message}`);
      console.error('Solana RPC health check failed:', error);
    }

    const health: SolanaRPCHealth = {
      status,
      latency,
      blockHeight,
      lastCheck: Date.now(),
      errors,
    };

    setSolanaRpcHealth(health);
    return health;
  }, [connection]);

  /**
   * Refresh VRF health data
   */
  const refreshVRFHealth = useCallback(async (): Promise<void> => {
    try {
      const vrfManager = getVRFAccountManager();
      
      // Force refresh of all VRF account queues
      await vrfManager.checkAllAccountQueues(connection);
      
      // Update health metrics
      await checkVRFHealth();
      
    } catch (error) {
      console.error('Failed to refresh VRF health:', error);
    }
  }, [connection, checkVRFHealth]);

  /**
   * Get detailed VRF account information
   */
  const getVRFAccountDetails = useCallback((): VRFAccountDetail[] => {
    try {
      const vrfManager = getVRFAccountManager();
      const accounts = vrfManager.getAllAccounts();
      
      return accounts.map(account => {
        const health = vrfManager.getAccountHealth(account.name);
        
        return {
          name: account.name,
          publicKey: account.publicKey.toString(),
          isHealthy: health?.isHealthy ?? false,
          queueDepth: health?.queueDepth ?? 0,
          avgResponseTime: Math.round(health?.avgResponseTime ?? 0),
          successRate: Math.round((health?.successRate ?? 0) * 100) / 100,
          lastUpdated: health?.lastUpdated ?? 0,
          priority: account.priority,
        };
      }).sort((a, b) => a.priority - b.priority);
      
    } catch (error) {
      console.error('Failed to get VRF account details:', error);
      return [];
    }
  }, []);

  /**
   * Calculate overall system health
   */
  const getOverallSystemHealth = useCallback((): SystemHealth => {
    const websocketHealth = baseConnectionStatus.getConnectionHealth();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check WebSocket health
    if (websocketHealth.status === 'disconnected') {
      issues.push('WebSocket connection is down');
      recommendations.push('Check internet connection and retry');
    } else if (websocketHealth.status === 'poor') {
      issues.push('WebSocket connection is unstable');
      recommendations.push('Check network stability');
    }

    // Check VRF health
    if (vrfHealth) {
      if (vrfHealth.status === 'critical') {
        issues.push('All VRF accounts are unhealthy');
        recommendations.push('Check VRF account configurations and Switchboard oracle status');
      } else if (vrfHealth.status === 'poor') {
        issues.push(`Only ${vrfHealth.healthyAccounts}/${vrfHealth.totalAccounts} VRF accounts are healthy`);
        recommendations.push('Check VRF account queue depths and response times');
      }

      if (vrfHealth.avgResponseTime > 10000) {
        issues.push('VRF response times are very slow');
        recommendations.push('Consider using different VRF accounts or check Switchboard network status');
      }
    }

    // Check Solana RPC health
    if (solanaRpcHealth) {
      if (solanaRpcHealth.status === 'down') {
        issues.push('Solana RPC is not responding');
        recommendations.push('Switch to a different RPC endpoint');
      } else if (solanaRpcHealth.status === 'poor') {
        issues.push('Solana RPC is slow');
        recommendations.push('Consider using a premium RPC provider');
      }
    }

    // Determine overall status
    let overall: SystemHealth['overall'] = 'excellent';
    
    if (websocketHealth.status === 'disconnected' || 
        vrfHealth?.status === 'critical' || 
        solanaRpcHealth?.status === 'down') {
      overall = 'critical';
    } else if (websocketHealth.status === 'poor' || 
               vrfHealth?.status === 'poor' || 
               solanaRpcHealth?.status === 'poor') {
      overall = 'poor';
    } else if (websocketHealth.status === 'good' || 
               vrfHealth?.status === 'good' || 
               solanaRpcHealth?.status === 'good') {
      overall = 'good';
    }

    return {
      overall,
      websocket: websocketHealth,
      vrf: vrfHealth,
      solanaRpc: solanaRpcHealth,
      issues,
      recommendations,
    };
  }, [baseConnectionStatus, vrfHealth, solanaRpcHealth]);

  // Periodic health checks
  useEffect(() => {
    const performHealthChecks = async () => {
      await Promise.allSettled([
        checkVRFHealth(),
        checkSolanaRPCHealth(),
      ]);
    };

    // Initial health check
    performHealthChecks();

    // Set up periodic health checks (every 30 seconds)
    const interval = setInterval(performHealthChecks, 30000);

    return () => clearInterval(interval);
  }, [checkVRFHealth, checkSolanaRPCHealth]);

  // Enhanced VRF health monitoring on connection changes
  useEffect(() => {
    if (baseConnectionStatus.connected) {
      // Connection restored, check VRF health
      checkVRFHealth();
    }
  }, [baseConnectionStatus.connected, checkVRFHealth]);

  return {
    ...baseConnectionStatus,
    vrfHealth,
    solanaRpcHealth,
    getOverallSystemHealth,
    refreshVRFHealth,
    getVRFAccountDetails,
  };
};