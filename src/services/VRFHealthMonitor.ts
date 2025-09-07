import { Connection } from '@solana/web3.js';
import { getVRFAccountManager, VRFAccountManager } from './VRFAccountManager';

export interface VRFPerformanceMetrics {
  accountName: string;
  requestStartTime: number;
  responseTime?: number;
  success: boolean;
  queueDepth?: number;
  error?: string;
}

export class VRFHealthMonitor {
  private vrfManager: VRFAccountManager;
  private connection: Connection;
  private performanceHistory: Map<string, VRFPerformanceMetrics[]>;
  private monitoringInterval: NodeJS.Timeout | null;
  private readonly maxHistorySize = 100; // Keep last 100 requests per account
  private readonly monitorIntervalMs = 30000; // Check health every 30 seconds

  constructor(connection: Connection, vrfManager?: VRFAccountManager) {
    this.connection = connection;
    this.vrfManager = vrfManager || getVRFAccountManager();
    this.performanceHistory = new Map();
    this.monitoringInterval = null;

    // Initialize performance history for all accounts
    this.vrfManager.getAllAccounts().forEach(account => {
      this.performanceHistory.set(account.name, []);
    });
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log('Starting VRF health monitoring...');
    
    // Initial health check
    this.performHealthCheck();

    // Set up recurring health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.monitorIntervalMs);
  }

  /**
   * Stop continuous health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('VRF health monitoring stopped');
    }
  }

  /**
   * Record a VRF request performance metric
   */
  recordVRFRequest(metrics: VRFPerformanceMetrics): void {
    const history = this.performanceHistory.get(metrics.accountName) || [];
    
    // Add response time if request completed
    if (metrics.responseTime) {
      metrics.responseTime = Date.now() - metrics.requestStartTime;
    }

    history.push(metrics);

    // Maintain history size limit
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }

    this.performanceHistory.set(metrics.accountName, history);

    // Update health metrics based on recent performance
    this.updateAccountHealthFromHistory(metrics.accountName);
  }

  /**
   * Record VRF request start
   */
  recordVRFRequestStart(accountName: string): number {
    const startTime = Date.now();
    
    // This will be completed by calling recordVRFRequestComplete
    return startTime;
  }

  /**
   * Record VRF request completion
   */
  recordVRFRequestComplete(
    accountName: string,
    startTime: number,
    success: boolean,
    queueDepth?: number,
    error?: string
  ): void {
    this.recordVRFRequest({
      accountName,
      requestStartTime: startTime,
      responseTime: Date.now() - startTime,
      success,
      queueDepth,
      error,
    });
  }

  /**
   * Update account health based on recent performance history
   */
  private updateAccountHealthFromHistory(accountName: string): void {
    const history = this.performanceHistory.get(accountName) || [];
    
    if (history.length === 0) return;

    // Calculate metrics from recent history (last 20 requests)
    const recentHistory = history.slice(-20);
    
    const avgResponseTime = recentHistory
      .filter(h => h.responseTime !== undefined)
      .reduce((sum, h) => sum + (h.responseTime || 0), 0) / recentHistory.length || 0;

    const successfulRequests = recentHistory.filter(h => h.success).length;
    const successRate = successfulRequests / recentHistory.length;

    const latestQueueDepth = recentHistory[recentHistory.length - 1]?.queueDepth || 0;

    // Update health in VRF manager
    this.vrfManager.updateAccountHealth(accountName, {
      avgResponseTime,
      successRate,
      queueDepth: latestQueueDepth,
    });
  }

  /**
   * Perform health check on all VRF accounts
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const accounts = this.vrfManager.getAllAccounts();
      
      const promises = accounts.map(async (account) => {
        try {
          const queueInfo = await this.vrfManager.checkAccountQueue(
            this.connection,
            account.name
          );

          if (queueInfo) {
            // Update health with fresh queue data
            this.vrfManager.updateAccountHealth(account.name, {
              queueDepth: queueInfo.queueDepth,
            });
          }
        } catch (error) {
          console.error(`Health check failed for VRF account ${account.name}:`, error);
          
          // Mark as unhealthy on check failure
          this.vrfManager.updateAccountHealth(account.name, {
            isHealthy: false,
          });
        }
      });

      await Promise.allSettled(promises);

      // Log health statistics
      const stats = this.vrfManager.getHealthStats();
      console.log('VRF Health Stats:', {
        healthy: `${stats.healthyAccounts}/${stats.totalAccounts}`,
        avgResponseTime: `${Math.round(stats.avgResponseTime)}ms`,
        avgSuccessRate: `${Math.round(stats.avgSuccessRate * 100)}%`,
      });

    } catch (error) {
      console.error('VRF health check error:', error);
    }
  }

  /**
   * Get performance history for an account
   */
  getPerformanceHistory(accountName: string): VRFPerformanceMetrics[] {
    return this.performanceHistory.get(accountName) || [];
  }

  /**
   * Get recent performance summary for an account
   */
  getRecentPerformanceSummary(accountName: string, sampleSize = 10) {
    const history = this.getPerformanceHistory(accountName);
    const recentHistory = history.slice(-sampleSize);

    if (recentHistory.length === 0) {
      return {
        avgResponseTime: 0,
        successRate: 0,
        requestCount: 0,
      };
    }

    const avgResponseTime = recentHistory
      .filter(h => h.responseTime !== undefined)
      .reduce((sum, h) => sum + (h.responseTime || 0), 0) / recentHistory.length;

    const successfulRequests = recentHistory.filter(h => h.success).length;
    const successRate = successfulRequests / recentHistory.length;

    return {
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      requestCount: recentHistory.length,
    };
  }

  /**
   * Clear performance history for all accounts
   */
  clearHistory(): void {
    this.performanceHistory.clear();
    
    // Reinitialize for all accounts
    this.vrfManager.getAllAccounts().forEach(account => {
      this.performanceHistory.set(account.name, []);
    });
  }

  /**
   * Get health monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoringInterval !== null;
  }
}

// Singleton instance for application-wide use
let vrfHealthMonitor: VRFHealthMonitor | null = null;

export const getVRFHealthMonitor = (connection?: Connection): VRFHealthMonitor => {
  if (!vrfHealthMonitor && connection) {
    vrfHealthMonitor = new VRFHealthMonitor(connection);
  }
  
  if (!vrfHealthMonitor) {
    throw new Error('VRFHealthMonitor not initialized. Provide connection on first call.');
  }
  
  return vrfHealthMonitor;
};