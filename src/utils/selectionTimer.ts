/**
 * Selection Timer Utility
 * 
 * Handles client-side selection timeout logic since SELECTION_TIMEOUT_SECONDS
 * was moved from the smart contract to reduce on-chain storage costs.
 */

import { PROGRAM_CONFIG } from '../config/program';

export interface SelectionTimerConfig {
  timeoutSeconds: number;
  onTimeout: () => void;
  onTick?: (remainingSeconds: number) => void;
  onWarning?: (remainingSeconds: number) => void;
  warningThreshold?: number;
}

export class SelectionTimer {
  private timerId: NodeJS.Timeout | null = null;
  private tickTimerId: NodeJS.Timeout | null = null;
  private startTime: number;
  private config: SelectionTimerConfig;
  private isActive: boolean = false;

  constructor(config: SelectionTimerConfig) {
    this.config = {
      warningThreshold: 30, // 30 seconds warning by default
      ...config,
    };
    this.startTime = Date.now();
  }

  /**
   * Start the selection timer
   */
  start(): void {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;
    this.startTime = Date.now();

    // Set main timeout
    this.timerId = setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeoutSeconds * 1000);

    // Set tick interval for UI updates
    if (this.config.onTick) {
      this.startTicker();
    }

    console.log(`⏱️ Selection timer started: ${this.config.timeoutSeconds} seconds`);
  }

  /**
   * Stop the selection timer
   */
  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.tickTimerId) {
      clearInterval(this.tickTimerId);
      this.tickTimerId = null;
    }

    this.isActive = false;
    console.log('⏹️ Selection timer stopped');
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime(): number {
    if (!this.isActive) return 0;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const remaining = Math.max(0, this.config.timeoutSeconds - elapsed);
    return Math.ceil(remaining);
  }

  /**
   * Check if timer is currently active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Handle timeout event
   */
  private handleTimeout(): void {
    this.isActive = false;
    this.config.onTimeout();
    console.log('⏰ Selection timeout reached');
  }

  /**
   * Start the ticker for UI updates
   */
  private startTicker(): void {
    this.tickTimerId = setInterval(() => {
      if (!this.isActive) return;

      const remaining = this.getRemainingTime();
      
      // Call onTick callback
      if (this.config.onTick) {
        this.config.onTick(remaining);
      }

      // Call warning callback if threshold reached
      if (
        this.config.onWarning && 
        this.config.warningThreshold && 
        remaining <= this.config.warningThreshold && 
        remaining > 0
      ) {
        this.config.onWarning(remaining);
      }

      // Stop ticker when time is up
      if (remaining <= 0) {
        this.stop();
      }
    }, 1000); // Update every second
  }
}

/**
 * Create a selection timer with default configuration
 */
export function createSelectionTimer(
  onTimeout: () => void,
  onTick?: (remainingSeconds: number) => void,
  onWarning?: (remainingSeconds: number) => void
): SelectionTimer {
  return new SelectionTimer({
    timeoutSeconds: PROGRAM_CONFIG.selectionTimeoutSeconds,
    onTimeout,
    onTick,
    onWarning,
    warningThreshold: 30, // 30 seconds warning
  });
}

/**
 * Hook for React components to use selection timer
 */
export function useSelectionTimer(
  onTimeout: () => void,
  onTick?: (remainingSeconds: number) => void,
  onWarning?: (remainingSeconds: number) => void
) {
  const timer = createSelectionTimer(onTimeout, onTick, onWarning);

  // Cleanup function for React
  const cleanup = () => {
    timer.stop();
  };

  return {
    timer,
    cleanup,
    start: () => timer.start(),
    stop: () => timer.stop(),
    getRemainingTime: () => timer.getRemainingTime(),
    isActive: () => timer.getIsActive(),
  };
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Constants for selection timeout
 */
export const SELECTION_TIMEOUT = {
  SECONDS: PROGRAM_CONFIG.selectionTimeoutSeconds,
  MILLISECONDS: PROGRAM_CONFIG.selectionTimeoutSeconds * 1000,
  WARNING_THRESHOLD: 30, // Show warning at 30 seconds
  CRITICAL_THRESHOLD: 10, // Show critical warning at 10 seconds
} as const;
