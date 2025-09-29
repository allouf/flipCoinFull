import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlipper } from "../target/types/coin_flipper";
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from 'fs';
import path from 'path';

/**
 * Smart Contract Deployment Script
 * 
 * This script handles the complete deployment and initialization of the Coin Flipper smart contract:
 * 1. Deploys the program to the specified network
 * 2. Creates and initializes the global state
 * 3. Sets up the house wallet for fee collection
 * 4. Configures all necessary parameters
 */

interface DeploymentConfig {
  cluster: 'localnet' | 'devnet' | 'mainnet-beta';
  houseFeeBps: number; // 300 = 3%
  houseWalletPath?: string; // Path to house wallet keypair file
  useExistingHouseWallet?: boolean; // Use existing wallet instead of generating new
  houseWalletPublicKey?: string; // Public key of existing house wallet
}

class CoinFlipperDeployment {
  private connection: Connection;
  private program: Program<CoinFlipper>;
  private provider: anchor.AnchorProvider;
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
    
    // Set up connection based on cluster
    const clusterUrl = this.getClusterUrl(config.cluster);
    this.connection = new Connection(clusterUrl, 'confirmed');
    
    // Set up provider and program
    const wallet = anchor.AnchorProvider.env().wallet;
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });
    anchor.setProvider(this.provider);
    
    this.program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
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

  /**
   * Get or create house wallet for fee collection
   */
  private async getHouseWallet(): Promise<{ publicKey: PublicKey; keypair?: Keypair }> {
    // Option 1: Use existing wallet by public key (no private key needed)
    if (this.config.useExistingHouseWallet && this.config.houseWalletPublicKey) {
      try {
        const publicKey = new PublicKey(this.config.houseWalletPublicKey);
        console.log(`💼 Using existing house wallet: ${publicKey.toString()}`);
        console.log(`   Note: This wallet will receive fees from games`);
        return { publicKey };
      } catch (error) {
        throw new Error(`Invalid house wallet public key: ${this.config.houseWalletPublicKey}`);
      }
    }

    const houseWalletPath = this.config.houseWalletPath || 'house-wallet.json';
    
    // Option 2: Load existing wallet from file
    try {
      if (fs.existsSync(houseWalletPath)) {
        console.log(`📁 Loading existing house wallet from ${houseWalletPath}`);
        const keypairData = JSON.parse(fs.readFileSync(houseWalletPath, 'utf8'));
        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
        console.log(`🏠 House wallet loaded: ${keypair.publicKey.toString()}`);
        return { publicKey: keypair.publicKey, keypair };
      }
    } catch (error: any) {
      console.log(`⚠️  Could not load house wallet: ${error.message}`);
    }

    // Option 3: Generate new house wallet (only if not using existing)
    if (!this.config.useExistingHouseWallet) {
      console.log(`🔑 Generating new house wallet...`);
      const houseWallet = Keypair.generate();
      
      // Save to file for future use
      fs.writeFileSync(
        houseWalletPath, 
        JSON.stringify(Array.from(houseWallet.secretKey)),
        'utf8'
      );
      
      console.log(`💾 House wallet saved to ${houseWalletPath}`);
      console.log(`🏠 House wallet address: ${houseWallet.publicKey.toString()}`);
      console.log(`⚠️  IMPORTANT: Back up house-wallet.json securely!`);
      
      return { publicKey: houseWallet.publicKey, keypair: houseWallet };
    }

    throw new Error('No house wallet configured. Provide either useExistingHouseWallet with houseWalletPublicKey, or allow generation of new wallet.');
  }

  /**
   * Fund account if on devnet and balance is low
   */
  private async ensureFunding(publicKey: PublicKey, minBalance: number = 0.1): Promise<void> {
    if (this.config.cluster !== 'devnet') return;

    const balance = await this.connection.getBalance(publicKey);
    const minBalanceLamports = minBalance * LAMPORTS_PER_SOL;

    if (balance < minBalanceLamports) {
      console.log(`💰 Requesting airdrop for ${publicKey.toString()}`);
      try {
        const signature = await this.connection.requestAirdrop(
          publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await this.connection.confirmTransaction(signature, 'confirmed');
        console.log(`✅ Airdrop completed: ${signature}`);
      } catch (error: any) {
        console.warn(`⚠️  Airdrop failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if program is already initialized
   */
  private async isProgramInitialized(): Promise<boolean> {
    try {
      const [globalStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from('global_state')],
        this.program.programId
      );

      const globalState = await this.program.account.globalState.fetch(globalStatePda);
      return !!globalState;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize the program with global state and house wallet
   */
  async initialize(): Promise<void> {
    console.log('\n🚀 Starting Coin Flipper Program Initialization');
    console.log('=' .repeat(60));
    
    // Check if already initialized
    if (await this.isProgramInitialized()) {
      console.log('⚠️  Program is already initialized!');
      console.log('   Use a different program or update existing configuration.');
      return;
    }

    // Get program info
    console.log(`📋 Program ID: ${this.program.programId.toString()}`);
    console.log(`🌐 Network: ${this.config.cluster}`);
    console.log(`💵 House Fee: ${this.config.houseFeeBps / 100}%`);

    // Validate house fee
    if (this.config.houseFeeBps > 1000) {
      throw new Error('House fee cannot exceed 10% (1000 basis points)');
    }

    // Get authority (deployer) wallet
    const authority = this.provider.wallet.publicKey;
    console.log(`👤 Authority: ${authority.toString()}`);

    // Get house wallet
    const houseWalletInfo = await this.getHouseWallet();
    
    // Ensure accounts are funded on devnet
    await this.ensureFunding(authority, 1.0);
    
    // Only try to fund house wallet if we have the keypair (not using existing)
    if (houseWalletInfo.keypair) {
      await this.ensureFunding(houseWalletInfo.publicKey, 0.1);
    }

    // Derive global state PDA
    const [globalStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from('global_state')],
      this.program.programId
    );
    console.log(`🏛️  Global State PDA: ${globalStatePda.toString()}`);

    try {
      console.log('\n⏳ Submitting initialization transaction...');
      
      const tx = await this.program.methods
        .initialize(this.config.houseFeeBps)
        .accounts({
          globalState: globalStatePda,
          authority: authority,
          houseWallet: houseWalletInfo.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Initialization successful!`);
      console.log(`📄 Transaction: ${tx}`);

      // Verify initialization
      await this.verifyInitialization(globalStatePda, authority, houseWalletInfo.publicKey);

    } catch (error) {
      console.error('❌ Initialization failed:');
      console.error(error);
      throw error;
    }
  }

  /**
   * Verify that initialization was successful
   */
  private async verifyInitialization(
    globalStatePda: PublicKey,
    authority: PublicKey,
    houseWallet: PublicKey
  ): Promise<void> {
    console.log('\n🔍 Verifying initialization...');

    try {
      const globalState = await this.program.account.globalState.fetch(globalStatePda);

      console.log('✅ Global state verification:');
      console.log(`   Authority: ${globalState.authority.toString()}`);
      console.log(`   House Wallet: ${globalState.houseWallet.toString()}`);
      console.log(`   House Fee: ${globalState.houseFeeBps / 100}%`);
      console.log(`   Total Games: ${globalState.totalGames.toString()}`);
      console.log(`   Total Volume: ${globalState.totalVolume.toString()}`);
      console.log(`   Is Paused: ${globalState.isPaused}`);

      // Verify values match expected
      if (!globalState.authority.equals(authority)) {
        throw new Error('Authority mismatch in global state');
      }
      if (!globalState.houseWallet.equals(houseWallet)) {
        throw new Error('House wallet mismatch in global state');
      }
      if (globalState.houseFeeBps !== this.config.houseFeeBps) {
        throw new Error('House fee mismatch in global state');
      }

      console.log('✅ All verifications passed!');

    } catch (error) {
      console.error('❌ Verification failed:');
      throw error;
    }
  }

  /**
   * Display post-deployment instructions
   */
  displayPostDeploymentInstructions(): void {
    console.log('\n🎉 Deployment Complete!');
    console.log('=' .repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Update frontend configuration with new program ID');
    console.log(`   Program ID: ${this.program.programId.toString()}`);
    console.log('2. Update .env file with program configuration');
    console.log('3. Test the deployment with sample transactions');
    console.log('4. Set up monitoring for the house wallet');
    console.log('5. Configure VRF accounts if using Switchboard');
    
    console.log('\n🔧 Configuration for frontend:');
    console.log(`REACT_APP_PROGRAM_ID=${this.program.programId.toString()}`);
    console.log(`REACT_APP_HOUSE_FEE_BPS=${this.config.houseFeeBps}`);
    console.log(`REACT_APP_MIN_BET_SOL=0.01`);
    
    console.log('\n⚠️  Important Security Notes:');
    console.log('- Keep house-wallet.json secure and backed up');
    console.log('- Consider using a multisig for mainnet deployments');
    console.log('- Monitor house wallet for fee collection');
    console.log('- Set up alerts for unusual program activity');
  }

  /**
   * Run complete deployment process
   */
  async deploy(): Promise<void> {
    try {
      await this.initialize();
      this.displayPostDeploymentInstructions();
    } catch (error) {
      console.error('\n💥 Deployment failed!');
      console.error(error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const useExistingWallet = args.includes('--use-existing-wallet');
  const walletIndex = args.indexOf('--house-wallet');
  const houseWalletPublicKey = walletIndex !== -1 ? args[walletIndex + 1] : undefined;

  const config: DeploymentConfig = {
    cluster: (process.env.ANCHOR_PROVIDER_CLUSTER as any) || 'devnet',
    houseFeeBps: 300, // 3% house fee
    houseWalletPath: 'house-wallet.json',
    useExistingHouseWallet: useExistingWallet || !!houseWalletPublicKey,
    houseWalletPublicKey: houseWalletPublicKey,
  };

  console.log('🎯 Coin Flipper Smart Contract Deployment');
  console.log(`🌐 Target Network: ${config.cluster}`);
  
  if (config.useExistingHouseWallet && config.houseWalletPublicKey) {
    console.log(`💼 Using existing house wallet: ${config.houseWalletPublicKey}`);
  } else if (!config.useExistingHouseWallet) {
    console.log(`🔑 Will generate new house wallet`);
  }
  
  const deployment = new CoinFlipperDeployment(config);
  await deployment.deploy();
}

// Show usage if --help is provided
if (process.argv.includes('--help')) {
  console.log(`
Usage: ts-node scripts/deploy.ts [options]

Options:
  --use-existing-wallet          Use an existing wallet for fee collection
  --house-wallet <public-key>    Specify the public key of existing house wallet
  --help                         Show this help message

Examples:
  # Generate new house wallet (default)
  ts-node scripts/deploy.ts

  # Use existing wallet by public key
  ts-node scripts/deploy.ts --house-wallet YOUR_WALLET_PUBLIC_KEY

  # Use existing wallet from house-wallet.json file
  ts-node scripts/deploy.ts --use-existing-wallet
  `);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Deployment script failed:', error);
    process.exit(1);
  });
}

export default CoinFlipperDeployment;