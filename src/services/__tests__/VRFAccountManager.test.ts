import { VRFAccountManager, VRFAccountHealth, VRFAccountConfig } from '../VRFAccountManager';
import { PublicKey } from '@solana/web3.js';

// Mock Switchboard SDK
jest.mock('@switchboard-xyz/solana.js', () => ({
  VrfAccount: {
    load: jest.fn(),
  },
}));

describe('VRFAccountManager', () => {
  let vrfManager: VRFAccountManager;
  let mockAccounts: VRFAccountConfig[];

  beforeEach(() => {
    // Setup mock VRF account configurations
    mockAccounts = [
      {
        publicKey: new PublicKey('11111111111111111111111111111112'),
        name: 'primary',
        priority: 1,
      },
      {
        publicKey: new PublicKey('11111111111111111111111111111113'),
        name: 'secondary',
        priority: 2,
      },
      {
        publicKey: new PublicKey('11111111111111111111111111111114'),
        name: 'tertiary',
        priority: 3,
      },
    ];

    vrfManager = new VRFAccountManager(mockAccounts);
  });

  describe('Account Selection', () => {
    describe('Round Robin Selection', () => {
      it('should rotate through accounts in order', () => {
        const first = vrfManager.getNextAccount('round-robin');
        const second = vrfManager.getNextAccount('round-robin');
        const third = vrfManager.getNextAccount('round-robin');
        const fourth = vrfManager.getNextAccount('round-robin');

        expect(first.name).toBe('primary');
        expect(second.name).toBe('secondary');
        expect(third.name).toBe('tertiary');
        expect(fourth.name).toBe('primary'); // Should wrap around
      });

      it('should maintain state across multiple calls', () => {
        vrfManager.getNextAccount('round-robin'); // primary
        vrfManager.getNextAccount('round-robin'); // secondary
        
        const third = vrfManager.getNextAccount('round-robin');
        expect(third.name).toBe('tertiary');
      });
    });

    describe('Health-Based Selection', () => {
      beforeEach(() => {
        // Mock health data
        vrfManager.updateAccountHealth('primary', {
          isHealthy: true,
          queueDepth: 5,
          avgResponseTime: 2000,
          successRate: 0.98,
          lastUpdated: Date.now(),
        });

        vrfManager.updateAccountHealth('secondary', {
          isHealthy: false,
          queueDepth: 25,
          avgResponseTime: 8000,
          successRate: 0.85,
          lastUpdated: Date.now(),
        });

        vrfManager.updateAccountHealth('tertiary', {
          isHealthy: true,
          queueDepth: 3,
          avgResponseTime: 1500,
          successRate: 0.99,
          lastUpdated: Date.now(),
        });
      });

      it('should select the healthiest account', () => {
        const account = vrfManager.getNextAccount('health-based');
        expect(account.name).toBe('tertiary'); // Best performance
      });

      it('should skip unhealthy accounts', () => {
        const account1 = vrfManager.getNextAccount('health-based');
        const account2 = vrfManager.getNextAccount('health-based');

        expect(account1.name).not.toBe('secondary');
        expect(account2.name).not.toBe('secondary');
      });

      it('should fall back to round-robin if all accounts unhealthy', () => {
        // Mark all accounts unhealthy
        mockAccounts.forEach(acc => {
          vrfManager.updateAccountHealth(acc.name, {
            isHealthy: false,
            queueDepth: 30,
            avgResponseTime: 10000,
            successRate: 0.50,
            lastUpdated: Date.now(),
          });
        });

        const account = vrfManager.getNextAccount('health-based');
        expect(account).toBeDefined();
        expect(['primary', 'secondary', 'tertiary']).toContain(account.name);
      });
    });
  });

  describe('Health Monitoring', () => {
    it('should update account health correctly', () => {
      const healthData: VRFAccountHealth = {
        isHealthy: true,
        queueDepth: 10,
        avgResponseTime: 3000,
        successRate: 0.95,
        lastUpdated: Date.now(),
      };

      vrfManager.updateAccountHealth('primary', healthData);
      const retrievedHealth = vrfManager.getAccountHealth('primary');

      expect(retrievedHealth).toEqual(healthData);
    });

    it('should mark account as unhealthy when queue depth exceeds threshold', () => {
      vrfManager.updateAccountHealth('primary', {
        isHealthy: true,
        queueDepth: 25, // Above default threshold of 20
        avgResponseTime: 2000,
        successRate: 0.95,
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('primary');
      expect(health?.isHealthy).toBe(false);
    });

    it('should mark account as unhealthy when response time exceeds threshold', () => {
      vrfManager.updateAccountHealth('primary', {
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: 12000, // Above default threshold of 10000ms
        successRate: 0.95,
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('primary');
      expect(health?.isHealthy).toBe(false);
    });

    it('should mark account as unhealthy when success rate below threshold', () => {
      vrfManager.updateAccountHealth('primary', {
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: 2000,
        successRate: 0.85, // Below default threshold of 0.90
        lastUpdated: Date.now(),
      });

      const health = vrfManager.getAccountHealth('primary');
      expect(health?.isHealthy).toBe(false);
    });
  });

  describe('Account Management', () => {
    it('should return all configured accounts', () => {
      const accounts = vrfManager.getAllAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.map(a => a.name)).toEqual(['primary', 'secondary', 'tertiary']);
    });

    it('should return account by name', () => {
      const account = vrfManager.getAccountByName('secondary');
      expect(account?.name).toBe('secondary');
      expect(account?.publicKey.toString()).toBe('11111111111111111111111111111113');
    });

    it('should return null for non-existent account', () => {
      const account = vrfManager.getAccountByName('non-existent');
      expect(account).toBeNull();
    });
  });

  describe('Health Thresholds', () => {
    it('should use custom health thresholds when provided', () => {
      const customThresholds = {
        maxQueueDepth: 15,
        maxResponseTime: 5000,
        minSuccessRate: 0.95,
      };

      const customManager = new VRFAccountManager(mockAccounts, customThresholds);

      customManager.updateAccountHealth('primary', {
        isHealthy: true,
        queueDepth: 18, // Above custom threshold of 15
        avgResponseTime: 3000,
        successRate: 0.98,
        lastUpdated: Date.now(),
      });

      const health = customManager.getAccountHealth('primary');
      expect(health?.isHealthy).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      vrfManager.updateAccountHealth('primary', {
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: 2000,
        successRate: 0.98,
        lastUpdated: Date.now(),
      });

      vrfManager.updateAccountHealth('secondary', {
        isHealthy: false,
        queueDepth: 25,
        avgResponseTime: 8000,
        successRate: 0.85,
        lastUpdated: Date.now(),
      });
    });

    it('should return correct healthy account count', () => {
      const stats = vrfManager.getHealthStats();
      expect(stats.healthyAccounts).toBe(2); // primary (healthy) + tertiary (default healthy)
      expect(stats.totalAccounts).toBe(3);
    });

    it('should return average response time', () => {
      const stats = vrfManager.getHealthStats();
      expect(Math.round(stats.avgResponseTime)).toBe(3333); // (2000 + 8000 + 0) / 3
    });

    it('should return overall success rate', () => {
      const stats = vrfManager.getHealthStats();
      expect(Math.round(stats.avgSuccessRate * 1000) / 1000).toBe(0.943); // (0.98 + 0.85 + 1.0) / 3
    });
  });
});