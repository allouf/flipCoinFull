/**
 * Efficient RPC Manager for Solana
 *
 * This manager implements:
 * 1. Circuit breaker pattern to prevent rate limit abuse
 * 2. Request batching and deduplication
 * 3. Smart caching with TTL
 * 4. User-controlled refresh mechanisms
 * 5. Optimistic updates
 */

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit breaker is open, failing fast
  HALF_OPEN = 'half_open', // Testing if service is back
}

export interface RpcRequest {
  key: string;
  fn: () => Promise<any>;
  priority: 'low' | 'normal' | 'high';
  userInitiated: boolean;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  userRefreshed: boolean;
}

export class RpcManager {
  private cache = new Map<string, CacheEntry>();

  private pendingRequests = new Map<string, Promise<any>>();

  private circuitState = CircuitState.CLOSED;

  private failureCount = 0;

  private lastFailureTime = 0;

  private requestQueue: RpcRequest[] = [];

  private isProcessing = false;

  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 3;

  private readonly RESET_TIMEOUT = 30000; // 30 seconds

  private readonly HALF_OPEN_MAX_CALLS = 1;

  // Cache configuration
  private readonly DEFAULT_TTL = 60000; // 1 minute default TTL

  private readonly STALE_WHILE_REVALIDATE_TTL = 300000; // 5 minutes stale tolerance

  // Rate limiting configuration
  private readonly MAX_CONCURRENT_REQUESTS = 2;

  private readonly REQUEST_DELAY = 1000; // 1 second between batches

  private activeRequests = 0;

  /**
   * Main method to execute RPC calls with intelligent caching and circuit breaking
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number;
      priority?: 'low' | 'normal' | 'high';
      userInitiated?: boolean;
      useStale?: boolean;
    } = {},
  ): Promise<T> {
    const {
      ttl = this.DEFAULT_TTL,
      priority = 'normal',
      userInitiated = false,
      useStale = true,
    } = options;

    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.failureCount = 0;
      } else {
        // Return stale data if available, otherwise throw
        const cached = this.cache.get(key);
        if (cached && useStale) {
          console.log(`🔌 Circuit breaker OPEN - returning stale data for ${key}`);
          return cached.data;
        }
        throw new Error('Service temporarily unavailable. Please try refreshing manually in a moment.');
      }
    }

    // Check cache first
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached) {
      const isExpired = (now - cached.timestamp) > cached.ttl;
      const isStale = (now - cached.timestamp) > this.STALE_WHILE_REVALIDATE_TTL;

      // Return fresh cache immediately
      if (!isExpired) {
        console.log(`💾 Cache hit for ${key} (fresh)`);
        return cached.data;
      }

      // For expired but not stale data, return cache and optionally refresh in background
      if (!isStale && useStale) {
        console.log(`💾 Cache hit for ${key} (stale, refreshing in background)`);

        // Only refresh in background if user initiated or high priority
        if (userInitiated || priority === 'high') {
          this.refreshInBackground(key, requestFn, ttl);
        }

        return cached.data;
      }

      // For very stale data, fall through to fresh request
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Request already pending for ${key}, waiting...`);
      return this.pendingRequests.get(key)!;
    }

    // Add to request queue
    const request: RpcRequest = {
      key,
      fn: requestFn,
      priority,
      userInitiated,
    };

    return this.queueRequest(request, ttl);
  }

  /**
   * Queue request for batch processing
   */
  private async queueRequest<T>(request: RpcRequest, ttl: number): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add resolve/reject to request
      (request as any).resolve = resolve;
      (request as any).reject = reject;
      (request as any).ttl = ttl;

      // Insert request based on priority
      if (request.priority === 'high' || request.userInitiated) {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }

      // Start processing if not already
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process request queue with rate limiting and batching
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
      const request = this.requestQueue.shift()!;
      this.executeRequest(request);
    }

    // If queue is not empty, wait and process more
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), this.REQUEST_DELAY);
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Execute individual request with circuit breaker logic
   */
  private async executeRequest(request: RpcRequest): Promise<void> {
    const {
      key, fn, resolve, reject, ttl,
    } = request as any;

    this.activeRequests++;
    const promise = this.makeRequest(key, fn, ttl);
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Make the actual RPC request with error handling
   */
  private async makeRequest<T>(key: string, requestFn: () => Promise<T>, ttl: number): Promise<T> {
    try {
      console.log(`🚀 Making fresh request for ${key}`);
      const result = await requestFn();

      // Success - reset circuit breaker
      this.onSuccess();

      // Cache the result
      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl,
        userRefreshed: false,
      });

      return result;
    } catch (error: any) {
      console.error(`❌ Request failed for ${key}:`, error.message);
      this.onFailure();
      throw error;
    }
  }

  /**
   * Refresh data in background without blocking
   */
  private refreshInBackground<T>(key: string, requestFn: () => Promise<T>, ttl: number): void {
    // Don't refresh if circuit is open or already refreshing
    if (this.circuitState === CircuitState.OPEN || this.pendingRequests.has(key)) {
      return;
    }

    console.log(`🔄 Background refresh for ${key}`);
    this.makeRequest(key, requestFn, ttl).catch((error) => {
      console.warn(`Background refresh failed for ${key}:`, error.message);
    });
  }

  /**
   * Circuit breaker success handler
   */
  private onSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      console.log('🟢 Circuit breaker CLOSED - service recovered');
      this.circuitState = CircuitState.CLOSED;
    }
    this.failureCount = 0;
  }

  /**
   * Circuit breaker failure handler
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      console.log('🔴 Circuit breaker OPEN - too many failures');
      this.circuitState = CircuitState.OPEN;
    }
  }

  /**
   * Force refresh data (user-initiated)
   */
  async forceRefresh<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    // Clear cache for this key
    this.cache.delete(key);

    return this.execute(key, requestFn, {
      ttl,
      priority: 'high',
      userInitiated: true,
      useStale: false,
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    circuitState: CircuitState;
    failureCount: number;
    pendingRequests: number;
    queueLength: number;
  } {
    return {
      size: this.cache.size,
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      pendingRequests: this.pendingRequests.size,
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitState === CircuitState.OPEN;
  }
}

// Global singleton instance
export const rpcManager = new RpcManager();
