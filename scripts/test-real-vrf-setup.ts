#!/usr/bin/env ts-node

/**
 * Test script to validate real Switchboard VRF account setup
 * This script tests the configuration with actual VRF accounts (not placeholders)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { loadVRFAccountsFromEnv, validateVRFConfig, isPlaceholderAccount } from '../src/config/vrfConfig';

// Known Switchboard devnet oracle queue
const KNOWN_DEVNET_ORACLE_QUEUE = 'F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class RealVRFAccountTester {
  private connection: Connection;
  private results: TestResult[] = [];

  constructor() {
    const network = process.env.REACT_APP_NETWORK || 'devnet';
    const rpcUrl = network === 'devnet' 
      ? process.env.REACT_APP_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  private addResult(test: string, passed: boolean, message: string, details?: any) {
    this.results.push({ test, passed, message, details });
  }

  async testEnvironmentConfiguration() {
    console.log('🔍 Testing Environment Configuration...\n');

    try {
      // Test 1: Load VRF accounts from environment
      const accounts = loadVRFAccountsFromEnv();
      
      if (accounts.length === 0) {
        this.addResult(
          'Environment VRF Loading',
          false,
          'No VRF accounts configured in environment',
          { accountCount: 0 }
        );
        return;
      }

      this.addResult(
        'Environment VRF Loading',
        true,
        `Successfully loaded ${accounts.length} VRF accounts`,
        { 
          accountCount: accounts.length,
          accounts: accounts.map(acc => acc.name)
        }
      );

      // Test 2: Check for placeholder accounts
      const placeholderAccounts = accounts.filter(acc => isPlaceholderAccount(acc.publicKey));
      
      if (placeholderAccounts.length > 0) {
        this.addResult(
          'Placeholder Account Detection',
          false,
          `Found ${placeholderAccounts.length} placeholder accounts`,
          { placeholders: placeholderAccounts.map(acc => acc.name) }
        );
      } else {
        this.addResult(
          'Placeholder Account Detection',
          true,
          'No placeholder accounts detected - using real VRF accounts',
          { realAccountCount: accounts.length }
        );
      }

      // Test 3: Validate account public key format
      const invalidAccounts = [];
      for (const account of accounts) {
        try {
          new PublicKey(account.publicKey);
        } catch (error) {
          invalidAccounts.push(account.name);
        }
      }

      if (invalidAccounts.length > 0) {
        this.addResult(
          'Public Key Format Validation',
          false,
          `Invalid public key format in accounts: ${invalidAccounts.join(', ')}`,
          { invalidAccounts }
        );
      } else {
        this.addResult(
          'Public Key Format Validation',
          true,
          'All VRF accounts have valid public key format',
          { validAccountCount: accounts.length }
        );
      }

    } catch (error) {
      this.addResult(
        'Environment Configuration',
        false,
        `Failed to load environment configuration: ${error}`,
        { error: String(error) }
      );
    }
  }

  async testVRFAccountConnectivity() {
    console.log('🌐 Testing VRF Account Connectivity...\n');

    try {
      const accounts = loadVRFAccountsFromEnv();
      
      for (const account of accounts) {
        if (isPlaceholderAccount(account.publicKey)) {
          this.addResult(
            `Connectivity: ${account.name}`,
            false,
            `Skipped placeholder account`,
            { address: account.publicKey.toString() }
          );
          continue;
        }

        try {
          // Test account existence on blockchain
          const accountInfo = await this.connection.getAccountInfo(account.publicKey);
          
          if (accountInfo) {
            this.addResult(
              `Connectivity: ${account.name}`,
              true,
              `Account exists on blockchain`,
              { 
                address: account.publicKey.toString(),
                lamports: accountInfo.lamports,
                owner: accountInfo.owner.toString()
              }
            );
          } else {
            this.addResult(
              `Connectivity: ${account.name}`,
              false,
              `Account does not exist on blockchain`,
              { address: account.publicKey.toString() }
            );
          }

        } catch (error) {
          this.addResult(
            `Connectivity: ${account.name}`,
            false,
            `Failed to check account connectivity: ${error}`,
            { address: account.publicKey.toString(), error: String(error) }
          );
        }
      }

    } catch (error) {
      this.addResult(
        'VRF Account Connectivity',
        false,
        `Failed to test connectivity: ${error}`,
        { error: String(error) }
      );
    }
  }

  async testSwitchboardOracleQueue() {
    console.log('🔮 Testing Switchboard Oracle Queue...\n');

    try {
      const queuePubkey = new PublicKey(KNOWN_DEVNET_ORACLE_QUEUE);
      const queueInfo = await this.connection.getAccountInfo(queuePubkey);

      if (queueInfo) {
        this.addResult(
          'Switchboard Oracle Queue',
          true,
          'Devnet oracle queue is accessible',
          {
            queueAddress: KNOWN_DEVNET_ORACLE_QUEUE,
            lamports: queueInfo.lamports,
            owner: queueInfo.owner.toString()
          }
        );
      } else {
        this.addResult(
          'Switchboard Oracle Queue',
          false,
          'Devnet oracle queue not found',
          { queueAddress: KNOWN_DEVNET_ORACLE_QUEUE }
        );
      }

    } catch (error) {
      this.addResult(
        'Switchboard Oracle Queue',
        false,
        `Failed to check oracle queue: ${error}`,
        { error: String(error) }
      );
    }
  }

  async testVRFConfiguration() {
    console.log('⚙️  Testing VRF Configuration Validation...\n');

    try {
      const validation = validateVRFConfig();
      
      this.addResult(
        'VRF Configuration Validation',
        validation.isValid,
        validation.isValid ? 'Configuration is valid' : `Configuration has errors: ${validation.errors.join(', ')}`,
        {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          recommendations: validation.recommendations
        }
      );

    } catch (error) {
      this.addResult(
        'VRF Configuration Validation',
        false,
        `Failed to validate configuration: ${error}`,
        { error: String(error) }
      );
    }
  }

  async testProductionReadiness() {
    console.log('🚀 Testing Production Readiness...\n');

    try {
      const accounts = loadVRFAccountsFromEnv();
      const network = process.env.REACT_APP_NETWORK || 'devnet';
      const isProduction = network === 'mainnet-beta';

      // Check minimum account count
      const minAccounts = isProduction ? 3 : 2;
      if (accounts.length < minAccounts) {
        this.addResult(
          'Production Readiness: Account Count',
          false,
          `Insufficient VRF accounts (${accounts.length}/${minAccounts} minimum)`,
          { current: accounts.length, required: minAccounts, network }
        );
      } else {
        this.addResult(
          'Production Readiness: Account Count',
          true,
          `Sufficient VRF accounts for ${network}`,
          { current: accounts.length, required: minAccounts, network }
        );
      }

      // Check for placeholder accounts in production
      const placeholderCount = accounts.filter(acc => isPlaceholderAccount(acc.publicKey)).length;
      if (isProduction && placeholderCount > 0) {
        this.addResult(
          'Production Readiness: Real Accounts',
          false,
          `CRITICAL: ${placeholderCount} placeholder accounts found in production`,
          { placeholderCount, network }
        );
      } else if (placeholderCount === 0) {
        this.addResult(
          'Production Readiness: Real Accounts',
          true,
          'All accounts are real VRF accounts (no placeholders)',
          { network }
        );
      } else {
        this.addResult(
          'Production Readiness: Real Accounts',
          true,
          `${placeholderCount} placeholder accounts acceptable for ${network}`,
          { placeholderCount, network }
        );
      }

    } catch (error) {
      this.addResult(
        'Production Readiness',
        false,
        `Failed to assess production readiness: ${error}`,
        { error: String(error) }
      );
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REAL VRF ACCOUNT SETUP TEST RESULTS');
    console.log('='.repeat(60) + '\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    // Overall status
    const allPassed = failed === 0;
    const status = allPassed ? '✅ ALL TESTS PASSED' : `❌ ${failed} TEST(S) FAILED`;
    
    console.log(`${status} (${passed}/${total} passed)\n`);

    // Detailed results
    for (const result of this.results) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
      console.log(`   ${result.message}`);
      
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   '));
      }
      console.log('');
    }

    // Summary and recommendations
    console.log('💡 NEXT STEPS:\n');
    
    if (allPassed) {
      console.log('   🎉 Your VRF configuration is ready for production!');
      console.log('   • All VRF accounts are properly configured with real addresses');
      console.log('   • Oracle connectivity is working');
      console.log('   • Configuration validation passed');
      console.log('   • Ready to test actual coin flip games with real VRF');
    } else {
      console.log('   🔧 Fix the following issues to complete VRF setup:');
      
      const failedTests = this.results.filter(r => !r.passed);
      for (const test of failedTests) {
        console.log(`   • ${test.test}: ${test.message}`);
      }
      
      console.log('\n   📖 For help creating real VRF accounts:');
      console.log('   • Follow: scripts/create-vrf-accounts.md');
      console.log('   • Update: .env.staging with real VRF account addresses');
      console.log('   • Run: npm run validate-vrf-config after fixes');
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  }

  async runAllTests() {
    console.log('🎲 Starting Real VRF Account Setup Tests\n');
    console.log(`Network: ${process.env.REACT_APP_NETWORK || 'devnet'}`);
    console.log(`RPC URL: ${this.connection.rpcEndpoint}\n`);

    await this.testEnvironmentConfiguration();
    await this.testVRFAccountConnectivity();
    await this.testSwitchboardOracleQueue();
    await this.testVRFConfiguration();
    await this.testProductionReadiness();

    this.printResults();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RealVRFAccountTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { RealVRFAccountTester };