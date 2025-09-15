const anchor = require('@coral-xyz/anchor');
const { SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Load the IDL
const idlPath = path.join(__dirname, '../target/idl/coin_flipper.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

async function initializeProgram() {
  try {
    // Configure the client to use devnet
    const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Load wallet
    const wallet = anchor.AnchorProvider.env().wallet;
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    // Load the program
    const programId = new anchor.web3.PublicKey('4pV1nUjCdfTdxFVN2RckwJ763XZJAnGukVrHxs25f7mM');
    const program = new anchor.Program(idl, programId, provider);

    console.log('🚀 Initializing Coin Flipper program...');
    console.log('Program ID:', programId.toString());
    console.log('House Wallet:', wallet.publicKey.toString());

    // Derive the global state PDA
    const [globalState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      programId
    );

    // Check if already initialized
    try {
      const existingState = await program.account.globalState.fetch(globalState);
      console.log('✅ Program already initialized!');
      console.log('Current house wallet:', existingState.houseWallet.toString());
      console.log('House fee percentage:', existingState.houseFeePercentage);
      return;
    } catch (error) {
      console.log('🔧 Program not yet initialized, proceeding...');
    }

    // Initialize the program
    const tx = await program.methods
      .initialize(300) // 3% house fee (300 basis points)
      .accounts({
        globalState: globalState,
        houseWallet: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Program initialized successfully!');
    console.log('Transaction signature:', tx);
    console.log('Global state account:', globalState.toString());
    console.log('House wallet set to:', wallet.publicKey.toString());
    console.log('House fee percentage: 3%');

  } catch (error) {
    console.error('❌ Error initializing program:', error);
    
    // More detailed error logging
    if (error.logs) {
      console.log('Program logs:');
      error.logs.forEach(log => console.log('  ', log));
    }
  }
}

// Run the initialization
initializeProgram().catch(console.error);
