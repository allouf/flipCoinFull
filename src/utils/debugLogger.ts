/**
 * Debug Logger Utility
 * Provides structured, consistent logging for the coin flip game flow
 * Makes it easy to trace transactions and debug issues
 */

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogContext {
  step?: string;
  action?: string;
  data?: Record<string, any>;
  timestamp?: boolean;
}

class DebugLogger {
  private enabled = true;
  private logHistory: Array<{ timestamp: Date; level: LogLevel; message: string; context?: any }> = [];
  private maxHistory = 1000;

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log a flow start
   */
  flowStart(flowName: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎬 ${flowName.toUpperCase()} - START`);
    console.log(`${'='.repeat(50)}`);
    console.log('🕒 Timestamp:', new Date().toISOString());

    if (data) {
      console.log('📋 Input:', data);
    }

    this.addToHistory('info', `Flow Start: ${flowName}`, data);
  }

  /**
   * Log a flow end with success
   */
  flowSuccess(flowName: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ ${flowName.toUpperCase()} - SUCCESS`);
    console.log(`${'='.repeat(50)}`);
    console.log('🕒 Completed at:', new Date().toISOString());

    if (data) {
      console.log('📤 Output:', data);
    }

    console.log(`${'='.repeat(50)}\n`);
    this.addToHistory('success', `Flow Success: ${flowName}`, data);
  }

  /**
   * Log a flow end with failure
   */
  flowError(flowName: string, error: Error | unknown, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.error(`\n${'='.repeat(50)}`);
    console.error(`❌ ${flowName.toUpperCase()} - FAILED`);
    console.error(`${'='.repeat(50)}`);
    console.error('🕒 Failed at:', new Date().toISOString());
    console.error('💥 Error type:', error?.constructor?.name);
    console.error('📄 Error message:', error instanceof Error ? error.message : String(error));
    console.error('🔍 Full error:', error);

    if (data) {
      console.error('📋 Context:', data);
    }

    console.error(`${'='.repeat(50)}\n`);
    this.addToHistory('error', `Flow Error: ${flowName}`, { error, context: data });
  }

  /**
   * Log a numbered step in a flow
   */
  step(stepNumber: number, stepName: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`\n📍 Step ${stepNumber}: ${stepName}`);

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`  ${key}:`, value);
        } else {
          console.log(`  ${key}:`, value);
        }
      });
    }

    this.addToHistory('info', `Step ${stepNumber}: ${stepName}`, data);
  }

  /**
   * Log transaction details with Solana Explorer link
   */
  transaction(signature: string, description?: string) {
    if (!this.enabled) return;

    console.log('\n💳 Transaction Details:');
    console.log('  📝 Signature:', signature);
    console.log('  🔗 Explorer:', this.getExplorerLink(signature));

    if (description) {
      console.log('  📄 Description:', description);
    }

    this.addToHistory('success', 'Transaction', { signature, description });
  }

  /**
   * Log PDA derivation
   */
  pda(name: string, address: string, bump?: number, seeds?: string[]) {
    if (!this.enabled) return;

    console.log(`  ✅ ${name}:`, address);
    if (bump !== undefined) {
      console.log(`     Bump:`, bump);
    }
    if (seeds) {
      console.log(`     Seeds:`, seeds);
    }

    this.addToHistory('debug', `PDA: ${name}`, { address, bump, seeds });
  }

  /**
   * Log account details
   */
  account(name: string, details: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`  📋 ${name}:`);
    Object.entries(details).forEach(([key, value]) => {
      console.log(`     - ${key}:`, value);
    });

    this.addToHistory('debug', `Account: ${name}`, details);
  }

  /**
   * Log general info
   */
  info(message: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`ℹ️  ${message}`);
    if (data) {
      console.log('  Data:', data);
    }

    this.addToHistory('info', message, data);
  }

  /**
   * Log success message
   */
  success(message: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.log(`✅ ${message}`);
    if (data) {
      console.log('  Data:', data);
    }

    this.addToHistory('success', message, data);
  }

  /**
   * Log warning message
   */
  warning(message: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.warn(`⚠️  ${message}`);
    if (data) {
      console.warn('  Data:', data);
    }

    this.addToHistory('warning', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, data?: Record<string, any>) {
    if (!this.enabled) return;

    console.error(`❌ ${message}`);
    if (error) {
      console.error('  Error:', error instanceof Error ? error.message : String(error));
      console.error('  Full error:', error);
    }
    if (data) {
      console.error('  Data:', data);
    }

    this.addToHistory('error', message, { error, context: data });
  }

  /**
   * Log debug message (only in dev mode)
   */
  debug(message: string, data?: Record<string, any>) {
    if (!this.enabled || process.env.NODE_ENV === 'production') return;

    console.log(`🔍 [DEBUG] ${message}`);
    if (data) {
      console.log('  Data:', data);
    }

    this.addToHistory('debug', message, data);
  }

  /**
   * Get Solana Explorer link
   */
  private getExplorerLink(signature: string): string {
    const network = process.env.REACT_APP_NETWORK || 'devnet';
    const clusterParam = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  }

  /**
   * Add log entry to history
   */
  private addToHistory(level: LogLevel, message: string, context?: any) {
    this.logHistory.push({
      timestamp: new Date(),
      level,
      message,
      context,
    });

    // Trim history if too long
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory = this.logHistory.slice(-this.maxHistory);
    }
  }

  /**
   * Get log history
   */
  getHistory(level?: LogLevel): Array<{ timestamp: Date; level: LogLevel; message: string; context?: any }> {
    if (level) {
      return this.logHistory.filter(log => log.level === level);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(filename = 'coin-flip-debug-logs.json') {
    const dataStr = this.exportLogs();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Export convenience functions
export const logFlowStart = (flowName: string, data?: Record<string, any>) => debugLogger.flowStart(flowName, data);
export const logFlowSuccess = (flowName: string, data?: Record<string, any>) => debugLogger.flowSuccess(flowName, data);
export const logFlowError = (flowName: string, error: Error | unknown, data?: Record<string, any>) => debugLogger.flowError(flowName, error, data);
export const logStep = (stepNumber: number, stepName: string, data?: Record<string, any>) => debugLogger.step(stepNumber, stepName, data);
export const logTransaction = (signature: string, description?: string) => debugLogger.transaction(signature, description);
export const logPDA = (name: string, address: string, bump?: number, seeds?: string[]) => debugLogger.pda(name, address, bump, seeds);
export const logAccount = (name: string, details: Record<string, any>) => debugLogger.account(name, details);
export const logInfo = (message: string, data?: Record<string, any>) => debugLogger.info(message, data);
export const logSuccess = (message: string, data?: Record<string, any>) => debugLogger.success(message, data);
export const logWarning = (message: string, data?: Record<string, any>) => debugLogger.warning(message, data);
export const logError = (message: string, error?: Error | unknown, data?: Record<string, any>) => debugLogger.error(message, error, data);
export const logDebug = (message: string, data?: Record<string, any>) => debugLogger.debug(message, data);