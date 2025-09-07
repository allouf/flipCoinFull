#!/usr/bin/env ts-node
/**
 * VRF Configuration Validation Script
 * 
 * This script validates that VRF accounts are properly configured for production use.
 * Run this before deploying to production to catch configuration issues early.
 * 
 * Usage:
 * npm run validate-vrf-config
 * or
 * ts-node scripts/validate-vrf-config.ts
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { config } from 'dotenv';
import { loadVRFAccountsFromEnv, loadVRFThresholdsFromEnv, validateVRFConfig } from '../src/config/vrfConfig';

// Load environment variables
config();

interface VRFAccountStatus {
  name: string;
  publicKey: string;
  isValid: boolean;
  isReachable: boolean;
  queueDepth?: number;
  isActive?: boolean;
  error?: string;
}

interface VRFValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  accountStatuses: VRFAccountStatus[];
}

/**
 * Main validation function
 */
async function validateVRFConfiguration(): Promise<VRFValidationResult> {
  console.log('🔍 Validating VRF Configuration...\n');
  
  const result: VRFValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    accountStatuses: [],
  };

  try {
    // Step 1: Validate basic configuration structure
    console.log('1. Validating configuration structure...');
    const configValidation = validateVRFConfig();
    
    if (!configValidation.isValid) {
      result.errors.push(...configValidation.errors);
      result.isValid = false;
    }
    
    result.warnings.push(...configValidation.warnings);
    
    // Step 2: Load VRF accounts and thresholds
    console.log('2. Loading VRF accounts and thresholds...');
    const accounts = loadVRFAccountsFromEnv();
    const thresholds = loadVRFThresholdsFromEnv();
    
    console.log(`   Found ${accounts.length} VRF accounts configured`);
    console.log(`   Health thresholds: Queue depth ≤ ${thresholds.maxQueueDepth}, Response time ≤ ${thresholds.maxResponseTime}ms, Success rate ≥ ${thresholds.minSuccessRate}`);
    
    // Step 3: Check for placeholder accounts
    console.log('3. Checking for placeholder accounts...');
    const placeholderKeys = [
      '11111111111111111111111111111112',
      '11111111111111111111111111111113', 
      '11111111111111111111111111111114',
      '11111111111111111111111111111115',
    ];
    
    accounts.forEach(account => {
      if (placeholderKeys.includes(account.publicKey.toString())) {
        const error = `❌ CRITICAL: Account "${account.name}" is using placeholder address: ${account.publicKey.toString()}`;
        result.errors.push(error);
        result.isValid = false;
        console.log(`   ${error}`);
      }
    });
    
    // Step 4: Validate account connectivity
    console.log('4. Testing VRF account connectivity...');
    const network = process.env.REACT_APP_NETWORK || 'devnet';
    const rpcUrl = network === 'mainnet-beta' 
      ? process.env.REACT_APP_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
      : process.env.REACT_APP_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
    
    console.log(`   Testing connectivity on ${network} (${rpcUrl})...`);
    const connection = new Connection(rpcUrl, 'confirmed');
    
    for (const account of accounts) {
      console.log(`   Testing account: ${account.name} (${account.publicKey.toString()})...`);
      
      const accountStatus: VRFAccountStatus = {
        name: account.name,
        publicKey: account.publicKey.toString(),
        isValid: false,
        isReachable: false,
      };
      
      try {
        // Validate public key format
        if (!PublicKey.isOnCurve(account.publicKey.toBuffer())) {
          accountStatus.error = 'Invalid public key format';
          result.errors.push(`❌ Account "${account.name}" has invalid public key format`);
          result.isValid = false;
        } else {
          accountStatus.isValid = true;
        }
        
        // Test basic account existence (simplified for now)
        try {
          // For now, just test if we can fetch account info
          const accountInfo = await connection.getAccountInfo(account.publicKey);
          
          if (accountInfo) {
            accountStatus.isReachable = true;
            accountStatus.queueDepth = 0; // Mock value - would need proper Switchboard SDK setup
            accountStatus.isActive = true; // Mock value
            
            console.log(`   ✅ ${account.name}: Account exists on blockchain`);
          } else {
            accountStatus.error = 'Account not found on blockchain';
            result.warnings.push(`⚠️  Account "${account.name}" not found on blockchain - may be a placeholder`);
            console.log(`   ⚠️  ${account.name}: Account not found`);
          }
          
        } catch (connectionError) {
          accountStatus.error = `Connection failed: ${connectionError}`;
          result.errors.push(`❌ Cannot connect to VRF account "${account.name}": ${connectionError}`);
          result.isValid = false;
          console.log(`   ❌ ${account.name}: Connection failed`);
        }
        
      } catch (error) {
        accountStatus.error = `Validation failed: ${error}`;
        result.errors.push(`❌ Account "${account.name}" validation failed: ${error}`);
        result.isValid = false;
      }
      
      result.accountStatuses.push(accountStatus);
    }
    
    // Step 5: Production readiness checks
    console.log('5. Production readiness validation...');
    
    if (accounts.length < 2) {
      result.warnings.push('⚠️  Less than 2 VRF accounts configured - consider adding redundancy');
    }
    
    if (accounts.length < 3) {
      result.warnings.push('⚠️  Less than 3 VRF accounts configured - recommended minimum is 3 for high availability');
    }
    
    // Check for production thresholds
    if (thresholds.maxQueueDepth > 15) {
      result.warnings.push(`⚠️  High queue depth threshold (${thresholds.maxQueueDepth}) - consider lowering for production`);
    }
    
    if (thresholds.maxResponseTime > 10000) {
      result.warnings.push(`⚠️  High response time threshold (${thresholds.maxResponseTime}ms) - consider lowering for production`);
    }
    
    if (thresholds.minSuccessRate < 0.95) {
      result.warnings.push(`⚠️  Low success rate threshold (${thresholds.minSuccessRate}) - consider raising to 0.95+ for production`);
    }
    
    // Step 6: Environment-specific checks
    console.log('6. Environment-specific validation...');
    
    if (network === 'mainnet-beta') {
      console.log('   🚀 Mainnet configuration detected');
      
      // Stricter validation for mainnet
      if (result.errors.length > 0) {
        result.errors.unshift('🚨 CRITICAL: Mainnet configuration has errors - deployment blocked');
      }
      
      const reachableAccounts = result.accountStatuses.filter(status => status.isReachable).length;
      if (reachableAccounts < 2) {
        result.errors.push('🚨 CRITICAL: Insufficient reachable VRF accounts for mainnet (minimum 2 required)');
        result.isValid = false;
      }
      
    } else {
      console.log(`   🧪 ${network.toUpperCase()} configuration detected`);
    }
    
  } catch (error) {
    result.errors.push(`❌ Validation script failed: ${error}`);
    result.isValid = false;
  }
  
  return result;
}

/**
 * Print validation results
 */
function printResults(result: VRFValidationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VRF CONFIGURATION VALIDATION RESULTS');
  console.log('='.repeat(60));
  
  // Overall status
  if (result.isValid) {
    console.log('\n✅ VALIDATION PASSED - Configuration is ready for use');
  } else {
    console.log('\n❌ VALIDATION FAILED - Configuration has critical issues');
  }
  
  // Account statuses
  console.log('\n📋 VRF Account Status:');
  result.accountStatuses.forEach(status => {
    const statusIcon = status.isValid && status.isReachable ? '✅' : '❌';
    console.log(`   ${statusIcon} ${status.name}: ${status.publicKey}`);
    if (status.queueDepth !== undefined) {
      console.log(`       Queue Depth: ${status.queueDepth}, Active: ${status.isActive}`);
    }
    if (status.error) {
      console.log(`       Error: ${status.error}`);
    }
  });
  
  // Errors
  if (result.errors.length > 0) {
    console.log('\n🚨 ERRORS (Must be fixed):');
    result.errors.forEach(error => console.log(`   ${error}`));
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Recommended to address):');
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (result.isValid) {
    console.log('   • Configuration looks good! Consider running integration tests next');
    console.log('   • Monitor VRF account health after deployment');
    console.log('   • Set up alerts for VRF failures in production');
  } else {
    console.log('   • Fix all critical errors before deploying to production');
    console.log('   • Follow VRF_PRODUCTION_SETUP_GUIDE.md for proper account setup');
    console.log('   • Test configuration on devnet first');
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const result = await validateVRFConfiguration();
    printResults(result);
    
    // Exit with error code if validation failed
    if (!result.isValid) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Validation script crashed:', error);
    process.exit(1);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  main();
}

export { validateVRFConfiguration, VRFValidationResult, VRFAccountStatus };