#!/usr/bin/env ts-node
/**
 * Enhanced Pre-Deployment Check with VRF Validation
 * 
 * This enhanced version includes comprehensive VRF configuration validation
 * and production-specific checks for the Solana Coin Flipper.
 * 
 * Usage:
 * npm run deploy:verify:enhanced
 * ts-node scripts/enhanced-deploy-check.ts [devnet|mainnet-beta]
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { validateVRFConfiguration, VRFValidationResult } from './validate-vrf-config';
import { loadVRFAccountsFromEnv, loadVRFThresholdsFromEnv, validateVRFConfig } from '../src/config/vrfConfig';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: string;
}

interface DeploymentReadiness {
  isReady: boolean;
  criticalIssues: number;
  warnings: number;
  blockers: string[];
  recommendations: string[];
}

class EnhancedDeploymentChecker {
  private results: CheckResult[] = [];
  private cluster: string;
  private connection: Connection;
  private isProduction: boolean;

  constructor(cluster: string = 'devnet') {
    this.cluster = cluster;
    this.isProduction = cluster === 'mainnet-beta';
    
    const clusterUrl = this.getClusterUrl(cluster);
    this.connection = new Connection(clusterUrl, 'confirmed');
  }

  private getClusterUrl(cluster: string): string {
    switch (cluster) {
      case 'localnet':
        return 'http://localhost:8899';
      case 'devnet':
        return process.env.REACT_APP_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
      case 'mainnet-beta':
        return process.env.REACT_APP_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
      default:
        throw new Error(`Unsupported cluster: ${cluster}`);
    }
  }

  private addResult(category: string, name: string, status: CheckResult['status'], message: string, details?: string) {
    this.results.push({ category, name, status, message, details });
  }

  /**
   * Check development environment and tooling
   */
  async checkEnvironment(): Promise<void> {
    console.log('🔧 Checking development environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (major >= 16) {
      this.addResult('Environment', 'Node.js Version', 'pass', `Node.js ${nodeVersion} (compatible)`);
    } else {
      this.addResult('Environment', 'Node.js Version', 'fail', `Node.js ${nodeVersion} (requires 16+)`);
    }

    // Check package.json dependencies
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check critical dependencies
      const criticalDeps = [
        '@coral-xyz/anchor',
        '@solana/web3.js',
        '@switchboard-xyz/solana.js',
      ];
      
      criticalDeps.forEach(dep => {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          this.addResult('Environment', `Dependency: ${dep}`, 'pass', 'Installed');
        } else {
          this.addResult('Environment', `Dependency: ${dep}`, 'fail', 'Missing required dependency');
        }
      });
    }

    // Check environment variables
    const requiredEnvVars = [
      'REACT_APP_PROGRAM_ID',
      'REACT_APP_HOUSE_FEE_BPS',
      'REACT_APP_MIN_BET_SOL',
    ];

    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        this.addResult('Environment', `Env: ${envVar}`, 'pass', `Set to: ${process.env[envVar]}`);
      } else {
        this.addResult('Environment', `Env: ${envVar}`, 'warning', 'Not set in environment');
      }
    });
  }

  /**
   * Comprehensive VRF configuration validation
   */
  async checkVRFConfiguration(): Promise<void> {
    console.log('🎲 Validating VRF configuration...');

    try {
      // Run basic VRF config validation
      const basicValidation = validateVRFConfig();
      
      if (basicValidation.isValid) {
        this.addResult('VRF Config', 'Basic Validation', 'pass', 'VRF configuration structure is valid');
      } else {
        const status = this.isProduction ? 'fail' : 'warning';
        this.addResult('VRF Config', 'Basic Validation', status, `${basicValidation.errors.length} configuration errors`);
        
        basicValidation.errors.forEach((error, index) => {
          this.addResult('VRF Config', `Error ${index + 1}`, status, error);
        });
      }

      // Add warnings and recommendations
      basicValidation.warnings.forEach((warning, index) => {
        this.addResult('VRF Config', `Warning ${index + 1}`, 'warning', warning);
      });

      if (basicValidation.recommendations) {
        basicValidation.recommendations.forEach((rec, index) => {
          this.addResult('VRF Config', `Recommendation ${index + 1}`, 'info', rec);
        });
      }

      // Run full VRF validation including connectivity
      console.log('   Testing VRF account connectivity...');
      const fullValidation = await validateVRFConfiguration();
      
      if (fullValidation.isValid) {
        this.addResult('VRF Connectivity', 'Overall Status', 'pass', `All ${fullValidation.accountStatuses.length} VRF accounts validated`);
      } else {
        const status = this.isProduction ? 'fail' : 'warning';
        this.addResult('VRF Connectivity', 'Overall Status', status, `${fullValidation.errors.length} connectivity issues`);
      }

      // Check individual account statuses
      fullValidation.accountStatuses.forEach(account => {
        const accountStatus = account.isValid && account.isReachable ? 'pass' : 
                            account.error ? 'fail' : 'warning';
        
        let message = `${account.isReachable ? 'Reachable' : 'Not reachable'}`;
        if (account.queueDepth !== undefined) {
          message += ` (Queue: ${account.queueDepth})`;
        }
        if (account.error) {
          message += ` - ${account.error}`;
        }

        this.addResult('VRF Accounts', account.name, accountStatus, message, account.publicKey);
      });

      // Production-specific VRF checks
      if (this.isProduction) {
        this.checkProductionVRFReadiness(fullValidation);
      }

    } catch (error) {
      this.addResult('VRF Config', 'Validation Failed', 'fail', `VRF validation crashed: ${error}`);
    }
  }

  /**
   * Production-specific VRF readiness checks
   */
  private checkProductionVRFReadiness(validation: VRFValidationResult): void {
    console.log('   Checking production VRF readiness...');

    const reachableAccounts = validation.accountStatuses.filter(acc => acc.isReachable);
    const totalAccounts = validation.accountStatuses.length;

    // Check minimum account requirements
    if (totalAccounts < 3) {
      this.addResult('Production VRF', 'Account Count', 'fail', 
        `Insufficient VRF accounts for production (${totalAccounts}/3 minimum)`);
    } else {
      this.addResult('Production VRF', 'Account Count', 'pass', 
        `${totalAccounts} VRF accounts configured (meets minimum)`);
    }

    // Check reachability
    if (reachableAccounts.length < 2) {
      this.addResult('Production VRF', 'Account Reachability', 'fail', 
        `Insufficient reachable accounts (${reachableAccounts.length}/2 minimum)`);
    } else {
      this.addResult('Production VRF', 'Account Reachability', 'pass', 
        `${reachableAccounts.length}/${totalAccounts} accounts reachable`);
    }

    // Check for placeholder accounts
    const placeholderAccounts = validation.accountStatuses.filter(acc => 
      acc.publicKey.includes('111111111111111111111111111')
    );

    if (placeholderAccounts.length > 0) {
      this.addResult('Production VRF', 'Account Authenticity', 'fail', 
        `${placeholderAccounts.length} placeholder accounts detected - replace with real Switchboard VRF accounts`);
    } else {
      this.addResult('Production VRF', 'Account Authenticity', 'pass', 
        'All accounts appear to be real Switchboard VRF accounts');
    }

    // Check health thresholds
    const thresholds = loadVRFThresholdsFromEnv();
    const productionRecommended = {
      maxQueueDepth: 10,
      maxResponseTime: 8000,
      minSuccessRate: 0.95,
    };

    if (thresholds.maxQueueDepth <= productionRecommended.maxQueueDepth &&
        thresholds.maxResponseTime <= productionRecommended.maxResponseTime &&
        thresholds.minSuccessRate >= productionRecommended.minSuccessRate) {
      this.addResult('Production VRF', 'Health Thresholds', 'pass', 
        'VRF health thresholds meet production standards');
    } else {
      this.addResult('Production VRF', 'Health Thresholds', 'warning', 
        'VRF health thresholds may be too lenient for production', 
        `Current: Queue≤${thresholds.maxQueueDepth}, Response≤${thresholds.maxResponseTime}ms, Success≥${thresholds.minSuccessRate}`);
    }
  }

  /**
   * Check smart contract configuration
   */
  async checkSmartContract(): Promise<void> {
    console.log('📜 Checking smart contract configuration...');

    // Check if program ID is set
    const programId = process.env.REACT_APP_PROGRAM_ID;
    if (programId) {
      try {
        const pubkey = new PublicKey(programId);
        this.addResult('Smart Contract', 'Program ID', 'pass', `Valid program ID: ${programId}`);

        // Check if program is deployed
        const accountInfo = await this.connection.getAccountInfo(pubkey);
        if (accountInfo) {
          this.addResult('Smart Contract', 'Deployment Status', 'pass', 'Program is deployed on blockchain');
        } else {
          this.addResult('Smart Contract', 'Deployment Status', 'warning', 'Program not found on blockchain');
        }
      } catch (error) {
        this.addResult('Smart Contract', 'Program ID', 'fail', `Invalid program ID format: ${programId}`);
      }
    } else {
      this.addResult('Smart Contract', 'Program ID', 'fail', 'REACT_APP_PROGRAM_ID not set');
    }

    // Check house fee configuration
    const houseFee = process.env.REACT_APP_HOUSE_FEE_BPS;
    if (houseFee) {
      const feeBps = parseInt(houseFee);
      if (feeBps >= 0 && feeBps <= 1000) { // Max 10%
        this.addResult('Smart Contract', 'House Fee', 'pass', `House fee: ${feeBps} basis points (${feeBps/100}%)`);
      } else {
        this.addResult('Smart Contract', 'House Fee', 'fail', `Invalid house fee: ${feeBps} (must be 0-1000 basis points)`);
      }
    } else {
      this.addResult('Smart Contract', 'House Fee', 'warning', 'House fee not configured');
    }

    // Check minimum bet
    const minBet = process.env.REACT_APP_MIN_BET_SOL;
    if (minBet) {
      const minBetValue = parseFloat(minBet);
      if (minBetValue > 0 && minBetValue <= 10) {
        this.addResult('Smart Contract', 'Minimum Bet', 'pass', `Minimum bet: ${minBet} SOL`);
      } else {
        this.addResult('Smart Contract', 'Minimum Bet', 'warning', `Unusual minimum bet: ${minBet} SOL`);
      }
    }
  }

  /**
   * Check network connectivity and health
   */
  async checkNetwork(): Promise<void> {
    console.log('🌐 Checking network connectivity...');

    try {
      // Test RPC connection
      const version = await this.connection.getVersion();
      this.addResult('Network', 'RPC Connection', 'pass', 
        `Connected to Solana ${version['solana-core']} (${this.cluster})`);

      // Test basic network functionality by getting slot
      const currentSlot = await this.connection.getSlot();
      if (currentSlot > 0) {
        this.addResult('Network', 'Network Health', 'pass', `Current slot: ${currentSlot}`);
      } else {
        this.addResult('Network', 'Network Health', 'warning', 'Unable to get current slot');
      }

      // Test transaction fees
      const recentBlockhash = await this.connection.getLatestBlockhash();
      this.addResult('Network', 'Blockhash', 'pass', 
        `Recent blockhash: ${recentBlockhash.blockhash.slice(0, 8)}...`);

    } catch (error) {
      this.addResult('Network', 'RPC Connection', 'fail', `Failed to connect: ${error}`);
    }
  }

  /**
   * Security and production readiness checks
   */
  async checkProductionReadiness(): Promise<void> {
    if (!this.isProduction) return;

    console.log('🔒 Checking production security and readiness...');

    // Check for development artifacts
    const devIndicators = [
      { file: '.env.local', message: 'Development environment file present' },
      { file: '.env.development', message: 'Development environment file present' },
      { file: 'debug.log', message: 'Debug log file present' },
    ];

    devIndicators.forEach(indicator => {
      if (fs.existsSync(indicator.file)) {
        this.addResult('Production Security', indicator.file, 'warning', indicator.message);
      }
    });

    // Check environment configuration
    const network = process.env.REACT_APP_NETWORK;
    if (network === 'mainnet-beta') {
      this.addResult('Production Config', 'Network Setting', 'pass', 'Configured for mainnet');
    } else {
      this.addResult('Production Config', 'Network Setting', 'fail', 
        `Network set to '${network}' but deploying to mainnet`);
    }

    // Check for secure RPC endpoints
    const rpcUrl = process.env.REACT_APP_MAINNET_RPC_URL;
    if (rpcUrl && rpcUrl !== 'https://api.mainnet-beta.solana.com') {
      this.addResult('Production Config', 'RPC Endpoint', 'pass', 'Using custom RPC endpoint');
    } else {
      this.addResult('Production Config', 'RPC Endpoint', 'warning', 
        'Using public RPC endpoint - consider dedicated provider for production');
    }
  }

  /**
   * Generate deployment readiness assessment
   */
  private assessReadiness(): DeploymentReadiness {
    const failed = this.results.filter(r => r.status === 'fail');
    const warnings = this.results.filter(r => r.status === 'warning');
    
    const blockers = failed.map(r => `${r.category}: ${r.name} - ${r.message}`);
    
    const recommendations: string[] = [];
    
    if (warnings.length > 0) {
      recommendations.push(`Address ${warnings.length} warnings before production deployment`);
    }
    
    if (this.isProduction && failed.length === 0) {
      recommendations.push('Run load testing before going live');
      recommendations.push('Set up monitoring and alerting');
      recommendations.push('Prepare incident response procedures');
      recommendations.push('Consider security audit for mainnet deployment');
    }

    return {
      isReady: failed.length === 0,
      criticalIssues: failed.length,
      warnings: warnings.length,
      blockers,
      recommendations,
    };
  }

  /**
   * Display results in organized format
   */
  private displayResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 ENHANCED DEPLOYMENT READINESS REPORT (${this.cluster.toUpperCase()})`);
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
        
        console.log(`   ${icon} ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`      Details: ${result.details}`);
        }
      });
    });

    // Assessment summary
    const assessment = this.assessReadiness();
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 READINESS ASSESSMENT');
    console.log('='.repeat(80));
    
    if (assessment.isReady) {
      console.log('\n🎉 DEPLOYMENT READY!');
      console.log(`✅ All critical checks passed`);
      
      if (assessment.warnings > 0) {
        console.log(`⚠️  ${assessment.warnings} warnings to consider`);
      }
      
      if (this.isProduction) {
        console.log('\n🚨 MAINNET DEPLOYMENT CHECKLIST:');
        console.log('   • Smart contract has been audited');
        console.log('   • Load testing completed successfully');
        console.log('   • Monitoring and alerts are configured');
        console.log('   • Emergency procedures are documented');
        console.log('   • Team is prepared for launch');
        
        console.log('\n🚀 To deploy to mainnet:');
        console.log('   npm run deploy:mainnet');
        console.log('\n⚠️  WARNING: This will deploy to MAINNET with real SOL!');
      } else {
        console.log(`\n🚀 Ready for ${this.cluster} deployment:`);
        console.log(`   npm run deploy:${this.cluster === 'devnet' ? 'devnet' : 'mainnet'}`);
      }
      
    } else {
      console.log('\n🛑 DEPLOYMENT BLOCKED');
      console.log(`❌ ${assessment.criticalIssues} critical issues must be resolved`);
      
      console.log('\n🔧 BLOCKERS TO RESOLVE:');
      assessment.blockers.forEach(blocker => {
        console.log(`   • ${blocker}`);
      });
      
      if (this.isProduction) {
        console.log('\n🚨 CRITICAL: Mainnet deployment requires all issues to be resolved');
      }
    }
    
    if (assessment.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      assessment.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Run all enhanced deployment checks
   */
  async runAllChecks(): Promise<boolean> {
    console.log(`\n🚀 Enhanced Deployment Check for ${this.cluster.toUpperCase()}\n`);
    
    try {
      await this.checkEnvironment();
      await this.checkNetwork();
      await this.checkSmartContract();
      await this.checkVRFConfiguration();
      await this.checkProductionReadiness();
      
      this.displayResults();
      
      const assessment = this.assessReadiness();
      return assessment.isReady;
      
    } catch (error) {
      console.error('\n❌ Deployment check failed:', error);
      return false;
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const cluster = process.argv[2] || process.env.REACT_APP_NETWORK || 'devnet';
  
  if (!['devnet', 'mainnet-beta', 'localnet'].includes(cluster)) {
    console.error('❌ Invalid cluster. Use: devnet, mainnet-beta, or localnet');
    process.exit(1);
  }
  
  const checker = new EnhancedDeploymentChecker(cluster);
  const isReady = await checker.runAllChecks();
  
  process.exit(isReady ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Enhanced deployment check crashed:', error);
    process.exit(1);
  });
}

export { EnhancedDeploymentChecker };