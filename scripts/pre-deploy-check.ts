import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from 'fs';
import path from 'path';

/**
 * Pre-deployment verification script
 * Checks all requirements before deploying the smart contract
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class PreDeploymentChecker {
  private results: CheckResult[] = [];
  private cluster: string;
  private connection: Connection;

  constructor(cluster: string = 'devnet') {
    this.cluster = cluster;
    
    const clusterUrl = this.getClusterUrl(cluster);
    this.connection = new Connection(clusterUrl, 'confirmed');
  }

  private getClusterUrl(cluster: string): string {
    switch (cluster) {
      case 'localnet':
        return 'http://localhost:8899';
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      default:
        throw new Error(`Unsupported cluster: ${cluster}`);
    }
  }

  private addResult(name: string, status: CheckResult['status'], message: string) {
    this.results.push({ name, status, message });
  }

  /**
   * Check if Anchor and Solana CLI are installed and configured
   */
  async checkTooling(): Promise<void> {
    console.log('🔧 Checking development tooling...');

    // Check if anchor.toml exists
    const anchorTomlPath = path.join(process.cwd(), 'Anchor.toml');
    if (fs.existsSync(anchorTomlPath)) {
      this.addResult('Anchor Configuration', 'pass', 'Anchor.toml found');
    } else {
      this.addResult('Anchor Configuration', 'fail', 'Anchor.toml not found');
    }

    // Check if program keypair exists
    const programKeypairPath = path.join(process.cwd(), 'target/deploy/coin_flipper-keypair.json');
    if (fs.existsSync(programKeypairPath)) {
      this.addResult('Program Keypair', 'pass', 'Program keypair found');
    } else {
      this.addResult('Program Keypair', 'warning', 'Program keypair will be generated during deployment');
    }

    // Check if IDL directory exists
    const idlPath = path.join(process.cwd(), 'target/idl');
    if (fs.existsSync(idlPath)) {
      this.addResult('IDL Directory', 'pass', 'IDL directory found');
    } else {
      this.addResult('IDL Directory', 'warning', 'IDL directory will be created during build');
    }
  }

  /**
   * Check network connectivity and account funding
   */
  async checkNetwork(): Promise<void> {
    console.log('🌐 Checking network connectivity and funding...');

    try {
      // Test connection
      const slot = await this.connection.getSlot();
      this.addResult('Network Connection', 'pass', `Connected to ${this.cluster} (slot: ${slot})`);

      // Check deployer wallet
      const provider = anchor.AnchorProvider.env();
      const deployerPubkey = provider.wallet.publicKey;
      const deployerBalance = await this.connection.getBalance(deployerPubkey);
      
      const requiredBalance = this.cluster === 'mainnet-beta' ? 2 * LAMPORTS_PER_SOL : 0.5 * LAMPORTS_PER_SOL;
      
      if (deployerBalance >= requiredBalance) {
        this.addResult(
          'Deployer Balance', 
          'pass', 
          `${deployerBalance / LAMPORTS_PER_SOL} SOL available`
        );
      } else {
        const status = this.cluster === 'devnet' ? 'warning' : 'fail';
        this.addResult(
          'Deployer Balance',
          status,
          `Insufficient balance: ${deployerBalance / LAMPORTS_PER_SOL} SOL (need ${requiredBalance / LAMPORTS_PER_SOL} SOL)`
        );
      }

      this.addResult('Deployer Wallet', 'pass', `${deployerPubkey.toString()}`);

    } catch (error) {
      this.addResult('Network Connection', 'fail', `Connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check program configuration and constants
   */
  async checkProgramConfig(): Promise<void> {
    console.log('📋 Checking program configuration...');

    try {
      // Check if lib.rs exists
      const libRsPath = path.join(process.cwd(), 'programs/coin-flipper/src/lib.rs');
      if (!fs.existsSync(libRsPath)) {
        this.addResult('Program Source', 'fail', 'lib.rs not found');
        return;
      }

      const libRsContent = fs.readFileSync(libRsPath, 'utf8');
      
      // Check program ID declaration
      const programIdMatch = libRsContent.match(/declare_id!\("([^"]+)"\)/);
      if (programIdMatch) {
        const programId = programIdMatch[1];
        this.addResult('Program ID', 'pass', `Declared: ${programId}`);
        
        // Verify it's a valid PublicKey
        try {
          new PublicKey(programId);
        } catch (error) {
          this.addResult('Program ID Validation', 'fail', 'Invalid program ID format');
        }
      } else {
        this.addResult('Program ID', 'fail', 'Program ID not found in lib.rs');
      }

      // Check important constants
      const constants = [
        { name: 'HOUSE_FEE_BPS', pattern: /HOUSE_FEE_BPS:\s*u16\s*=\s*(\d+)/ },
        { name: 'MIN_BET_AMOUNT', pattern: /MIN_BET_AMOUNT:\s*u64\s*=\s*(\d+)/ },
      ];

      constants.forEach(({ name, pattern }) => {
        const match = libRsContent.match(pattern);
        if (match) {
          const value = match[1];
          this.addResult(
            name,
            'pass',
            `Set to ${value} ${name === 'HOUSE_FEE_BPS' ? '(basis points)' : '(lamports)'}`
          );
        } else {
          this.addResult(name, 'warning', `Constant not found or format changed`);
        }
      });

      this.addResult('Program Source', 'pass', 'lib.rs found and validated');

    } catch (error) {
      this.addResult('Program Source', 'fail', `Failed to read program source: ${(error as Error).message}`);
    }
  }

  /**
   * Check VRF configuration if VRF features are enabled
   */
  async checkVRFConfig(): Promise<void> {
    console.log('🎲 Checking VRF configuration...');

    try {
      const libRsPath = path.join(process.cwd(), 'programs/coin-flipper/src/lib.rs');
      const libRsContent = fs.readFileSync(libRsPath, 'utf8');

      // Check if VRF features are enabled
      const hasVRFFeature = libRsContent.includes('#[cfg(feature = "vrf-enabled")]');
      
      if (hasVRFFeature) {
        this.addResult('VRF Feature', 'pass', 'VRF features enabled in code');

        // Check environment variables
        const envExamplePath = path.join(process.cwd(), '.env.example');
        if (fs.existsSync(envExamplePath)) {
          const envContent = fs.readFileSync(envExamplePath, 'utf8');
          
          const vrfAccounts = [];
          for (let i = 1; i <= 3; i++) {
            if (envContent.includes(`REACT_APP_VRF_ACCOUNT_${i}_PUBKEY`)) {
              vrfAccounts.push(`Account ${i}`);
            }
          }
          
          if (vrfAccounts.length > 0) {
            this.addResult(
              'VRF Environment Config',
              'pass',
              `VRF accounts configured: ${vrfAccounts.join(', ')}`
            );
          } else {
            this.addResult(
              'VRF Environment Config',
              'warning',
              'VRF accounts not configured in .env.example'
            );
          }
        } else {
          this.addResult('VRF Environment Config', 'warning', '.env.example not found');
        }

        // Check Switchboard dependency
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.dependencies['@switchboard-xyz/solana.js']) {
            this.addResult('Switchboard Dependency', 'pass', 'Switchboard SDK installed');
          } else {
            this.addResult('Switchboard Dependency', 'warning', 'Switchboard SDK not found');
          }
        }

      } else {
        this.addResult('VRF Feature', 'warning', 'VRF features disabled - using pseudo-random fallback');
      }

    } catch (error) {
      this.addResult('VRF Configuration', 'fail', `Failed to check VRF config: ${(error as Error).message}`);
    }
  }

  /**
   * Check if program is already deployed
   */
  async checkExistingDeployment(): Promise<void> {
    console.log('🔍 Checking for existing deployment...');

    try {
      // Read program ID from Anchor.toml or lib.rs
      const anchorTomlPath = path.join(process.cwd(), 'Anchor.toml');
      if (!fs.existsSync(anchorTomlPath)) {
        this.addResult('Existing Deployment', 'warning', 'Cannot check - Anchor.toml not found');
        return;
      }

      const anchorToml = fs.readFileSync(anchorTomlPath, 'utf8');
      const programIdMatch = anchorToml.match(/coin_flipper\s*=\s*"([^"]+)"/);
      
      if (!programIdMatch) {
        this.addResult('Existing Deployment', 'warning', 'Program ID not found in Anchor.toml');
        return;
      }

      const programId = new PublicKey(programIdMatch[1]);
      
      try {
        const accountInfo = await this.connection.getAccountInfo(programId);
        if (accountInfo) {
          this.addResult(
            'Existing Deployment', 
            'warning', 
            `Program already deployed to ${programId.toString()}`
          );
          
          // Check if initialized
          try {
            const [globalStatePda] = await PublicKey.findProgramAddress(
              [Buffer.from('global_state')],
              programId
            );
            
            const globalStateInfo = await this.connection.getAccountInfo(globalStatePda);
            if (globalStateInfo) {
              this.addResult(
                'Program Initialization',
                'warning',
                'Program appears to be already initialized'
              );
            } else {
              this.addResult(
                'Program Initialization',
                'pass',
                'Program deployed but not initialized'
              );
            }
          } catch (error) {
            this.addResult(
              'Program Initialization',
              'pass',
              'Program deployed, initialization status unknown'
            );
          }
        } else {
          this.addResult('Existing Deployment', 'pass', 'Program not yet deployed');
        }
      } catch (error) {
        this.addResult('Existing Deployment', 'pass', 'Program not yet deployed');
      }

    } catch (error) {
      this.addResult('Existing Deployment', 'fail', `Failed to check deployment: ${(error as Error).message}`);
    }
  }

  /**
   * Display all check results
   */
  displayResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRE-DEPLOYMENT CHECK RESULTS');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📈 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n❌ DEPLOYMENT NOT RECOMMENDED');
      console.log('Please fix the failed checks before deploying.');
    } else if (warnings > 0) {
      console.log('\n⚠️  DEPLOYMENT WITH CAUTION');
      console.log('Some warnings detected. Review them before proceeding.');
    } else {
      console.log('\n✅ READY FOR DEPLOYMENT');
      console.log('All checks passed. You can proceed with deployment.');
    }

    console.log('\n🚀 To deploy run:');
    console.log(`npm run deploy:${this.cluster}`);
    
    console.log('='.repeat(80));
  }

  /**
   * Run all checks
   */
  async runAllChecks(): Promise<void> {
    console.log(`🔍 Running pre-deployment checks for ${this.cluster}...\n`);

    await this.checkTooling();
    await this.checkNetwork();
    await this.checkProgramConfig();
    await this.checkVRFConfig();
    await this.checkExistingDeployment();

    this.displayResults();
  }
}

// Main execution
async function main() {
  const cluster = process.argv[2] || process.env.ANCHOR_PROVIDER_CLUSTER || 'devnet';
  const checker = new PreDeploymentChecker(cluster);
  await checker.runAllChecks();
}

if (require.main === module) {
  main().catch(console.error);
}

export default PreDeploymentChecker;