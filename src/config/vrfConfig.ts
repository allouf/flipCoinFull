import { PublicKey } from '@solana/web3.js';
import { VRFAccountConfig, VRFHealthThresholds } from '../services/VRFAccountManager';

/**
 * Load VRF account configurations from environment variables
 */
export const loadVRFAccountsFromEnv = (): VRFAccountConfig[] => {
  const accounts: VRFAccountConfig[] = [];
  
  // Check for up to 10 potential VRF accounts (expandable)
  for (let i = 1; i <= 10; i++) {
    const pubkeyEnv = process.env[`REACT_APP_VRF_ACCOUNT_${i}_PUBKEY`];
    const nameEnv = process.env[`REACT_APP_VRF_ACCOUNT_${i}_NAME`];
    const priorityEnv = process.env[`REACT_APP_VRF_ACCOUNT_${i}_PRIORITY`];
    
    // Skip if any required field is missing
    if (!pubkeyEnv || !nameEnv || !priorityEnv) {
      continue;
    }
    
    try {
      const publicKey = new PublicKey(pubkeyEnv);
      const priority = parseInt(priorityEnv, 10);
      
      if (isNaN(priority)) {
        console.warn(`Invalid priority for VRF account ${i}: ${priorityEnv}`);
        continue;
      }
      
      accounts.push({
        publicKey,
        name: nameEnv,
        priority,
      });
      
    } catch (error) {
      console.error(`Invalid public key for VRF account ${i}:`, pubkeyEnv, error);
    }
  }
  
  if (accounts.length === 0) {
    console.warn('No VRF accounts configured in environment variables');
    
    // Return default development accounts as fallback
    return getDefaultVRFAccounts();
  }
  
  // Sort by priority for consistent ordering
  accounts.sort((a, b) => a.priority - b.priority);
  
  console.log(`Loaded ${accounts.length} VRF accounts from environment:`, 
    accounts.map(acc => `${acc.name} (priority: ${acc.priority})`));
  
  return accounts;
};

/**
 * Load VRF health thresholds from environment variables
 */
export const loadVRFThresholdsFromEnv = (): VRFHealthThresholds => {
  const network = process.env.REACT_APP_NETWORK || 'devnet';
  const isProduction = network === 'mainnet-beta';
  
  // Production defaults (stricter)
  const productionDefaults = {
    maxQueueDepth: 10,
    maxResponseTime: 8000,
    minSuccessRate: 0.95,
  };
  
  // Development defaults (more relaxed)
  const developmentDefaults = {
    maxQueueDepth: 20,
    maxResponseTime: 10000,
    minSuccessRate: 0.90,
  };
  
  const defaults = isProduction ? productionDefaults : developmentDefaults;
  
  const maxQueueDepth = process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH
    ? parseInt(process.env.REACT_APP_VRF_MAX_QUEUE_DEPTH, 10)
    : defaults.maxQueueDepth;
    
  const maxResponseTime = process.env.REACT_APP_VRF_MAX_RESPONSE_TIME
    ? parseInt(process.env.REACT_APP_VRF_MAX_RESPONSE_TIME, 10)
    : defaults.maxResponseTime;
    
  const minSuccessRate = process.env.REACT_APP_VRF_MIN_SUCCESS_RATE
    ? parseFloat(process.env.REACT_APP_VRF_MIN_SUCCESS_RATE)
    : defaults.minSuccessRate;
  
  // Log the configuration being used
  console.log(`VRF Thresholds (${network}):`, {
    maxQueueDepth,
    maxResponseTime,
    minSuccessRate,
    isProduction,
  });
    
  return {
    maxQueueDepth,
    maxResponseTime,
    minSuccessRate,
  };
};

/**
 * Get VRF health check interval from environment
 */
export const getVRFHealthCheckInterval = (): number => {
  return process.env.REACT_APP_VRF_HEALTH_CHECK_INTERVAL
    ? parseInt(process.env.REACT_APP_VRF_HEALTH_CHECK_INTERVAL, 10)
    : 30000; // 30 seconds default
};

/**
 * Default VRF accounts for development (placeholder keys)
 */
const getDefaultVRFAccounts = (): VRFAccountConfig[] => {
  console.warn('Using default VRF account configuration for development');
  
  return [
    {
      publicKey: new PublicKey('11111111111111111111111111111112'),
      name: 'dev-primary',
      priority: 1,
    },
    {
      publicKey: new PublicKey('11111111111111111111111111111113'),
      name: 'dev-secondary', 
      priority: 2,
    },
    {
      publicKey: new PublicKey('11111111111111111111111111111114'),
      name: 'dev-tertiary',
      priority: 3,
    },
  ];
};

/**
 * Get production-specific VRF configuration recommendations
 */
export const getVRFConfigRecommendations = (network: string) => {
  const isProduction = network === 'mainnet-beta';
  
  if (isProduction) {
    return {
      minAccounts: 3,
      recommendedAccounts: 4,
      maxQueueDepth: 8,
      maxResponseTime: 6000,
      minSuccessRate: 0.98,
      healthCheckInterval: 20000,
    };
  }
  
  // Staging/Development recommendations
  return {
    minAccounts: 2,
    recommendedAccounts: 3,
    maxQueueDepth: 15,
    maxResponseTime: 9000,
    minSuccessRate: 0.92,
    healthCheckInterval: 30000,
  };
};

/**
 * Check if VRF account appears to be a placeholder
 */
export const isPlaceholderAccount = (publicKey: PublicKey): boolean => {
  const placeholderKeys = [
    '11111111111111111111111111111112',
    '11111111111111111111111111111113',
    '11111111111111111111111111111114',
    '11111111111111111111111111111115',
  ];
  
  return placeholderKeys.includes(publicKey.toString());
};

/**
 * Enhanced VRF configuration validation
 */
export const validateVRFConfig = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  try {
    const accounts = loadVRFAccountsFromEnv();
    const thresholds = loadVRFThresholdsFromEnv();
    const network = process.env.REACT_APP_NETWORK || 'devnet';
    const isProduction = network === 'mainnet-beta';
    const configRecs = getVRFConfigRecommendations(network);
    
    // Account configuration validation
    if (accounts.length === 0) {
      errors.push('No VRF accounts configured');
    } else if (accounts.length < configRecs.minAccounts) {
      if (isProduction) {
        errors.push(`Insufficient VRF accounts for production (${accounts.length}/${configRecs.minAccounts} minimum)`);
      } else {
        warnings.push(`Consider adding more VRF accounts (${accounts.length}/${configRecs.recommendedAccounts} recommended)`);
      }
    }
    
    // Check for placeholder accounts
    const placeholderAccounts = accounts.filter(acc => isPlaceholderAccount(acc.publicKey));
    if (placeholderAccounts.length > 0) {
      const message = `Placeholder VRF accounts detected: ${placeholderAccounts.map(acc => acc.name).join(', ')}`;
      if (isProduction) {
        errors.push(`CRITICAL: ${message} - Replace with real Switchboard VRF accounts`);
      } else {
        warnings.push(`${message} - Use real accounts for staging/production`);
      }
    }
    
    // Check for duplicate names
    const names = accounts.map(acc => acc.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      errors.push('Duplicate VRF account names found');
    }
    
    // Check for duplicate priorities
    const priorities = accounts.map(acc => acc.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      warnings.push('Duplicate VRF account priorities found - may affect failover order');
    }
    
    // Validate priority ordering (should start from 1 and be sequential)
    const sortedPriorities = [...priorities].sort((a, b) => a - b);
    if (sortedPriorities[0] !== 1) {
      warnings.push('VRF account priorities should start from 1');
    }
    
    // Validate threshold values
    if (thresholds.maxQueueDepth <= 0) {
      errors.push('Invalid maxQueueDepth threshold (must be > 0)');
    }
    
    if (thresholds.maxResponseTime <= 0) {
      errors.push('Invalid maxResponseTime threshold (must be > 0)');
    }
    
    if (thresholds.minSuccessRate < 0 || thresholds.minSuccessRate > 1) {
      errors.push('Invalid minSuccessRate threshold (must be 0.0-1.0)');
    }
    
    // Production-specific threshold validation
    if (isProduction) {
      if (thresholds.maxQueueDepth > configRecs.maxQueueDepth) {
        warnings.push(`High queue depth threshold for production (${thresholds.maxQueueDepth} > ${configRecs.maxQueueDepth} recommended)`);
      }
      
      if (thresholds.maxResponseTime > configRecs.maxResponseTime) {
        warnings.push(`High response time threshold for production (${thresholds.maxResponseTime}ms > ${configRecs.maxResponseTime}ms recommended)`);
      }
      
      if (thresholds.minSuccessRate < configRecs.minSuccessRate) {
        warnings.push(`Low success rate threshold for production (${thresholds.minSuccessRate} < ${configRecs.minSuccessRate} recommended)`);
      }
    }
    
    // Health check interval validation
    const interval = getVRFHealthCheckInterval();
    if (interval < 5000) {
      warnings.push('VRF health check interval is very frequent (< 5 seconds) - may impact performance');
    } else if (interval > 60000) {
      warnings.push('VRF health check interval is infrequent (> 60 seconds) - may delay error detection');
    }
    
    // Generate recommendations
    if (accounts.length < configRecs.recommendedAccounts && accounts.length >= configRecs.minAccounts) {
      recommendations.push(`Consider adding ${configRecs.recommendedAccounts - accounts.length} more VRF accounts for better redundancy`);
    }
    
    if (placeholderAccounts.length === 0 && accounts.length >= configRecs.minAccounts) {
      recommendations.push('VRF account configuration looks good for production use');
    }
    
    if (isProduction && errors.length === 0) {
      recommendations.push('Remember to test VRF connectivity before going live');
      recommendations.push('Set up monitoring alerts for VRF failures in production');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`VRF configuration validation failed: ${error}`],
      warnings: [],
      recommendations: [],
    };
  }
};

/**
 * Initialize VRF configuration and log validation results
 */
export const initializeVRFConfig = () => {
  const validation = validateVRFConfig();
  const network = process.env.REACT_APP_NETWORK || 'devnet';
  const isProduction = network === 'mainnet-beta';
  
  console.log(`\n🎲 Initializing VRF Configuration (${network.toUpperCase()})...`);
  
  if (!validation.isValid) {
    console.error('❌ VRF Configuration Errors:', validation.errors);
    if (isProduction) {
      throw new Error(`CRITICAL: Production VRF configuration is invalid: ${validation.errors.join(', ')}`);
    } else {
      console.warn('⚠️  Proceeding with invalid configuration for development/testing');
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  VRF Configuration Warnings:');
    validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.log('💡 VRF Configuration Recommendations:');
    validation.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  const accounts = loadVRFAccountsFromEnv();
  const thresholds = loadVRFThresholdsFromEnv();
  
  console.log('✅ VRF Configuration Summary:', {
    network,
    accountCount: accounts.length,
    accounts: accounts.map(acc => `${acc.name} (priority: ${acc.priority})`),
    thresholds,
    healthCheckInterval: getVRFHealthCheckInterval(),
    isProduction,
  });
  
  if (isProduction && !validation.isValid) {
    console.error('🚨 STOPPING: Cannot proceed with invalid production configuration');
    throw new Error('Production VRF configuration validation failed');
  }
  
  return { accounts, thresholds, validation };
};

/**
 * Create production-optimized VRF health thresholds
 */
export const createProductionVRFThresholds = (): VRFHealthThresholds => {
  return {
    maxQueueDepth: 8,
    maxResponseTime: 6000,
    minSuccessRate: 0.98,
  };
};

/**
 * Create development VRF health thresholds
 */
export const createDevelopmentVRFThresholds = (): VRFHealthThresholds => {
  return {
    maxQueueDepth: 20,
    maxResponseTime: 12000,
    minSuccessRate: 0.85,
  };
};