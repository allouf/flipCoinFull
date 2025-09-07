import { VRFRetryHandler, VRFRetryConfig, VRFTimeoutError } from '../VRFRetryHandler';
import { VRFAccountManager } from '../VRFAccountManager';
import { PublicKey } from '@solana/web3.js';

describe('VRFRetryHandler - Basic Functionality', () => {
  let retryHandler: VRFRetryHandler;
  let mockVRFManager: jest.Mocked<VRFAccountManager>;
  
  beforeEach(() => {
    // Create a minimal mock VRF manager
    mockVRFManager = {
      getNextAccount: jest.fn().mockReturnValue({
        publicKey: new PublicKey('11111111111111111111111111111112'),
        name: 'test-account',
        priority: 1,
      }),
      updateAccountHealth: jest.fn(),
      getAccountHealth: jest.fn().mockReturnValue({
        isHealthy: true,
        queueDepth: 5,
        avgResponseTime: 2000,
        successRate: 0.95,
        lastUpdated: Date.now(),
      }),
    } as any;

    retryHandler = new VRFRetryHandler(mockVRFManager);
  });

  it('should complete successfully on first attempt', async () => {
    const mockVRFFunction = jest.fn().mockResolvedValue('success');
    
    const result = await retryHandler.executeWithRetry(mockVRFFunction);
    
    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(1);
    expect(mockVRFFunction).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const mockVRFFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const result = await retryHandler.executeWithRetry(mockVRFFunction, {
      maxRetries: 2,
      exponentialBackoff: false, // Disable for faster test
    });
    
    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(2);
    expect(mockVRFFunction).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    const mockVRFFunction = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    const result = await retryHandler.executeWithRetry(mockVRFFunction, {
      maxRetries: 2,
      exponentialBackoff: false,
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(2);
    expect(mockVRFFunction).toHaveBeenCalledTimes(2);
  });

  it('should handle VRF timeout errors', async () => {
    const mockVRFFunction = jest.fn().mockRejectedValue(new VRFTimeoutError('Timeout', 5000));
    
    const result = await retryHandler.executeWithRetry(mockVRFFunction, {
      maxRetries: 1,
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(VRFTimeoutError);
    expect(result.attempts).toBe(1);
  });

  it('should update account health on errors', async () => {
    const mockVRFFunction = jest.fn().mockRejectedValue(new VRFTimeoutError('Timeout', 5000));
    
    await retryHandler.executeWithRetry(mockVRFFunction, {
      maxRetries: 1,
    });
    
    expect(mockVRFManager.updateAccountHealth).toHaveBeenCalledWith(
      'test-account',
      expect.objectContaining({
        isHealthy: false,
      })
    );
  });

  it('should use provided configuration', async () => {
    const mockVRFFunction = jest.fn().mockResolvedValue('success');
    
    const customConfig = {
      maxRetries: 5,
      timeoutMs: 15000,
      exponentialBackoff: false,
    };
    
    const result = await retryHandler.executeWithRetry(mockVRFFunction, customConfig);
    
    expect(result.success).toBe(true);
    expect(result.config.maxRetries).toBe(5);
    expect(result.config.timeoutMs).toBe(15000);
    expect(result.config.exponentialBackoff).toBe(false);
  });

  it('should emit status updates', (done) => {
    const mockVRFFunction = jest.fn().mockResolvedValue('success');
    
    let updateCount = 0;
    retryHandler.on('statusUpdate', (status) => {
      updateCount++;
      if (status.status === 'completed') {
        expect(updateCount).toBeGreaterThan(0);
        expect(status.success).toBe(true);
        done();
      }
    });
    
    retryHandler.executeWithRetry(mockVRFFunction);
  });
});