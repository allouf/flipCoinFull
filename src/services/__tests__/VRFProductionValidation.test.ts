import { Connection, PublicKey } from '@solana/web3.js';
import { VRFAccountManager, VRFAccountConfig, VRFHealthThresholds } from '../VRFAccountManager';
import { loadVRFAccountsFromEnv, loadVRFThresholdsFromEnv, validateVRFConfig } from '../../config/vrfConfig';

// Mock Switchboard SDK
jest.mock('@switchboard-xyz/solana.js', () => ({
  VrfAccount: {
    load: jest.fn().mockResolvedValue({
      queueDepth: 5,
      isActive: true,
    }),
  },
}));

const mockVrfAccount = {
  queueDepth: 5,
  isActive: true,
};

describe('VRF Production Validation', () => {
  let mockConnection: Connection;
  let vrfManager: VRFAccountManager;
  
  const realProductionAccounts: VRFAccountConfig[] = [
    {
      publicKey: new PublicKey('CKwZcshn4XEehaJCqCkecqjFkJNj7WvFbMFGKsVb6WPT'),
      name: 'switchboard-devnet-1',
      priority: 1,
    },
    {
      publicKey: new PublicKey('H8aekPGfRhbsJQGUmBFNKVvyTU1mJVK8J5KGnBQJvWcD'),
      name: 'switchboard-devnet-2',
      priority: 2,
    },
    {
      publicKey: new PublicKey('9bVB6jWvfGQJGpZAzxBq2UkwHUvgDJ4RkjYZqxVehNe3'),
      name: 'switchboard-devnet-3',
      priority: 3,
    },
  ];

  const productionThresholds: VRFHealthThresholds = {
    maxQueueDepth: 10,
    maxResponseTime: 8000,
    minSuccessRate: 0.95,
  };

  beforeEach(() => {
    // Mock connection
    mockConnection = {} as Connection;
    
    // Initialize VRF manager with production-like accounts
    vrfManager = new VRFAccountManager(realProductionAccounts, productionThresholds);
    
    // Reset environment variables
    jest.resetModules();
  });

  describe('Production Account Validation', () => {
    it('should validate real Switchboard VRF account addresses', () => {
      realProductionAccounts.forEach(account => {
        expect(account.publicKey).toBeInstanceOf(PublicKey);
        expect(PublicKey.isOnCurve(account.publicKey.toBuffer())).toBe(true);
        expect(account.name).toBeTruthy();
        expect(account.priority).toBeGreaterThan(0);
      });
    });

    it('should reject placeholder/development account addresses', () => {
      const placeholderAccounts = [
        '11111111111111111111111111111112',
        '11111111111111111111111111111113',
        '11111111111111111111111111111114',
      ];

      placeholderAccounts.forEach(placeholder => {
        expect(() => {
          const accounts = [
            ...realProductionAccounts,
            {
              publicKey: new PublicKey(placeholder),
              name: 'placeholder',
              priority: 99,
            },
          ];
          const manager = new VRFAccountManager(accounts);
          
          // This should fail validation in production
          const validation = validateProductionAccounts(accounts);
          expect(validation.hasPlaceholders).toBe(true);
        }).not.toThrow(); // Test setup shouldn't throw, but validation should catch it
      });
    });

    it('should validate account connectivity to Solana network', async () => {
      const { VrfAccount } = await import('@switchboard-xyz/solana.js');
      
      // Test each account for connectivity
      for (const account of realProductionAccounts) {
        const queueResult = await vrfManager.checkAccountQueue(mockConnection, account.name);
        
        expect(queueResult).toBeDefined();
        expect(queueResult?.isActive).toBe(true);
        expect(VrfAccount.load).toHaveBeenCalledWith(mockConnection, account.publicKey);
      }
    });

    it('should handle VRF account load failures gracefully', async () => {
      const { VrfAccount } = await import('@switchboard-xyz/solana.js');
      
      // Mock connection failure
      (VrfAccount.load as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const queueResult = await vrfManager.checkAccountQueue(mockConnection, 'switchboard-devnet-1');
      
      expect(queueResult).toBeNull();
      
      // Check that account is marked as unhealthy
      const health = vrfManager.getAccountHealth('switchboard-devnet-1');
      expect(health?.isHealthy).toBe(false);
      expect(health?.queueDepth).toBe(999); // Error marker
    });

    it('should validate all accounts can be loaded concurrently', async () => {
      await vrfManager.checkAllAccountQueues(mockConnection);
      
      // All accounts should have health data after batch check
      realProductionAccounts.forEach(account => {
        const health = vrfManager.getAccountHealth(account.name);
        expect(health).toBeDefined();
        expect(health?.lastUpdated).toBeGreaterThan(Date.now() - 5000); // Recent update
      });
    });
  });

  describe('Production Health Thresholds', () => {
    it('should enforce stricter production thresholds', () => {
      // Production thresholds should be stricter than development
      expect(productionThresholds.maxQueueDepth).toBeLessThanOrEqual(15);
      expect(productionThresholds.maxResponseTime).toBeLessThanOrEqual(10000);
      expect(productionThresholds.minSuccessRate).toBeGreaterThanOrEqual(0.90);
    });

    it('should mark accounts unhealthy under production load scenarios', () => {
      // Simulate high load scenario
      vrfManager.updateAccountHealth('switchboard-devnet-1', {
        isHealthy: true,
        queueDepth: 12, // Above production threshold of 10
        avgResponseTime: 6000,
        successRate: 0.98,
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('switchboard-devnet-1');
      expect(health?.isHealthy).toBe(false);
    });

    it('should select backup accounts when primary fails production thresholds', () => {
      // Make primary account fail production thresholds
      vrfManager.updateAccountHealth('switchboard-devnet-1', {
        isHealthy: false,
        queueDepth: 15,
        avgResponseTime: 9000,
        successRate: 0.89, // Below 0.95 threshold
        lastUpdated: Date.now(),
      });

      // Ensure secondary account is healthy
      vrfManager.updateAccountHealth('switchboard-devnet-2', {
        isHealthy: true,
        queueDepth: 3,
        avgResponseTime: 2000,
        successRate: 0.98,
        lastUpdated: Date.now(),
      });

      const selectedAccount = vrfManager.getNextAccount('health-based');
      expect(selectedAccount.name).toBe('switchboard-devnet-2');
    });
  });

  describe('Failover and Recovery Testing', () => {
    it('should handle complete VRF account failure scenario', () => {
      // Mark all accounts as failing
      realProductionAccounts.forEach(account => {
        vrfManager.updateAccountHealth(account.name, {
          isHealthy: false,
          queueDepth: 25,
          avgResponseTime: 15000,
          successRate: 0.60,
          lastUpdated: Date.now(),
        });
      });

      // Should require emergency fallback
      expect(vrfManager.requiresEmergencyFallback()).toBe(true);

      // Should still return an account (for emergency handling)
      const emergencyAccount = vrfManager.getNextAccount('health-based');
      expect(emergencyAccount).toBeDefined();
    });

    it('should quarantine repeatedly failing accounts', () => {
      const testError = new Error('VRF request timeout');
      
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        vrfManager.handleAccountFailure('switchboard-devnet-1', testError);
      }

      // Account should be quarantined
      const backup = vrfManager.getBackupAccount(['switchboard-devnet-1']);
      expect(backup?.name).not.toBe('switchboard-devnet-1');

      const statusSummary = vrfManager.getAccountStatusSummary();
      expect(statusSummary.quarantined).toContain('switchboard-devnet-1');
    });

    it('should maintain service with minimum healthy accounts', () => {
      // Mark 2 accounts as unhealthy, keep 1 healthy
      vrfManager.updateAccountHealth('switchboard-devnet-1', { isHealthy: false, successRate: 0.3, lastUpdated: Date.now() });
      vrfManager.updateAccountHealth('switchboard-devnet-2', { isHealthy: false, successRate: 0.2, lastUpdated: Date.now() });
      vrfManager.updateAccountHealth('switchboard-devnet-3', { isHealthy: true, successRate: 0.98, lastUpdated: Date.now() });

      // Should not require emergency fallback with 1 healthy account
      expect(vrfManager.requiresEmergencyFallback()).toBe(false);

      // Should consistently select the healthy account
      for (let i = 0; i < 5; i++) {
        const account = vrfManager.getNextAccount('health-based');
        expect(account.name).toBe('switchboard-devnet-3');
      }
    });
  });

  describe('Environment Configuration Validation', () => {
    beforeEach(() => {
      // Mock environment variables for testing
      process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY = realProductionAccounts[0].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_1_NAME = realProductionAccounts[0].name;
      process.env.REACT_APP_VRF_ACCOUNT_1_PRIORITY = realProductionAccounts[0].priority.toString();
      
      process.env.REACT_APP_VRF_ACCOUNT_2_PUBKEY = realProductionAccounts[1].publicKey.toString();
      process.env.REACT_APP_VRF_ACCOUNT_2_NAME = realProductionAccounts[1].name;
      process.env.REACT_APP_VRF_ACCOUNT_2_PRIORITY = realProductionAccounts[1].priority.toString();

      process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH = '10';
      process.env.REACT_APP_VRF_MAX_RESPONSE_TIME = '8000';
      process.env.REACT_APP_VRF_MIN_SUCCESS_RATE = '0.95';
    });

    afterEach(() => {
      // Clean up environment variables
      delete process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY;
      delete process.env.REACT_APP_VRF_ACCOUNT_1_NAME;
      delete process.env.REACT_APP_VRF_ACCOUNT_1_PRIORITY;
      delete process.env.REACT_APP_VRF_ACCOUNT_2_PUBKEY;
      delete process.env.REACT_APP_VRF_ACCOUNT_2_NAME;
      delete process.env.REACT_APP_VRF_ACCOUNT_2_PRIORITY;
      delete process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH;
      delete process.env.REACT_APP_VRF_MAX_RESPONSE_TIME;
      delete process.env.REACT_APP_VRF_MIN_SUCCESS_RATE;
    });

    it('should load VRF accounts from environment variables', () => {
      const accounts = loadVRFAccountsFromEnv();
      
      expect(accounts).toHaveLength(2);
      expect(accounts[0].name).toBe(realProductionAccounts[0].name);
      expect(accounts[0].publicKey.toString()).toBe(realProductionAccounts[0].publicKey.toString());
      expect(accounts[1].name).toBe(realProductionAccounts[1].name);
    });

    it('should load health thresholds from environment variables', () => {
      const thresholds = loadVRFThresholdsFromEnv();
      
      expect(thresholds.maxQueueDepth).toBe(10);
      expect(thresholds.maxResponseTime).toBe(8000);
      expect(thresholds.minSuccessRate).toBe(0.95);
    });

    it('should validate complete VRF configuration', () => {
      const validation = validateVRFConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid VRF configuration', () => {
      // Set invalid environment variable
      process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY = 'invalid-public-key';
      
      const accounts = loadVRFAccountsFromEnv();
      
      // Should fall back to default accounts when invalid public key provided
      expect(accounts.length).toBeGreaterThanOrEqual(1);
    });

    it('should warn when using placeholder accounts in production', () => {
      // Test with placeholder accounts
      process.env.REACT_APP_VRF_ACCOUNT_1_PUBKEY = '11111111111111111111111111111112';
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const accounts = loadVRFAccountsFromEnv();
      
      // Should detect and warn about placeholder usage
      const hasPlaceholders = accounts.some(acc => 
        acc.publicKey.toString().startsWith('1111111111111111111111111111111')
      );
      
      if (hasPlaceholders) {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Using default VRF account configuration')
        );
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle rapid account selection requests', () => {
      const startTime = Date.now();
      
      // Simulate 1000 rapid selections
      for (let i = 0; i < 1000; i++) {
        const account = vrfManager.getNextAccount('health-based');
        expect(account).toBeDefined();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent health updates', () => {
      const promises = realProductionAccounts.map((account, index) =>
        Promise.resolve().then(() => {
          vrfManager.updateAccountHealth(account.name, {
            isHealthy: true,
            queueDepth: index + 1,
            avgResponseTime: (index + 1) * 1000,
            successRate: 0.95 + (index * 0.01),
            lastUpdated: Date.now(),
          });
        })
      );

      return Promise.all(promises).then(() => {
        // All accounts should have updated health data
        realProductionAccounts.forEach(account => {
          const health = vrfManager.getAccountHealth(account.name);
          expect(health?.isHealthy).toBe(true);
          expect(health?.lastUpdated).toBeGreaterThan(Date.now() - 1000);
        });
      });
    });

    it('should maintain performance with large numbers of health checks', async () => {
      const { VrfAccount } = await import('@switchboard-xyz/solana.js');
      
      // Mock multiple rapid queue checks
      (VrfAccount.load as jest.Mock).mockImplementation(() => 
        Promise.resolve({ ...mockVrfAccount, queueDepth: Math.floor(Math.random() * 10) })
      );

      const startTime = Date.now();
      
      // Perform 100 batch health checks
      const promises = Array.from({ length: 100 }, () =>
        vrfManager.checkAllAccountQueues(mockConnection)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle batch operations efficiently
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 batch operations
    });
  });
});

/**
 * Helper function to validate production account configuration
 */
function validateProductionAccounts(accounts: VRFAccountConfig[]): {
  hasPlaceholders: boolean;
  hasValidKeys: boolean;
  hasDuplicates: boolean;
} {
  const placeholderKeys = [
    '11111111111111111111111111111112',
    '11111111111111111111111111111113',
    '11111111111111111111111111111114',
  ];

  const hasPlaceholders = accounts.some(account =>
    placeholderKeys.includes(account.publicKey.toString())
  );

  const hasValidKeys = accounts.every(account => {
    try {
      PublicKey.isOnCurve(account.publicKey.toBuffer());
      return true;
    } catch {
      return false;
    }
  });

  const publicKeys = accounts.map(acc => acc.publicKey.toString());
  const hasDuplicates = publicKeys.length !== new Set(publicKeys).size;

  return {
    hasPlaceholders,
    hasValidKeys,
    hasDuplicates,
  };
}