import { VRFRetryHandler, VRFRetryConfig, VRFRetryResult, VRFTimeoutError, VRFQueueFullError } from '../VRFRetryHandler';
import { VRFAccountManager, VRFAccountConfig } from '../VRFAccountManager';
import { PublicKey } from '@solana/web3.js';

// Mock dependencies
jest.mock('../VRFAccountManager');
jest.mock('@switchboard-xyz/solana.js', () => ({
  VrfAccount: {
    load: jest.fn(),
  },
}));

describe('VRFRetryHandler', () => {
  jest.setTimeout(10000); // Increase timeout for async tests
  let retryHandler: VRFRetryHandler;
  let mockVRFManager: jest.Mocked<VRFAccountManager>;
  let mockVRFFunction: jest.Mock;

  beforeEach(() => {
    // Setup mock VRF account manager
    mockVRFManager = {
      getNextAccount: jest.fn(),
      updateAccountHealth: jest.fn(),
      getAccountHealth: jest.fn(),
      getAllAccounts: jest.fn(),
    } as any;

    // Setup mock VRF function
    mockVRFFunction = jest.fn();

    // Create retry handler with default config
    retryHandler = new VRFRetryHandler(mockVRFManager);

    // Setup default mock returns
    mockVRFManager.getNextAccount.mockReturnValue({
      publicKey: new PublicKey('11111111111111111111111111111112'),
      name: 'test-account',
      priority: 1,
    });

    mockVRFManager.getAccountHealth.mockReturnValue({
      isHealthy: true,
      queueDepth: 5,
      avgResponseTime: 2000,
      successRate: 0.95,
      lastUpdated: Date.now(),
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after configured timeout period', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 1000, // 1 second timeout
        maxRetries: 1,
        exponentialBackoff: false,
      };

      // Mock function that takes longer than timeout
      mockVRFFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      const start = Date.now();
      
      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);
      
      const duration = Date.now() - start;
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(VRFTimeoutError);
      expect(duration).toBeGreaterThan(900);
      expect(duration).toBeLessThan(1500);
    });

    it('should succeed if operation completes before timeout', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 2000,
        maxRetries: 1,
        exponentialBackoff: false,
      };

      mockVRFFunction.mockResolvedValue('success');

      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff delays', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 30000,
        maxRetries: 3,
        exponentialBackoff: true,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
      };

      // Mock function that fails twice then succeeds
      mockVRFFunction
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const start = Date.now();
      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      
      // Should have delays: ~1000ms + ~2000ms = ~3000ms total
      expect(duration).toBeGreaterThan(2800);
      expect(duration).toBeLessThan(4000);
    });

    it('should cap delay at maxDelayMs', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 30000,
        maxRetries: 5,
        exponentialBackoff: true,
        baseDelayMs: 1000,
        maxDelayMs: 2000, // Cap at 2 seconds
      };

      // Mock to fail multiple times
      mockVRFFunction
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockRejectedValueOnce(new Error('Fail 4'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Spy on setTimeout to measure delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        if (delay && delay > 100) { // Only capture our retry delays
          delays.push(delay as number);
        }
        return originalSetTimeout(callback, delay);
      });

      await retryHandler.executeWithRetry(mockVRFFunction, config);

      expect(delays).toHaveLength(4);
      expect(delays[0]).toBe(1000); // First retry: base delay
      expect(delays[1]).toBe(2000); // Second retry: 2x base (capped)
      expect(delays[2]).toBe(2000); // Third retry: would be 4x but capped
      expect(delays[3]).toBe(2000); // Fourth retry: would be 8x but capped

      (global.setTimeout as jest.Mock).mockRestore();
    });
  });

  describe('VRF Account Rotation', () => {
    it('should try different VRF accounts on failure', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 10000,
        maxRetries: 3,
        rotateAccountsOnFailure: true,
      };

      // Setup multiple accounts
      const accounts = [
        { publicKey: new PublicKey('11111111111111111111111111111112'), name: 'account1', priority: 1 },
        { publicKey: new PublicKey('11111111111111111111111111111113'), name: 'account2', priority: 2 },
        { publicKey: new PublicKey('11111111111111111111111111111114'), name: 'account3', priority: 3 },
      ];

      mockVRFManager.getNextAccount
        .mockReturnValueOnce(accounts[0])
        .mockReturnValueOnce(accounts[1])
        .mockReturnValueOnce(accounts[2]);

      // First two attempts fail, third succeeds
      mockVRFFunction
        .mockRejectedValueOnce(new VRFQueueFullError('Queue full'))
        .mockRejectedValueOnce(new VRFTimeoutError('Timeout'))
        .mockResolvedValue('success');

      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockVRFManager.getNextAccount).toHaveBeenCalledTimes(3);
    });

    it('should update account health on failures', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 10000,
        maxRetries: 2,
      };

      mockVRFFunction
        .mockRejectedValueOnce(new VRFTimeoutError('Timeout'))
        .mockResolvedValue('success');

      await retryHandler.executeWithRetry(mockVRFFunction, config);

      // Should mark account as unhealthy after timeout
      expect(mockVRFManager.updateAccountHealth).toHaveBeenCalledWith(
        'test-account',
        expect.objectContaining({
          isHealthy: false,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle VRF-specific errors', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 10000,
        maxRetries: 1,
      };

      mockVRFFunction.mockRejectedValue(new VRFQueueFullError('Queue is full'));

      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(VRFQueueFullError);
      expect(result.attempts).toBe(1);
    });

    it('should stop retrying on non-retryable errors', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 10000,
        maxRetries: 3,
      };

      // Simulate a non-retryable error (like invalid parameters)
      const nonRetryableError = new Error('Invalid VRF parameters');
      (nonRetryableError as any).code = 'INVALID_PARAMS';

      mockVRFFunction.mockRejectedValue(nonRetryableError);

      const result = await retryHandler.executeWithRetry(mockVRFFunction, config);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Will retry all attempts for unknown errors
      expect(mockVRFFunction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Status Updates', () => {
    it('should emit status updates during retries', async () => {
      const config: VRFRetryConfig = {
        timeoutMs: 10000,
        maxRetries: 3,
        exponentialBackoff: false, // Disable for faster test
      };

      const statusUpdates: any[] = [];
      
      retryHandler.on('statusUpdate', (status) => {
        statusUpdates.push(status);
      });

      mockVRFFunction
        .mockRejectedValueOnce(new VRFTimeoutError('First timeout'))
        .mockRejectedValueOnce(new VRFTimeoutError('Second timeout'))
        .mockResolvedValue('success');

      await retryHandler.executeWithRetry(mockVRFFunction, config);

      expect(statusUpdates).toHaveLength(3); // Start, retry, success
      expect(statusUpdates[0]).toMatchObject({
        status: 'attempting',
        attempt: 1,
        account: 'test-account',
      });
      expect(statusUpdates[1]).toMatchObject({
        status: 'retrying',
        attempt: 2,
      });
      expect(statusUpdates[2]).toMatchObject({
        status: 'completed',
        success: true,
      });
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', async () => {
      mockVRFFunction.mockResolvedValue('success');

      const result = await retryHandler.executeWithRetry(mockVRFFunction);

      expect(result.success).toBe(true);
      expect(result.config).toMatchObject({
        timeoutMs: 10000,
        maxRetries: 3,
        exponentialBackoff: true,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      });
    });

    it('should merge custom config with defaults', async () => {
      mockVRFFunction.mockResolvedValue('success');

      const customConfig: Partial<VRFRetryConfig> = {
        maxRetries: 5,
        timeoutMs: 15000,
      };

      const result = await retryHandler.executeWithRetry(mockVRFFunction, customConfig);

      expect(result.config.maxRetries).toBe(5);
      expect(result.config.timeoutMs).toBe(15000);
      expect(result.config.exponentialBackoff).toBe(true); // Default preserved
    });
  });
});