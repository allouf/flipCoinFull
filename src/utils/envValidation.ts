/**
 * Environment Variable Validation Utility
 *
 * This utility provides comprehensive validation for environment variables
 * used by the Solana Coin Flipper application, ensuring proper configuration
 * for development, staging, and production environments.
 */

export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

export interface EnvironmentConfig {
  // Blockchain Configuration
  network: string;
  programId: string;
  devnetRpcUrl: string;
  testnetRpcUrl: string;
  mainnetRpcUrl: string;
  houseFeeBps: number;
  minBetSol: number;

  // Backend Configuration
  apiBaseUrl: string;
  websocketUrl: string;
  apiKey?: string;

  // VRF Configuration
  vrfAccounts: Array<{
    pubkey: string;
    name: string;
    priority: number;
  }>;
  vrfMaxQueueDepth: number;
  vrfMaxResponseTime: number;
  vrfMinSuccessRate: number;
  vrfHealthCheckInterval: number;

  // Development Configuration
  enableDevtools: boolean;
  logLevel: string;
  enableVrfDebug: boolean;
  generateSourcemap: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  environment: 'development' | 'staging' | 'production';
  config?: EnvironmentConfig;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are present and non-empty
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new EnvironmentValidationError(
      `Missing required environment variables: ${missingVars.join(', ')}\n\n` +
      `Please copy .env.example to .env and configure the required variables.\n` +
      `See the environment variable documentation for details.`
    );
  }
}

/**
 * Validates blockchain-related environment variables
 */
export function validateBlockchainConfiguration(): void {
  const requiredVars = [
    'REACT_APP_NETWORK',
    'REACT_APP_PROGRAM_ID',
    'REACT_APP_DEVNET_RPC_URL',
    'REACT_APP_TESTNET_RPC_URL',
    'REACT_APP_MAINNET_RPC_URL',
  ];

  validateRequiredEnvVars(requiredVars);

  // Validate network
  const network = process.env.REACT_APP_NETWORK!;
  const validNetworks = ['devnet', 'testnet', 'mainnet-beta'];
  if (!validNetworks.includes(network)) {
    throw new EnvironmentValidationError(
      `Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`
    );
  }

  // Validate program ID format (Solana public key)
  const programId = process.env.REACT_APP_PROGRAM_ID!;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Regex.test(programId)) {
    throw new EnvironmentValidationError(
      `Invalid program ID format: ${programId}. Must be a valid Solana public key.`
    );
  }

  // Validate house fee BPS
  const houseFeeBps = process.env.REACT_APP_HOUSE_FEE_BPS;
  if (houseFeeBps) {
    const fee = parseInt(houseFeeBps, 10);
    if (isNaN(fee) || fee < 0 || fee > 1000) {
      throw new EnvironmentValidationError(
        `House fee BPS must be between 0 and 1000 (0-10%). Got: ${houseFeeBps}`
      );
    }
  }

  // Validate minimum bet amount
  const minBetSol = process.env.REACT_APP_MIN_BET_SOL;
  if (minBetSol) {
    const minBet = parseFloat(minBetSol);
    if (isNaN(minBet) || minBet <= 0) {
      throw new EnvironmentValidationError(
        `Minimum bet amount must be greater than 0. Got: ${minBetSol}`
      );
    }
  }

  // Validate RPC URLs
  const rpcUrls = [
    process.env.REACT_APP_DEVNET_RPC_URL!,
    process.env.REACT_APP_TESTNET_RPC_URL!,
    process.env.REACT_APP_MAINNET_RPC_URL!,
  ];

  for (const url of rpcUrls) {
    try {
      new URL(url);
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new EnvironmentValidationError(
        `Invalid RPC URL format: ${url}. Must be a valid HTTP/HTTPS URL.`
      );
    }
  }
}

/**
 * Validates VRF (Verifiable Random Function) configuration
 */
export function validateVRFConfiguration(): void {
  // Find all VRF account configurations
  const vrfAccounts: Array<{ pubkey: string; name: string; priority: number; envPrefix: string }> = [];

  for (let i = 1; i <= 10; i++) {
    const pubkeyVar = `REACT_APP_VRF_ACCOUNT_${i}_PUBKEY`;
    const nameVar = `REACT_APP_VRF_ACCOUNT_${i}_NAME`;
    const priorityVar = `REACT_APP_VRF_ACCOUNT_${i}_PRIORITY`;

    const pubkey = process.env[pubkeyVar];
    const name = process.env[nameVar];
    const priority = process.env[priorityVar];

    if (pubkey && name && priority) {
      vrfAccounts.push({
        pubkey,
        name,
        priority: parseInt(priority, 10),
        envPrefix: `REACT_APP_VRF_ACCOUNT_${i}`,
      });
    }
  }

  if (vrfAccounts.length === 0) {
    throw new EnvironmentValidationError(
      'No VRF accounts configured. At least one VRF account is required.\n\n' +
      'Please configure REACT_APP_VRF_ACCOUNT_1_PUBKEY, REACT_APP_VRF_ACCOUNT_1_NAME, ' +
      'and REACT_APP_VRF_ACCOUNT_1_PRIORITY in your environment variables.'
    );
  }

  // Validate each VRF account
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const priorities = new Set<number>();

  for (const account of vrfAccounts) {
    // Validate public key format
    if (!base58Regex.test(account.pubkey)) {
      throw new EnvironmentValidationError(
        `Invalid VRF account public key format: ${account.pubkey} (${account.envPrefix}). ` +
        'Must be a valid Solana public key.'
      );
    }

    // Check for duplicate priorities
    if (priorities.has(account.priority)) {
      throw new EnvironmentValidationError(
        `Duplicate VRF account priority: ${account.priority}. Each VRF account must have a unique priority.`
      );
    }
    priorities.add(account.priority);

    // Validate priority range
    if (account.priority < 1 || account.priority > 10) {
      throw new EnvironmentValidationError(
        `VRF account priority must be between 1 and 10. Got: ${account.priority} (${account.envPrefix})`
      );
    }

    // Warn about placeholder accounts
    const placeholderKeys = [
      '11111111111111111111111111111112',
      '11111111111111111111111111111113',
      '11111111111111111111111111111114',
    ];

    if (placeholderKeys.includes(account.pubkey)) {
      console.warn(
        `WARNING: Using placeholder VRF accounts detected (${account.name}: ${account.pubkey}). ` +
        'These should be replaced with real Switchboard VRF accounts for production use. ' +
        'See VRF_PRODUCTION_SETUP_GUIDE.md for setup instructions.'
      );
    }
  }

  // Validate VRF health monitoring configuration
  const maxQueueDepth = process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH;
  if (maxQueueDepth) {
    const depth = parseInt(maxQueueDepth, 10);
    if (isNaN(depth) || depth < 1 || depth > 100) {
      throw new EnvironmentValidationError(
        `VRF max queue depth must be between 1 and 100. Got: ${maxQueueDepth}`
      );
    }
  }

  const maxResponseTime = process.env.REACT_APP_VRF_MAX_RESPONSE_TIME;
  if (maxResponseTime) {
    const time = parseInt(maxResponseTime, 10);
    if (isNaN(time) || time < 1000 || time > 60000) {
      throw new EnvironmentValidationError(
        `VRF max response time must be between 1000 and 60000 milliseconds. Got: ${maxResponseTime}`
      );
    }
  }

  const minSuccessRate = process.env.REACT_APP_VRF_MIN_SUCCESS_RATE;
  if (minSuccessRate) {
    const rate = parseFloat(minSuccessRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      throw new EnvironmentValidationError(
        `VRF min success rate must be between 0 and 1. Got: ${minSuccessRate}`
      );
    }
  }
}

/**
 * Validates backend and database connection configuration
 */
export function validateBackendConfiguration(): void {
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;

  if (apiBaseUrl) {
    try {
      const url = new URL(apiBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new EnvironmentValidationError(
        `Invalid API base URL format: ${apiBaseUrl}. Must be a valid HTTP/HTTPS URL.`
      );
    }
  }

  if (websocketUrl) {
    try {
      const url = new URL(websocketUrl);
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new EnvironmentValidationError(
        `Invalid WebSocket URL format: ${websocketUrl}. Must be a valid WS/WSS URL.`
      );
    }
  }

  // Check for protocol consistency
  if (apiBaseUrl && websocketUrl) {
    const apiUrl = new URL(apiBaseUrl);
    const wsUrl = new URL(websocketUrl);

    const isApiSecure = apiUrl.protocol === 'https:';
    const isWsSecure = wsUrl.protocol === 'wss:';

    if (isApiSecure !== isWsSecure) {
      throw new EnvironmentValidationError(
        'Protocol mismatch between API and WebSocket URLs. ' +
        'Use HTTPS with WSS or HTTP with WS for consistency.'
      );
    }
  }
}

/**
 * Determines the current environment type based on environment variables
 */
export function getEnvironmentType(): 'development' | 'staging' | 'production' {
  const nodeEnv = process.env.NODE_ENV;
  const apiUrl = process.env.REACT_APP_API_BASE_URL;

  // Check for local development
  if (nodeEnv === 'development' || (apiUrl && apiUrl.includes('localhost'))) {
    return 'development';
  }

  // Check for staging environment
  if (apiUrl && (apiUrl.includes('staging') || apiUrl.includes('test'))) {
    return 'staging';
  }

  // Default to production
  return 'production';
}

/**
 * Parses environment configuration into a structured object
 */
function parseEnvironmentConfig(): EnvironmentConfig {
  // Parse VRF accounts
  const vrfAccounts: Array<{ pubkey: string; name: string; priority: number }> = [];

  for (let i = 1; i <= 10; i++) {
    const pubkey = process.env[`REACT_APP_VRF_ACCOUNT_${i}_PUBKEY`];
    const name = process.env[`REACT_APP_VRF_ACCOUNT_${i}_NAME`];
    const priority = process.env[`REACT_APP_VRF_ACCOUNT_${i}_PRIORITY`];

    if (pubkey && name && priority) {
      vrfAccounts.push({
        pubkey,
        name,
        priority: parseInt(priority, 10),
      });
    }
  }

  // Sort VRF accounts by priority
  vrfAccounts.sort((a, b) => a.priority - b.priority);

  return {
    // Blockchain Configuration
    network: process.env.REACT_APP_NETWORK || 'devnet',
    programId: process.env.REACT_APP_PROGRAM_ID || '',
    devnetRpcUrl: process.env.REACT_APP_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    testnetRpcUrl: process.env.REACT_APP_TESTNET_RPC_URL || 'https://api.testnet.solana.com',
    mainnetRpcUrl: process.env.REACT_APP_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    houseFeeBps: parseInt(process.env.REACT_APP_HOUSE_FEE_BPS || '300', 10),
    minBetSol: parseFloat(process.env.REACT_APP_MIN_BET_SOL || '0.01'),

    // Backend Configuration
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
    websocketUrl: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
    apiKey: process.env.REACT_APP_API_KEY,

    // VRF Configuration
    vrfAccounts,
    vrfMaxQueueDepth: parseInt(process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH || '20', 10),
    vrfMaxResponseTime: parseInt(process.env.REACT_APP_VRF_MAX_RESPONSE_TIME || '10000', 10),
    vrfMinSuccessRate: parseFloat(process.env.REACT_APP_VRF_MIN_SUCCESS_RATE || '0.90'),
    vrfHealthCheckInterval: parseInt(process.env.REACT_APP_VRF_HEALTH_CHECK_INTERVAL || '30000', 10),

    // Development Configuration
    enableDevtools: process.env.REACT_APP_ENABLE_DEVTOOLS === 'true',
    logLevel: process.env.REACT_APP_LOG_LEVEL || 'info',
    enableVrfDebug: process.env.REACT_APP_ENABLE_VRF_DEBUG === 'true',
    generateSourcemap: process.env.GENERATE_SOURCEMAP !== 'false',
  };
}

/**
 * Comprehensive environment variable validation
 *
 * This function validates all environment variables and returns a detailed
 * validation result with configuration, errors, and warnings.
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let config: EnvironmentConfig | undefined;

  try {
    // Validate blockchain configuration
    validateBlockchainConfiguration();
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      errors.push(error.message);
    } else {
      errors.push('Unexpected error during blockchain configuration validation');
    }
  }

  try {
    // Validate VRF configuration
    validateVRFConfiguration();
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      errors.push(error.message);
    } else {
      errors.push('Unexpected error during VRF configuration validation');
    }
  }

  try {
    // Validate backend configuration
    validateBackendConfiguration();
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      errors.push(error.message);
    } else {
      errors.push('Unexpected error during backend configuration validation');
    }
  }

  // Parse configuration if validation passed
  if (errors.length === 0) {
    try {
      config = parseEnvironmentConfig();
    } catch (error) {
      errors.push('Failed to parse environment configuration');
    }
  }

  // Add helpful setup message if there are errors
  if (errors.length > 0) {
    errors.push(
      '\n💡 Setup Help:\n' +
      '1. Copy .env.example to .env\n' +
      '2. Configure all required variables\n' +
      '3. See documentation for variable descriptions\n' +
      '4. Use npm run validate-env to check configuration'
    );
  }

  return {
    isValid: errors.length === 0,
    environment: getEnvironmentType(),
    config,
    errors,
    warnings,
  };
}

/**
 * Validates environment variables and throws on validation failure
 *
 * This is a convenience function for cases where you want to halt execution
 * if environment variables are not properly configured.
 */
export function validateEnvironmentVariablesOrThrow(): EnvironmentConfig {
  const result = validateEnvironmentVariables();

  if (!result.isValid) {
    throw new EnvironmentValidationError(
      'Environment validation failed:\n\n' + result.errors.join('\n\n')
    );
  }

  return result.config!;
}

/**
 * Runtime check that can be called during application startup
 */
export function performStartupEnvironmentCheck(): void {
  console.log('🔍 Validating environment configuration...');

  const result = validateEnvironmentVariables();

  if (result.isValid) {
    console.log(`✅ Environment validation passed (${result.environment} mode)`);

    if (result.warnings.length > 0) {
      console.warn('⚠️ Environment warnings:');
      result.warnings.forEach(warning => console.warn(`  ${warning}`));
    }
  } else {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`  ${error}`));

    throw new EnvironmentValidationError(
      'Application startup halted due to environment configuration errors. ' +
      'Please fix the issues above and restart.'
    );
  }
}