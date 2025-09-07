import { VRFTransactionRetry, getVRFTransactionRetry } from '../VRFTransactionRetry';
import { Connection, TransactionSignature, PublicKey } from '@solana/web3.js';
import { VRFAccountConfig } from '../VRFAccountManager';

// Mock dependencies
jest.mock('../VRFErrorDetector', () => ({
  getVRFErrorDetector: jest.fn(() => ({
    classifyError: jest.fn((error) => {
      // Check for specific non-retryable patterns
      const message = error.message.toLowerCase();
      if (message.includes('user rejected') || message.includes('insufficient funds')) {
        return {
          type: 'account_invalid',
          severity: 'critical',
          isRetryable: false,
          suggestedAction: 'abort',
          waitTimeMs: 0,
          message: 'Non-retryable error',
        };
      }
      
      return {
        type: 'timeout',
        severity: 'medium',
        isRetryable: true,
        suggestedAction: 'retry',
        waitTimeMs: 1000,
        message: 'Test error message',
      };
    }),
    updateNetworkHealth: jest.fn(),
  })),
}));

describe('VRFTransactionRetry', () => {
  let transactionRetry: VRFTransactionRetry;
  let mockConnection: jest.Mocked<Connection>;
  let mockVRFAccount: VRFAccountConfig;

  beforeEach(() => {
    // Mock connection
    mockConnection = {
      getLatestBlockhash: jest.fn(),
      confirmTransaction: jest.fn(),
      isBlockhashValid: jest.fn(),
    } as any;

    mockVRFAccount = {
      publicKey: new PublicKey('11111111111111111111111111111112'),
      name: 'test-vrf-account',
      priority: 1,
    };

    transactionRetry = new VRFTransactionRetry(mockConnection);

    // Setup default mock returns
    mockConnection.getLatestBlockhash.mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 12345,
    });

    mockConnection.confirmTransaction.mockResolvedValue({
      value: { err: null },
    });

    mockConnection.isBlockhashValid.mockResolvedValue({ value: true });
  });

  describe('Successful Transaction Execution', () => {
    it('should execute VRF transaction successfully on first attempt', async () => {
      const mockTransactionFn = jest.fn().mockResolvedValue('test-signature' as TransactionSignature);

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
      expect(result.attempts).toBe(1);
      expect(result.blockhashRefreshCount).toBe(1);
      expect(mockTransactionFn).toHaveBeenCalledWith('test-blockhash', 12345);
    });

    it('should succeed after retries', async () => {
      const mockTransactionFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('test-signature' as TransactionSignature);

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { maxRetries: 2 }
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
      expect(result.attempts).toBe(2);
      expect(mockTransactionFn).toHaveBeenCalledTimes(2);
    });

    it('should refresh blockhash on each retry when enabled', async () => {
      mockConnection.getLatestBlockhash
        .mockResolvedValueOnce({ blockhash: 'blockhash-1', lastValidBlockHeight: 100 })
        .mockResolvedValueOnce({ blockhash: 'blockhash-2', lastValidBlockHeight: 200 });

      const mockTransactionFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('test-signature' as TransactionSignature);

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { 
          maxRetries: 2,
          enableFreshBlockhash: true,
        }
      );

      expect(result.success).toBe(true);
      expect(result.blockhashRefreshCount).toBe(2);
      expect(mockTransactionFn).toHaveBeenNthCalledWith(1, 'blockhash-1', 100);
      expect(mockTransactionFn).toHaveBeenNthCalledWith(2, 'blockhash-2', 200);
    });
  });

  describe('Transaction Failures', () => {
    it('should fail after max retries', async () => {
      const mockTransactionFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { maxRetries: 2 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(2);
      expect(mockTransactionFn).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction confirmation failures', async () => {
      const mockTransactionFn = jest.fn().mockResolvedValue('test-signature' as TransactionSignature);
      
      mockConnection.confirmTransaction.mockResolvedValue({
        value: { err: { code: -32002, message: 'Transaction failed' } },
      });

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('VRF transaction failed on-chain');
    });

    it('should handle timeout errors', async () => {
      const mockTransactionFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('test-signature'), 2000))
      );

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { timeoutMs: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff with jitter', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        if (delay && delay > 50) { // Only capture our retry delays
          delays.push(delay as number);
        }
        return originalSetTimeout(callback, Math.min(delay as number, 10)); // Speed up tests
      });

      const mockTransactionFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('test-signature' as TransactionSignature);

      await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { 
          maxRetries: 3,
          baseRetryDelayMs: 100,
        }
      );

      expect(delays).toHaveLength(2);
      expect(delays[0]).toBeGreaterThanOrEqual(80); // ~100ms with jitter
      expect(delays[0]).toBeLessThanOrEqual(120);
      expect(delays[1]).toBeGreaterThan(delays[0]); // Exponential backoff

      (global.setTimeout as jest.Mock).mockRestore();
    });

    it('should cap delay at maxRetryDelayMs', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        if (delay && delay > 50) {
          delays.push(delay as number);
        }
        return originalSetTimeout(callback, Math.min(delay as number, 10));
      });

      const mockTransactionFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('test-signature' as TransactionSignature);

      await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { 
          maxRetries: 3,
          baseRetryDelayMs: 1000,
          maxRetryDelayMs: 1500,
        }
      );

      expect(delays.every(delay => delay <= 1800)).toBe(true); // Max + jitter
      
      (global.setTimeout as jest.Mock).mockRestore();
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should not retry user rejection errors', async () => {
      const mockTransactionFn = jest.fn().mockRejectedValue(new Error('User rejected the request'));

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { maxRetries: 3 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockTransactionFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry insufficient funds errors', async () => {
      const mockTransactionFn = jest.fn().mockRejectedValue(new Error('Insufficient funds for transaction'));

      const result = await transactionRetry.executeVRFTransaction(
        mockTransactionFn,
        mockVRFAccount,
        { maxRetries: 3 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('Batch Transaction Execution', () => {
    it('should execute multiple transactions with shared blockhash', async () => {
      const mockTxn1 = jest.fn().mockResolvedValue('signature-1' as TransactionSignature);
      const mockTxn2 = jest.fn().mockResolvedValue('signature-2' as TransactionSignature);

      const results = await transactionRetry.executeVRFTransactionBatch(
        [mockTxn1, mockTxn2],
        mockVRFAccount
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Both should use the same blockhash
      expect(mockTxn1).toHaveBeenCalledWith('test-blockhash', 12345);
      expect(mockTxn2).toHaveBeenCalledWith('test-blockhash', 12345);
      
      // Blockhash should only be fetched once for batch
      expect(results[0].blockhashRefreshCount).toBe(0); // Using shared blockhash
      expect(results[1].blockhashRefreshCount).toBe(0);
    });

    it('should stop batch on first failure when configured', async () => {
      const mockTxn1 = jest.fn().mockRejectedValue(new Error('First transaction failed'));
      const mockTxn2 = jest.fn().mockResolvedValue('signature-2' as TransactionSignature);

      const results = await transactionRetry.executeVRFTransactionBatch(
        [mockTxn1, mockTxn2],
        mockVRFAccount,
        { maxRetries: 1 }
      );

      expect(results).toHaveLength(1); // Stopped after first failure
      expect(results[0].success).toBe(false);
      expect(mockTxn2).not.toHaveBeenCalled();
    });
  });

  describe('Error Message Generation', () => {
    it('should generate user-friendly error messages', () => {
      const timeoutError = new Error('Request timeout occurred');
      const message = transactionRetry.getVRFErrorMessage(timeoutError, mockVRFAccount);

      expect(message).toContain('VRF oracle');
      expect(message).toContain(mockVRFAccount.name);
      expect(message).toContain('longer than usual');
    });

    it('should handle different error types appropriately', () => {
      const networkError = new Error('Network connection failed');
      const message = transactionRetry.getVRFErrorMessage(networkError, mockVRFAccount);

      expect(message).toContain('network connectivity');
    });
  });

  describe('Blockhash Validation', () => {
    it('should validate blockhash correctly', async () => {
      mockConnection.isBlockhashValid.mockResolvedValue({ value: true });
      
      const isValid = await transactionRetry.isBlockhashValid('test-blockhash');
      expect(isValid).toBe(true);
      expect(mockConnection.isBlockhashValid).toHaveBeenCalledWith('test-blockhash');
    });

    it('should handle blockhash validation errors', async () => {
      mockConnection.isBlockhashValid.mockRejectedValue(new Error('Validation failed'));
      
      const isValid = await transactionRetry.isBlockhashValid('test-blockhash');
      expect(isValid).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance for the same connection', () => {
      const instance1 = getVRFTransactionRetry(mockConnection);
      const instance2 = getVRFTransactionRetry(mockConnection);
      
      expect(instance1).toBe(instance2);
    });
  });
});