import { VRFErrorDetector, getVRFErrorDetector } from '../VRFErrorDetector';
import { VRFTimeoutError, VRFQueueFullError, VRFOracleOfflineError } from '../VRFRetryHandler';

describe('VRFErrorDetector', () => {
  let errorDetector: VRFErrorDetector;

  beforeEach(() => {
    errorDetector = new VRFErrorDetector();
  });

  describe('Error Classification', () => {
    it('should classify VRF timeout errors correctly', () => {
      const timeoutError = new VRFTimeoutError('Request timed out', 10000);
      const classification = errorDetector.classifyError(timeoutError, 'test-account');

      expect(classification.type).toBe('timeout');
      expect(classification.severity).toBe('medium');
      expect(classification.isRetryable).toBe(true);
      expect(classification.suggestedAction).toBe('retry');
      expect(classification.message).toContain('10000ms');
    });

    it('should classify VRF queue full errors correctly', () => {
      const queueError = new VRFQueueFullError('Queue is full', 25);
      const classification = errorDetector.classifyError(queueError, 'test-account');

      expect(classification.type).toBe('queue_full');
      expect(classification.severity).toBe('high');
      expect(classification.isRetryable).toBe(true);
      expect(classification.suggestedAction).toBe('switch_account');
      expect(classification.message).toContain('25');
    });

    it('should classify VRF oracle offline errors correctly', () => {
      const oracleError = new VRFOracleOfflineError('Oracle is offline', 'test-oracle');
      const classification = errorDetector.classifyError(oracleError, 'test-account');

      expect(classification.type).toBe('oracle_offline');
      expect(classification.severity).toBe('critical');
      expect(classification.isRetryable).toBe(true);
      expect(classification.suggestedAction).toBe('switch_account');
      expect(classification.message).toContain('test-oracle');
    });

    it('should classify timeout patterns in error messages', () => {
      const error = new Error('Request timeout occurred');
      const classification = errorDetector.classifyError(error);

      expect(classification.type).toBe('timeout');
      expect(classification.isRetryable).toBe(true);
      expect(classification.waitTimeMs).toBe(2000);
    });

    it('should classify queue congestion patterns', () => {
      const error = new Error('Queue is too congested');
      const classification = errorDetector.classifyError(error);

      expect(classification.type).toBe('queue_full');
      expect(classification.severity).toBe('high');
      expect(classification.waitTimeMs).toBe(5000);
    });

    it('should classify network connectivity issues', () => {
      const error = new Error('Network connection failed');
      const classification = errorDetector.classifyError(error);

      expect(classification.type).toBe('network');
      expect(classification.severity).toBe('medium');
      expect(classification.suggestedAction).toBe('retry');
    });

    it('should handle unknown errors with safe defaults', () => {
      const error = new Error('Unknown error occurred');
      const classification = errorDetector.classifyError(error);

      expect(classification.type).toBe('unknown');
      expect(classification.severity).toBe('medium');
      expect(classification.isRetryable).toBe(true);
      expect(classification.suggestedAction).toBe('retry');
    });
  });

  describe('Account Failure Tracking', () => {
    it('should provide methods for tracking account failures', () => {
      const accountName = 'test-account';
      
      // Initially no failures
      expect(errorDetector.getAccountFailureCount(accountName)).toBe(0);
      
      // The failure tracking is actually done by calling classifyError with account name
      // which internally increments the counter through adjustClassificationBySeverity
      const error = new Error('Test error');
      
      // Multiple calls should increment failure count
      errorDetector.classifyError(error, accountName);
      errorDetector.classifyError(error, accountName);
      errorDetector.classifyError(error, accountName);
      
      // After multiple failures, severity should escalate
      const classification = errorDetector.classifyError(error, accountName);
      expect(classification.severity).toBe('critical');
      expect(classification.suggestedAction).toBe('switch_account');
    });

    it('should clear account failures when requested', () => {
      const accountName = 'test-account';
      const error = new Error('Test error');

      // Create some failures
      errorDetector.classifyError(error, accountName);
      errorDetector.classifyError(error, accountName);
      
      // Should have failures tracked
      expect(errorDetector.getAccountFailureCount(accountName)).toBeGreaterThanOrEqual(2);
      
      // Clear failures
      errorDetector.clearAccountFailures(accountName);
      expect(errorDetector.getAccountFailureCount(accountName)).toBe(0);
    });

    it('should identify accounts with too many failures', () => {
      const error = new Error('Test error');
      
      // Create multiple failures for account1
      for (let i = 0; i < 4; i++) {
        errorDetector.classifyError(error, 'account1');
      }
      
      // Create fewer failures for account2
      errorDetector.classifyError(error, 'account2');
      
      // Check if account1 is considered problematic
      const failureCount1 = errorDetector.getAccountFailureCount('account1');
      const failureCount2 = errorDetector.getAccountFailureCount('account2');
      
      expect(failureCount1).toBeGreaterThan(failureCount2);
      expect(failureCount1).toBeGreaterThanOrEqual(3); // Should be problematic
    });
  });

  describe('Network Health Tracking', () => {
    it('should update and check network health', () => {
      errorDetector.updateNetworkHealth(false);
      
      const error = new Error('Network error');
      const classification = errorDetector.classifyError(error);
      
      expect(classification.message).toContain('Network conditions are poor');
      expect(classification.severity).toBe('high');
    });

    it('should cache network health status', () => {
      // Set unhealthy network
      errorDetector.updateNetworkHealth(false);
      
      const error1 = new Error('Network error');
      const classification1 = errorDetector.classifyError(error1);
      expect(classification1.message).toContain('Network conditions are poor');
      
      // Set healthy network
      errorDetector.updateNetworkHealth(true);
      
      const error2 = new Error('Network error');
      const classification2 = errorDetector.classifyError(error2);
      expect(classification2.message).not.toContain('Network conditions are poor');
    });
  });

  describe('Emergency Fallback Detection', () => {
    it('should detect when emergency fallback is required', () => {
      const criticalError = new VRFOracleOfflineError('Critical failure', 'test-oracle');
      
      expect(errorDetector.requiresEmergencyFallback(criticalError, 1)).toBe(true);
      expect(errorDetector.requiresEmergencyFallback(criticalError, 0)).toBe(true);
    });

    it('should detect emergency fallback on consecutive failures', () => {
      const timeoutError = new VRFTimeoutError('Timeout', 10000);
      
      expect(errorDetector.requiresEmergencyFallback(timeoutError, 1)).toBe(false);
      expect(errorDetector.requiresEmergencyFallback(timeoutError, 2)).toBe(true);
    });

    it('should detect emergency fallback on too many consecutive failures', () => {
      const normalError = new Error('Normal error');
      
      expect(errorDetector.requiresEmergencyFallback(normalError, 2)).toBe(false);
      expect(errorDetector.requiresEmergencyFallback(normalError, 3)).toBe(true);
    });
  });

  describe('Wait Time Recommendations', () => {
    it('should calculate recommended wait times with exponential backoff', () => {
      const error = new Error('Test error');
      
      const wait1 = errorDetector.getRecommendedWaitTime(error, 1);
      const wait2 = errorDetector.getRecommendedWaitTime(error, 2);
      const wait3 = errorDetector.getRecommendedWaitTime(error, 3);
      
      expect(wait2).toBeGreaterThan(wait1);
      expect(wait3).toBeGreaterThan(wait2);
      expect(wait3).toBeLessThanOrEqual(30000); // Capped at 30 seconds
    });

    it('should use error-specific base wait times', () => {
      const queueError = new VRFQueueFullError('Queue full', 25);
      const timeoutError = new VRFTimeoutError('Timeout', 5000);
      
      const queueWait = errorDetector.getRecommendedWaitTime(queueError, 1);
      const timeoutWait = errorDetector.getRecommendedWaitTime(timeoutError, 1);
      
      expect(queueWait).toBeGreaterThan(timeoutWait); // Queue errors should wait longer
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getVRFErrorDetector();
      const instance2 = getVRFErrorDetector();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', () => {
      const detector1 = getVRFErrorDetector();
      const detector2 = getVRFErrorDetector();
      
      detector1.updateNetworkHealth(false);
      
      const error = new Error('Network error');
      const classification = detector2.classifyError(error);
      
      expect(classification.message).toContain('Network conditions are poor');
    });
  });
});