#!/usr/bin/env ts-node
/**
 * VRF Integration Verification Script
 * 
 * This script runs comprehensive tests to verify the VRF system is properly
 * configured and ready for production use.
 * 
 * Usage:
 * npm run verify-vrf-integration
 * ts-node scripts/verify-vrf-integration.ts
 */

import { validateVRFConfiguration } from './validate-vrf-config';
import { validateVRFConfig, loadVRFAccountsFromEnv, loadVRFThresholdsFromEnv } from '../src/config/vrfConfig';
import { VRFAccountManager } from '../src/services/VRFAccountManager';
import { Connection } from '@solana/web3.js';

interface VerificationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: string;
}

class VRFIntegrationVerifier {
  private results: VerificationResult[] = [];
  private network: string;
  private connection: Connection;

  constructor() {
    this.network = process.env.REACT_APP_NETWORK || 'devnet';
    const rpcUrl = this.network === 'mainnet-beta' 
      ? process.env.REACT_APP_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
      : process.env.REACT_APP_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  private addResult(category: string, test: string, status: VerificationResult['status'], message: string, details?: string) {
    this.results.push({ category, test, status, message, details });
  }

  /**
   * Test 1: Configuration Validation
   */
  async testConfiguration(): Promise<void> {
    console.log('🔧 Testing VRF Configuration...');

    try {
      // Basic configuration validation
      const configValidation = validateVRFConfig();
      
      if (configValidation.isValid) {
        this.addResult('Configuration', 'Structure', 'pass', 'VRF configuration is valid');
      } else {
        this.addResult('Configuration', 'Structure', 'fail', 
          `${configValidation.errors.length} configuration errors`);
        
        configValidation.errors.forEach((error, index) => {
          this.addResult('Configuration', `Error ${index + 1}`, 'fail', error);
        });
      }

      // Test environment loading
      try {
        const accounts = loadVRFAccountsFromEnv();
        const thresholds = loadVRFThresholdsFromEnv();
        
        this.addResult('Configuration', 'Environment Loading', 'pass', 
          `Loaded ${accounts.length} accounts and health thresholds`);
          
        // Check for production readiness
        if (this.network === 'mainnet-beta') {
          if (accounts.length >= 3) {
            this.addResult('Configuration', 'Production Account Count', 'pass', 
              `${accounts.length} accounts configured (≥3 required)`);
          } else {
            this.addResult('Configuration', 'Production Account Count', 'fail', 
              `Only ${accounts.length} accounts configured (3+ required for production)`);
          }

          // Check thresholds are production-grade
          if (thresholds.maxQueueDepth <= 10 && 
              thresholds.maxResponseTime <= 8000 && 
              thresholds.minSuccessRate >= 0.95) {
            this.addResult('Configuration', 'Production Thresholds', 'pass', 
              'Health thresholds meet production standards');
          } else {
            this.addResult('Configuration', 'Production Thresholds', 'warning', 
              'Health thresholds may be too lenient for production');
          }
        }
        
      } catch (error) {
        this.addResult('Configuration', 'Environment Loading', 'fail', 
          `Failed to load configuration: ${error}`);
      }

    } catch (error) {
      this.addResult('Configuration', 'Overall', 'fail', 
        `Configuration test failed: ${error}`);
    }
  }

  /**
   * Test 2: Account Manager Functionality
   */
  async testAccountManager(): Promise<void> {
    console.log('⚙️ Testing VRF Account Manager...');

    try {
      const accounts = loadVRFAccountsFromEnv();
      const thresholds = loadVRFThresholdsFromEnv();
      const manager = new VRFAccountManager(accounts, thresholds);

      // Test basic functionality
      const allAccounts = manager.getAllAccounts();
      if (allAccounts.length === accounts.length) {
        this.addResult('Account Manager', 'Initialization', 'pass', 
          `Manager initialized with ${allAccounts.length} accounts`);
      } else {
        this.addResult('Account Manager', 'Initialization', 'fail', 
          'Account manager initialization mismatch');
      }

      // Test account selection
      try {
        const selectedAccount = manager.getNextAccount('health-based');
        this.addResult('Account Manager', 'Account Selection', 'pass', 
          `Selected account: ${selectedAccount.name}`);
      } catch (error) {
        this.addResult('Account Manager', 'Account Selection', 'fail', 
          `Account selection failed: ${error}`);
      }

      // Test health monitoring
      try {
        manager.updateAccountHealth(accounts[0].name, {
          isHealthy: true,
          queueDepth: 5,
          avgResponseTime: 3000,
          successRate: 0.98,
          lastUpdated: Date.now(),
        });

        const health = manager.getAccountHealth(accounts[0].name);
        if (health) {
          this.addResult('Account Manager', 'Health Monitoring', 'pass', 
            `Health tracking working: ${health.successRate} success rate`);
        } else {
          this.addResult('Account Manager', 'Health Monitoring', 'fail', 
            'Health data not stored correctly');
        }
      } catch (error) {
        this.addResult('Account Manager', 'Health Monitoring', 'fail', 
          `Health monitoring failed: ${error}`);
      }

      // Test failover logic
      try {
        // Mark first account as unhealthy
        manager.updateAccountHealth(accounts[0].name, {
          isHealthy: false,
          queueDepth: 25,
          avgResponseTime: 15000,
          successRate: 0.70,
          lastUpdated: Date.now(),
        });

        // Should select a different account
        const backupAccount = manager.getNextAccount('health-based');
        if (backupAccount.name !== accounts[0].name) {
          this.addResult('Account Manager', 'Failover Logic', 'pass', 
            `Failover successful: ${accounts[0].name} → ${backupAccount.name}`);
        } else {
          this.addResult('Account Manager', 'Failover Logic', 'warning', 
            'Failover may not be working correctly');
        }
      } catch (error) {
        this.addResult('Account Manager', 'Failover Logic', 'fail', 
          `Failover test failed: ${error}`);
      }

    } catch (error) {
      this.addResult('Account Manager', 'Overall', 'fail', 
        `Account manager test failed: ${error}`);
    }
  }

  /**
   * Test 3: Network Connectivity
   */
  async testConnectivity(): Promise<void> {
    console.log('🌐 Testing VRF Network Connectivity...');

    try {
      // Run full connectivity validation
      const validation = await validateVRFConfiguration();
      
      if (validation.isValid) {
        this.addResult('Connectivity', 'Overall Status', 'pass', 
          'All VRF accounts validated successfully');
      } else {
        const status = this.network === 'mainnet-beta' ? 'fail' : 'warning';
        this.addResult('Connectivity', 'Overall Status', status, 
          `${validation.errors.length} connectivity issues found`);
      }

      // Check individual account connectivity
      validation.accountStatuses.forEach(account => {
        if (account.isReachable) {
          this.addResult('Connectivity', account.name, 'pass', 
            `Reachable on ${this.network}`, account.publicKey);
        } else {
          const status = account.error ? 'fail' : 'warning';
          this.addResult('Connectivity', account.name, status, 
            account.error || 'Not reachable', account.publicKey);
        }
      });

      // Network performance check
      const startTime = Date.now();
      try {
        await this.connection.getSlot();
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 2000) {
          this.addResult('Connectivity', 'Network Performance', 'pass', 
            `RPC response time: ${responseTime}ms`);
        } else {
          this.addResult('Connectivity', 'Network Performance', 'warning', 
            `Slow RPC response time: ${responseTime}ms`);
        }
      } catch (error) {
        this.addResult('Connectivity', 'Network Performance', 'fail', 
          `RPC connection failed: ${error}`);
      }

    } catch (error) {
      this.addResult('Connectivity', 'Overall', 'fail', 
        `Connectivity test failed: ${error}`);
    }
  }

  /**
   * Test 4: Error Handling
   */
  async testErrorHandling(): Promise<void> {
    console.log('🛡️ Testing VRF Error Handling...');

    try {
      const accounts = loadVRFAccountsFromEnv();
      const thresholds = loadVRFThresholdsFromEnv();
      const manager = new VRFAccountManager(accounts, thresholds);

      // Test error classification
      try {
        const testError = new Error('VRF request timeout');
        const classification = manager.handleAccountFailure(accounts[0].name, testError);
        
        if (classification) {
          this.addResult('Error Handling', 'Error Classification', 'pass', 
            `Error classified as: ${classification.type || 'unknown'}`);
        } else {
          this.addResult('Error Handling', 'Error Classification', 'warning', 
            'Error classification returned undefined');
        }
      } catch (error) {
        this.addResult('Error Handling', 'Error Classification', 'fail', 
          `Error classification failed: ${error}`);
      }

      // Test emergency fallback detection
      try {
        // Mark all accounts as failing
        accounts.forEach(account => {
          manager.updateAccountHealth(account.name, {
            isHealthy: false,
            queueDepth: 25,
            avgResponseTime: 15000,
            successRate: 0.30,
            lastUpdated: Date.now(),
          });
        });

        const requiresEmergency = manager.requiresEmergencyFallback();
        if (requiresEmergency) {
          this.addResult('Error Handling', 'Emergency Detection', 'pass', 
            'Emergency fallback correctly triggered when all accounts fail');
        } else {
          this.addResult('Error Handling', 'Emergency Detection', 'warning', 
            'Emergency fallback not triggered as expected');
        }
      } catch (error) {
        this.addResult('Error Handling', 'Emergency Detection', 'fail', 
          `Emergency detection failed: ${error}`);
      }

      // Test account quarantine
      try {
        const testAccount = accounts[0].name;
        
        // Simulate multiple failures
        for (let i = 0; i < 3; i++) {
          manager.handleAccountFailure(testAccount, new Error('Repeated failure'));
        }

        const statusSummary = manager.getAccountStatusSummary();
        if (statusSummary.quarantined.includes(testAccount)) {
          this.addResult('Error Handling', 'Account Quarantine', 'pass', 
            'Account properly quarantined after repeated failures');
        } else {
          this.addResult('Error Handling', 'Account Quarantine', 'warning', 
            'Account quarantine may not be working');
        }
      } catch (error) {
        this.addResult('Error Handling', 'Account Quarantine', 'fail', 
          `Account quarantine failed: ${error}`);
      }

    } catch (error) {
      this.addResult('Error Handling', 'Overall', 'fail', 
        `Error handling test failed: ${error}`);
    }
  }

  /**
   * Test 5: Production Readiness
   */
  async testProductionReadiness(): Promise<void> {
    if (this.network !== 'mainnet-beta') {
      console.log('⚠️ Skipping production readiness tests (not mainnet)');
      this.addResult('Production', 'Environment', 'info', 
        `Running on ${this.network} - production tests skipped`);
      return;
    }

    console.log('🚀 Testing Production Readiness...');

    try {
      const accounts = loadVRFAccountsFromEnv();
      
      // Check for placeholder accounts
      const placeholderAccounts = accounts.filter(account => 
        account.publicKey.toString().includes('111111111111111111111111111')
      );

      if (placeholderAccounts.length === 0) {
        this.addResult('Production', 'Account Authenticity', 'pass', 
          'No placeholder accounts detected');
      } else {
        this.addResult('Production', 'Account Authenticity', 'fail', 
          `${placeholderAccounts.length} placeholder accounts found - replace with real Switchboard accounts`);
      }

      // Check minimum account requirements
      if (accounts.length >= 3) {
        this.addResult('Production', 'Redundancy', 'pass', 
          `${accounts.length} accounts provide adequate redundancy`);
      } else {
        this.addResult('Production', 'Redundancy', 'fail', 
          `Only ${accounts.length} accounts - production requires minimum 3`);
      }

      // Check environment configuration
      const requiredEnvVars = [
        'REACT_APP_PROGRAM_ID',
        'REACT_APP_HOUSE_FEE_BPS',
        'REACT_APP_VRF_ACCOUNT_1_PUBKEY',
        'REACT_APP_VRF_ACCOUNT_2_PUBKEY',
        'REACT_APP_VRF_ACCOUNT_3_PUBKEY',
      ];

      let missingEnvVars = 0;
      requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
          missingEnvVars++;
        }
      });

      if (missingEnvVars === 0) {
        this.addResult('Production', 'Environment Variables', 'pass', 
          'All required environment variables set');
      } else {
        this.addResult('Production', 'Environment Variables', 'fail', 
          `${missingEnvVars} required environment variables missing`);
      }

      // Check security considerations
      if (process.env.REACT_APP_ENABLE_DEVTOOLS === 'false') {
        this.addResult('Production', 'Security', 'pass', 
          'Development tools disabled for production');
      } else {
        this.addResult('Production', 'Security', 'warning', 
          'Consider disabling development tools for production');
      }

    } catch (error) {
      this.addResult('Production', 'Overall', 'fail', 
        `Production readiness test failed: ${error}`);
    }
  }

  /**
   * Display verification results
   */
  private displayResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 VRF INTEGRATION VERIFICATION REPORT (${this.network.toUpperCase()})`);
    console.log('='.repeat(80));

    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n📂 ${category.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      const categoryResults = this.results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const icon = {
          pass: '✅',
          fail: '❌',
          warning: '⚠️',
          info: '💡',
        }[result.status];
        
        console.log(`   ${icon} ${result.test}: ${result.message}`);
        if (result.details) {
          console.log(`      └─ ${result.details}`);
        }
      });
    });

    // Summary
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(80));
    console.log('📈 VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}/${total} (${Math.round(failed/total*100)}%)`);
    }
    if (warnings > 0) {
      console.log(`⚠️  Warnings: ${warnings}/${total} (${Math.round(warnings/total*100)}%)`);
    }

    // Overall assessment
    if (failed === 0) {
      console.log('\n🎉 VRF INTEGRATION VERIFICATION PASSED');
      
      if (this.network === 'mainnet-beta') {
        console.log('\n🚀 PRODUCTION READINESS ASSESSMENT:');
        if (warnings === 0) {
          console.log('   ✅ System is ready for production deployment');
        } else {
          console.log('   ⚠️  System is mostly ready - address warnings for optimal production performance');
        }
      } else {
        console.log(`\n✅ ${this.network.toUpperCase()} INTEGRATION VERIFIED`);
        console.log('   Ready for testing and development use');
      }
    } else {
      console.log('\n❌ VRF INTEGRATION VERIFICATION FAILED');
      console.log(`   ${failed} critical issues must be resolved before deployment`);
      
      if (this.network === 'mainnet-beta') {
        console.log('\n🚨 PRODUCTION DEPLOYMENT BLOCKED');
      }
    }

    console.log('\n💡 NEXT STEPS:');
    if (failed > 0) {
      console.log('   1. Address all failed tests above');
      console.log('   2. Re-run verification: npm run verify-vrf-integration');
    }
    if (warnings > 0) {
      console.log('   1. Review and address warnings for optimal performance');
    }
    if (failed === 0) {
      if (this.network === 'mainnet-beta') {
        console.log('   1. Proceed with production deployment');
        console.log('   2. Monitor VRF performance closely after launch');
        console.log('   3. Have incident response procedures ready');
      } else {
        console.log('   1. Continue with development and testing');
        console.log('   2. Run production verification before mainnet deployment');
      }
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Run all verification tests
   */
  async runVerification(): Promise<boolean> {
    console.log(`\n🔍 VRF Integration Verification for ${this.network.toUpperCase()}\n`);
    
    try {
      await this.testConfiguration();
      await this.testAccountManager();
      await this.testConnectivity();
      await this.testErrorHandling();
      await this.testProductionReadiness();
      
      this.displayResults();
      
      // Return true if no critical failures
      const criticalFailures = this.results.filter(r => r.status === 'fail').length;
      return criticalFailures === 0;
      
    } catch (error) {
      console.error('\n❌ Verification failed with error:', error);
      return false;
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const verifier = new VRFIntegrationVerifier();
  const success = await verifier.runVerification();
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ VRF integration verification crashed:', error);
    process.exit(1);
  });
}

export { VRFIntegrationVerifier };