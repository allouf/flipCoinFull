/**
 * VRF Integration Tests for Production Configuration
 * 
 * These tests verify the complete VRF system functionality including:
 * - Account failover mechanisms
 * - Health monitoring integration
 * - Error recovery systems
 * - Production configuration handling
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { VRFAccountManager, VRFAccountConfig, VRFHealthThresholds } from '../VRFAccountManager';
import { VRFRetryHandler } from '../VRFRetryHandler';
import { VRFEmergencyFallback } from '../VRFEmergencyFallback';
import { VRFErrorDetector } from '../VRFErrorDetector';
import { loadVRFAccountsFromEnv, loadVRFThresholdsFromEnv, initializeVRFConfig } from '../../config/vrfConfig';

// Mock Solana connection
const mockConnection = {
  getAccountInfo: jest.fn(),
  getRecentBlockhash: jest.fn(),
  sendTransaction: jest.fn(),
  confirmTransaction: jest.fn(),
} as unknown as Connection;

// Mock Switchboard SDK
jest.mock('@switchboard-xyz/solana.js', () => ({
  VrfAccount: {
    load: jest.fn(),
  },
}));

describe('VRF Integration Tests - Production Configuration', () => {
  let vrfManager: VRFAccountManager;
  let retryHandler: VRFRetryHandler;
  let emergencyFallback: VRFEmergencyFallback;
  
  const productionLikeAccounts: VRFAccountConfig[] = [
    {
      publicKey: new PublicKey('CKwZcshn4XEehaJCqCkecqjFkJNj7WvFbMFGKsVb6WPT'),
      name: 'production-primary',
      priority: 1,
    },
    {
      publicKey: new PublicKey('H8aekPGfRhbsJQGUmBFNKVvyTU1mJVK8J5KGnBQJvWcD'),
      name: 'production-secondary', 
      priority: 2,
    },
    {
      publicKey: new PublicKey('9bVB6jWvfGQJGpZAzxBq2UkwHUvgDJ4RkjYZqxVehNe3'),
      name: 'production-tertiary',
      priority: 3,
    },
  ];

  const productionThresholds: VRFHealthThresholds = {
    maxQueueDepth: 10,
    maxResponseTime: 8000,
    minSuccessRate: 0.95,
  };

  beforeEach(() => {
    // Initialize VRF system with production-like configuration
    vrfManager = new VRFAccountManager(productionLikeAccounts, productionThresholds);
    retryHandler = new VRFRetryHandler();
    emergencyFallback = new VRFEmergencyFallback();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    (mockConnection.getAccountInfo as jest.Mock).mockResolvedValue({
      owner: new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f'),
      lamports: 1000000,
    });
  });

  describe('Account Selection and Failover', () => {
    it('should select primary account when all are healthy', () => {
      // Set all accounts as healthy with good metrics
      productionLikeAccounts.forEach(account => {
        vrfManager.updateAccountHealth(account.name, {
          isHealthy: true,
          queueDepth: 2,
          avgResponseTime: 3000,
          successRate: 0.98,
          lastUpdated: Date.now(),
        });
      });

      const selectedAccount = vrfManager.getNextAccount('health-based');
      expect(selectedAccount.name).toBe('production-primary');
      expect(selectedAccount.priority).toBe(1);
    });

    it('should failover to secondary when primary is unhealthy', () => {
      // Make primary unhealthy
      vrfManager.updateAccountHealth('production-primary', {
        isHealthy: false,
        queueDepth: 15, // Above production threshold of 10
        avgResponseTime: 9000, // Above production threshold of 8000
        successRate: 0.92, // Below production threshold of 0.95
        lastUpdated: Date.now(),
      });

      // Keep secondary and tertiary healthy
      vrfManager.updateAccountHealth('production-secondary', {
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: 4000,
        successRate: 0.97,
        lastUpdated: Date.now(),
      });
      
      vrfManager.updateAccountHealth('production-tertiary', {
        isHealthy: true,
        queueDepth: 3,
        avgResponseTime: 2500,
        successRate: 0.99,
        lastUpdated: Date.now(),
      });

      const selectedAccount = vrfManager.getNextAccount('health-based');
      // Should select the healthiest account (tertiary has better metrics)
      expect(['production-secondary', 'production-tertiary']).toContain(selectedAccount.name);
      expect(selectedAccount.name).not.toBe('production-primary');
    });

    it('should handle complete primary and secondary failure', () => {
      // Make both primary and secondary unhealthy
      vrfManager.updateAccountHealth('production-primary', {
        isHealthy: false,
        queueDepth: 20,
        avgResponseTime: 12000,
        successRate: 0.80,
        lastUpdated: Date.now(),
      });

      vrfManager.updateAccountHealth('production-secondary', {
        isHealthy: false,
        queueDepth: 18,
        avgResponseTime: 11000,
        successRate: 0.85,
        lastUpdated: Date.now(),
      });

      // Keep tertiary healthy
      vrfManager.updateAccountHealth('production-tertiary', {
        isHealthy: true,
        queueDepth: 3,
        avgResponseTime: 2500,
        successRate: 0.99,
        lastUpdated: Date.now(),
      });

      const selectedAccount = vrfManager.getNextAccount('health-based');
      expect(selectedAccount.name).toBe('production-tertiary');
      expect(selectedAccount.priority).toBe(3);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle VRF timeout errors and retry with different account', async () => {
      const timeoutError = new Error('VRF request timeout after 30 seconds');
      
      // Simulate timeout error on primary account
      const errorClassification = vrfManager.handleAccountFailure('production-primary', timeoutError);
      
      expect(errorClassification.type).toBe('timeout');
      expect(errorClassification.isRetriable).toBe(true);
      
      // Primary should be marked as unhealthy
      const primaryHealth = vrfManager.getAccountHealth('production-primary');
      expect(primaryHealth?.isHealthy).toBe(false);
      
      // Should get backup account
      const backupAccount = vrfManager.getBackupAccount(['production-primary']);
      expect(backupAccount?.name).not.toBe('production-primary');
      expect(['production-secondary', 'production-tertiary']).toContain(backupAccount?.name);
    });

    it('should quarantine repeatedly failing accounts', () => {
      const vrfError = new Error('VRF oracle offline');
      
      // Simulate multiple failures on the same account
      for (let i = 0; i < 3; i++) {
        vrfManager.handleAccountFailure('production-primary', vrfError);
      }
      
      // Account should be quarantined
      const statusSummary = vrfManager.getAccountStatusSummary();
      expect(statusSummary.quarantined).toContain('production-primary');
      
      // Should not be available as backup
      const backupAccount = vrfManager.getBackupAccount();
      expect(backupAccount?.name).not.toBe('production-primary');
    });

    it('should trigger emergency fallback when all accounts fail', () => {
      // Mark all accounts as failing
      productionLikeAccounts.forEach(account => {
        vrfManager.updateAccountHealth(account.name, {
          isHealthy: false,
          queueDepth: 25,
          avgResponseTime: 15000,
          successRate: 0.30, // Very low success rate
          lastUpdated: Date.now(),
        });
      });

      // Should require emergency fallback
      expect(vrfManager.requiresEmergencyFallback()).toBe(true);

      // Emergency fallback should be triggered
      const emergencyResult = emergencyFallback.shouldTriggerEmergency({
        allVRFAccountsFailed: true,
        gameAge: 45000, // 45 seconds
        attemptCount: 5,
      });

      expect(emergencyResult.shouldTrigger).toBe(true);
      expect(emergencyResult.method).toBe('timeout');
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should update health metrics based on actual performance', async () => {
      // Simulate slow response
      const startTime = Date.now();
      
      // Mock slow VRF response
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      
      const responseTime = Date.now() - startTime;
      
      vrfManager.updateAccountHealth('production-primary', {
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: responseTime,
        successRate: 0.96,
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('production-primary');
      expect(health?.avgResponseTime).toBeGreaterThan(0);
      expect(health?.lastUpdated).toBeGreaterThan(Date.now() - 1000);
    });

    it('should provide accurate health statistics for monitoring', () => {
      // Set up varied health states
      vrfManager.updateAccountHealth('production-primary', {
        isHealthy: true,
        queueDepth: 2,
        avgResponseTime: 3000,
        successRate: 0.98,
        lastUpdated: Date.now(),
      });

      vrfManager.updateAccountHealth('production-secondary', {
        isHealthy: false,
        queueDepth: 12,
        avgResponseTime: 9000,
        successRate: 0.89,
        lastUpdated: Date.now(),
      });

      vrfManager.updateAccountHealth('production-tertiary', {
        isHealthy: true,
        queueDepth: 1,
        avgResponseTime: 2000,
        successRate: 0.99,
        lastUpdated: Date.now(),
      });

      const stats = vrfManager.getHealthStats();
      
      expect(stats.healthyAccounts).toBe(2);
      expect(stats.totalAccounts).toBe(3);
      expect(stats.avgResponseTime).toBeCloseTo(4666.67, 1); // (3000 + 9000 + 2000) / 3
      expect(stats.avgSuccessRate).toBeCloseTo(0.953, 2); // (0.98 + 0.89 + 0.99) / 3
    });
  });

  describe('Production Configuration Validation', () => {
    it('should enforce production-level thresholds', () => {
      vrfManager.updateAccountHealth('production-primary', {
        isHealthy: true,
        queueDepth: 11, // Above production threshold of 10
        avgResponseTime: 7000, // Within production threshold of 8000
        successRate: 0.96, // Above production threshold of 0.95
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('production-primary');
      expect(health?.isHealthy).toBe(false); // Should be marked unhealthy due to queue depth
    });

    it('should handle production environment detection', () => {
      // Mock production environment
      const originalEnv = process.env.REACT_APP_NETWORK;
      process.env.REACT_APP_NETWORK = 'mainnet-beta';

      try {
        // This should use stricter production thresholds
        const thresholds = loadVRFThresholdsFromEnv();
        
        expect(thresholds.maxQueueDepth).toBeLessThanOrEqual(10);
        expect(thresholds.maxResponseTime).toBeLessThanOrEqual(8000);
        expect(thresholds.minSuccessRate).toBeGreaterThanOrEqual(0.95);
      } finally {
        // Restore original environment
        process.env.REACT_APP_NETWORK = originalEnv;
      }
    });
  });

  describe('Real-world Scenario Testing', () => {
    it('should handle high-load scenario with degraded performance', async () => {
      // Simulate high load conditions
      const highLoadScenario = {
        queueDepth: 8, // Near production limit
        avgResponseTime: 7500, // Near production limit
        successRate: 0.96, // Just above production minimum
      };

      vrfManager.updateAccountHealth('production-primary', {
        ...highLoadScenario,
        isHealthy: true,
        lastUpdated: Date.now(),
      });

      const selectedAccount = vrfManager.getNextAccount('health-based');
      expect(selectedAccount.name).toBe('production-primary');
      
      // Health should be borderline but acceptable
      const health = vrfManager.getAccountHealth('production-primary');
      expect(health?.isHealthy).toBe(true);
    });

    it('should maintain service during rolling VRF account failures', () => {
      const accounts = vrfManager.getAllAccounts();
      const accountNames = accounts.map(acc => acc.name);
      
      // Simulate accounts failing one by one
      for (let i = 0; i < accountNames.length - 1; i++) {
        vrfManager.updateAccountHealth(accountNames[i], {
          isHealthy: false,
          queueDepth: 20,
          avgResponseTime: 12000,
          successRate: 0.70,
          lastUpdated: Date.now(),
        });
        
        // Should still be able to get a working account
        const workingAccount = vrfManager.getNextAccount('health-based');
        expect(workingAccount).toBeDefined();
      }
      
      // Emergency fallback should not be needed until all fail
      expect(vrfManager.requiresEmergencyFallback()).toBe(false);
    });

    it('should recover from network connectivity issues', async () => {
      // Simulate network error
      const networkError = new Error('Network request failed');
      (mockConnection.getAccountInfo as jest.Mock).mockRejectedValueOnce(networkError);

      // Test connectivity
      try {
        await vrfManager.checkAccountQueue(mockConnection, 'production-primary');
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }

      // Account should be marked as problematic
      const health = vrfManager.getAccountHealth('production-primary');
      expect(health?.isHealthy).toBe(false);

      // But system should continue with other accounts
      const backupAccount = vrfManager.getBackupAccount(['production-primary']);
      expect(backupAccount).toBeDefined();
      expect(backupAccount?.name).not.toBe('production-primary');
    });
  });

  describe('Performance and Scaling Tests', () => {
    it('should handle rapid account selection requests efficiently', () => {
      const startTime = Date.now();
      
      // Perform many rapid selections
      for (let i = 0; i < 1000; i++) {
        const account = vrfManager.getNextAccount('health-based');
        expect(account).toBeDefined();
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should maintain performance during health monitoring', () => {
      const startTime = Date.now();
      
      // Rapid health updates
      for (let i = 0; i < 500; i++) {
        vrfManager.updateAccountHealth('production-primary', {
          isHealthy: true,
          queueDepth: Math.floor(Math.random() * 10),
          avgResponseTime: Math.floor(Math.random() * 8000),
          successRate: 0.95 + (Math.random() * 0.04),
          lastUpdated: Date.now(),
        });
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should handle rapid updates efficiently
    });
  });

  describe('Configuration Integration Tests', () => {
    beforeEach(() => {
      // Reset environment variables
      delete process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY;
      delete process.env.REACT_APP_VRF_ACCOUNT_2_PUBKEY;
      delete process.env.REACT_APP_VRF_ACCOUNT_3_PUBKEY;
    });

    it('should initialize correctly with environment configuration', () => {
      // Set up mock environment variables
      process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY = productionLikeAccounts[0].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_1_NAME = productionLikeAccounts[0].name;
      process.env.REACT_APP_VRF_ACCOUNT_1_PRIORITY = '1';
      
      process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH = '10';
      process.env.REACT_APP_VRF_MAX_RESPONSE_TIME = '8000';
      process.env.REACT_APP_VRF_MIN_SUCCESS_RATE = '0.95';

      const accounts = loadVRFAccountsFromEnv();
      const thresholds = loadVRFThresholdsFromEnv();

      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe(productionLikeAccounts[0].name);
      expect(thresholds.maxQueueDepth).toBe(10);
      expect(thresholds.maxResponseTime).toBe(8000);
      expect(thresholds.minSuccessRate).toBe(0.95);
    });

    it('should validate production configuration correctly', () => {
      // Set production environment
      process.env.REACT_APP_NETWORK = 'mainnet-beta';
      
      // Set up production-like configuration with minimum 3 accounts
      process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY = productionLikeAccounts[0].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_1_NAME = productionLikeAccounts[0].name;
      process.env.REACT_APP_VRF_ACCOUNT_1_PRIORITY = '1';
      
      process.env.REACT_APP_VRF_ACCOUNT_2_PUBKEY = productionLikeAccounts[1].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_2_NAME = productionLikeAccounts[1].name;
      process.env.REACT_APP_VRF_ACCOUNT_2_PRIORITY = '2';
      
      process.env.REACT_APP_VRF_ACCOUNT_3_PUBKEY = productionLikeAccounts[2].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_3_NAME = productionLikeAccounts[2].name;
      process.env.REACT_APP_VRF_ACCOUNT_3_PRIORITY = '3';

      // Should pass validation with 3+ real accounts
      expect(() => {
        initializeVRFConfig();
      }).not.toThrow();
    });
  });
});

describe('VRF System Integration - End-to-End Scenarios', () => {
  it('should handle complete game flow with VRF failures', async () => {
    const vrfManager = new VRFAccountManager(
      [
        {
          publicKey: new PublicKey('CKwZcshn4XEehaJCqCkecqjFkJNj7WvFbMFGKsVb6WPT'),
          name: 'game-primary',
          priority: 1,
        },
        {
          publicKey: new PublicKey('H8aekPGfRhbsJQGUmBFNKVvyTU1mJVK8J5KGnBQJvWcD'),
          name: 'game-backup',
          priority: 2,
        },
      ],
      {
        maxQueueDepth: 10,
        maxResponseTime: 8000,
        minSuccessRate: 0.95,
      }
    );

    // Simulate game start - primary VRF fails
    const vrfError = new Error('VRF oracle busy');
    vrfManager.handleAccountFailure('game-primary', vrfError);

    // Should failover to backup
    const backupAccount = vrfManager.getNextAccount('health-based');
    expect(backupAccount.name).toBe('game-backup');

    // Backup succeeds
    vrfManager.updateAccountHealth('game-backup', {
      isHealthy: true,
      queueDepth: 3,
      avgResponseTime: 4000,
      successRate: 0.98,
      lastUpdated: Date.now(),
    });

    // Game should complete successfully with backup account
    const finalAccount = vrfManager.getNextAccount('health-based');
    expect(finalAccount.name).toBe('game-backup');
    expect(vrfManager.getAccountHealth('game-backup')?.isHealthy).toBe(true);
  });
});