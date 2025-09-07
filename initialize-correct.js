const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require('fs');
const os = require('os');

async function initialize() {
  console.log('🚀 Solana Coin Flipper Initialization');
  
  // Configure connection
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet from codespace
  let wallet;
  try {
    const keyPath = os.homedir() + '/.config/solana/id.json';
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    wallet = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    console.log('✅ Wallet loaded:', wallet.publicKey.toString());
  } catch (err) {
    console.error('❌ Failed to load wallet:', err.message);
    process.exit(1);
  }
  
  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Wallet balance:', balance / 1e9, 'SOL');
  
  if (balance < 0.01 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.01 SOL');
    process.exit(1);
  }
  
  // Create provider
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  
  // CORRECT Program ID from your deployment
  const programId = new PublicKey("GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47");
  console.log('📋 Program ID:', programId.toString());
  
  // Load IDL from correct path
  let idl;
  try {
    idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
    console.log('✅ IDL loaded');
  } catch (err) {
    console.error('❌ Failed to load IDL:', err.message);
    console.error('   Make sure you ran: anchor build');
    process.exit(1);
  }
  
  // Create program interface
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );
  console.log('🏛️  Global State PDA:', globalState.toString());
  
  // Check if already initialized
  try {
    const account = await program.account.globalState.fetch(globalState);
    console.log('✅ Program already initialized!');
    console.log('📊 Details:');
    console.log('   House wallet:', account.houseWallet.toString());
    console.log('   House fee (bps):', account.houseFeeBps);
    console.log('   Total games:', account.totalGames.toString());
    console.log('   Is paused:', account.isPaused);
    
    // Create success file
    const credentials = `=== SOLANA COIN FLIPPER - READY FOR TESTING ===

✅ Program Successfully Initialized!

Program ID: ${programId.toString()}
Global State PDA: ${globalState.toString()}
House Wallet: ${account.houseWallet.toString()}
House Fee: ${account.houseFeeBps / 100}%
Network: https://api.devnet.solana.com

🔗 EXPLORER LINKS:
- Program: https://explorer.solana.com/address/${programId.toString()}?cluster=devnet
- Global State: https://explorer.solana.com/address/${globalState.toString()}?cluster=devnet
- House Wallet: https://explorer.solana.com/address/${account.houseWallet.toString()}?cluster=devnet

🚀 READY TO TEST!
- Create rooms with minimum 0.01 SOL bet
- Winner receives ~97% of pot
- House collects ~3% fee

🎮 TEST THE FRONTEND:
npm start
`;

    fs.writeFileSync('INITIALIZATION_SUCCESS.txt', credentials);
    console.log('📝 Created INITIALIZATION_SUCCESS.txt');
    return;
    
  } catch (e) {
    console.log('🔄 Program not initialized yet. Proceeding with initialization...');
  }
  
  // Use wallet as house wallet (or you can specify a different one)
  const houseWallet = wallet.publicKey; // Using deployer wallet as house
  
  try {
    console.log('🔧 Initializing program...');
    console.log('   House wallet will be:', houseWallet.toString());
    console.log('   House fee: 3% (300 bps)');
    
    // Initialize the program
    const tx = await program.methods
      .initialize(300) // 3% house fee
      .accounts({
        globalState,
        authority: wallet.publicKey,
        houseWallet: houseWallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('🎉 Initialization successful!');
    console.log('📋 Transaction signature:', tx);
    console.log('🔗 View on explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');
    
    // Wait a bit for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify initialization
    try {
      const account = await program.account.globalState.fetch(globalState);
      console.log('✅ Verification successful!');
      console.log('   House wallet:', account.houseWallet.toString());
      console.log('   House fee (bps):', account.houseFeeBps);
      
      const credentials = `=== SOLANA COIN FLIPPER - INITIALIZATION COMPLETE ===

🎉 Program Successfully Initialized!

Program ID: ${programId.toString()}
Global State PDA: ${globalState.toString()}
House Wallet: ${account.houseWallet.toString()}
House Fee: ${account.houseFeeBps / 100}%
Initialization TX: ${tx}
Network: https://api.devnet.solana.com

🔗 EXPLORER LINKS:
- Program: https://explorer.solana.com/address/${programId.toString()}?cluster=devnet
- Global State: https://explorer.solana.com/address/${globalState.toString()}?cluster=devnet
- House Wallet: https://explorer.solana.com/address/${account.houseWallet.toString()}?cluster=devnet
- Init Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet

🚀 SYSTEM READY FOR TESTING!

Next Steps:
1. Start the frontend: npm start
2. Create test rooms with 0.01+ SOL bets
3. Test coin flip functionality
4. Monitor house wallet for fee collection

Game Rules:
- Minimum bet: 0.01 SOL
- House fee: 3% of total pot
- Winner gets: 97% of pot
- Automatic VRF randomness for fairness
`;

      fs.writeFileSync('INITIALIZATION_SUCCESS.txt', credentials);
      console.log('📝 Created INITIALIZATION_SUCCESS.txt with all details');
      
    } catch (verifyErr) {
      console.warn('⚠️  Initialization completed but verification failed:', verifyErr.message);
    }
    
  } catch (err) {
    console.error('❌ Initialization failed:', err);
    
    if (err.message.includes('custom program error: 0x0')) {
      console.error('💡 This might mean the program is already initialized');
      console.error('   Try checking the global state account directly');
    } else if (err.message.includes('insufficient funds')) {
      console.error('💡 Make sure your wallet has enough SOL for transaction fees');
    } else if (err.message.includes('0x1')) {
      console.error('💡 Invalid instruction data - check program version/IDL compatibility');
    }
  }
}

initialize().catch(console.error);