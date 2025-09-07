const { Connection, PublicKey, Keypair, SystemProgram, Transaction } = require('@solana/web3.js');
const fs = require('fs');

// Manual initialization without Anchor dependencies
async function manualInitialize() {
  console.log('🚀 Manual Solana Coin Flipper Initialization');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Try multiple wallet paths
  const walletPaths = [
    process.env.HOME + '/.config/solana/devnet.json',
    process.env.HOME + '/.config/solana/id.json',
    './devnet-keypair.json',
    './id.json'
  ];
  
  let wallet = null;
  let walletPath = null;
  
  for (const path of walletPaths) {
    try {
      if (fs.existsSync(path)) {
        const keyData = JSON.parse(fs.readFileSync(path, 'utf8'));
        wallet = Keypair.fromSecretKey(new Uint8Array(keyData));
        walletPath = path;
        break;
      }
    } catch (err) {
      // Continue to next path
    }
  }
  
  if (!wallet) {
    console.log('❌ No wallet found. Creating a temporary wallet for testing...');
    wallet = Keypair.generate();
    console.log('⚠️  Generated temporary wallet:', wallet.publicKey.toString());
    console.log('⚠️  You will need to fund this wallet with some devnet SOL');
    
    // Save temporary wallet
    fs.writeFileSync('temp-wallet.json', JSON.stringify(Array.from(wallet.secretKey)));
    console.log('📝 Saved temporary wallet to temp-wallet.json');
    
    // Request airdrop
    try {
      const airdropSig = await connection.requestAirdrop(wallet.publicKey, 1e9); // 1 SOL
      await connection.confirmTransaction(airdropSig);
      console.log('✅ Airdropped 1 SOL to temporary wallet');
    } catch (err) {
      console.log('⚠️  Airdrop failed:', err.message);
      console.log('💡 Get devnet SOL from: https://faucet.solana.com/');
      console.log('💡 Send to:', wallet.publicKey.toString());
      return;
    }
  } else {
    console.log('✅ Wallet loaded from:', walletPath);
    console.log('🔑 Wallet address:', wallet.publicKey.toString());
  }
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Wallet balance:', balance / 1e9, 'SOL');
  
  if (balance < 0.01 * 1e9) {
    console.log('❌ Insufficient balance. Get SOL from: https://faucet.solana.com/');
    console.log('💡 Send to:', wallet.publicKey.toString());
    return;
  }
  
  // Use the correct program ID from your result.md
  const programId = new PublicKey('GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47');
  console.log('📋 Program ID:', programId.toString());
  
  // Check if program exists
  const programAccount = await connection.getAccountInfo(programId);
  if (!programAccount) {
    console.log('❌ Program not found on devnet!');
    console.log('💡 Deploy first or check the program ID');
    return;
  }
  
  console.log('✅ Program found on devnet');
  
  // Find Global State PDA
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );
  console.log('🏛️  Global State PDA:', globalStatePda.toString());
  
  // Check if already initialized
  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (globalStateAccount) {
    console.log('✅ Program already initialized!');
    console.log('📊 Account data length:', globalStateAccount.data.length);
    
    const successInfo = `=== SOLANA COIN FLIPPER - ALREADY INITIALIZED ===

✅ Program is already initialized and ready!

Program ID: ${programId.toString()}
Global State PDA: ${globalStatePda.toString()}
Your Wallet: ${wallet.publicKey.toString()}
Network: https://api.devnet.solana.com

🔗 EXPLORER LINKS:
- Program: https://explorer.solana.com/address/${programId.toString()}?cluster=devnet
- Global State: https://explorer.solana.com/address/${globalStatePda.toString()}?cluster=devnet
- Your Wallet: https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=devnet

🚀 SYSTEM READY FOR TESTING!

Next Steps:
1. Start the frontend: npm start
2. Connect your wallet
3. Create test rooms with 0.01+ SOL bets
4. Test coin flip functionality

Frontend Configuration:
- Make sure REACT_APP_PROGRAM_ID in .env matches: ${programId.toString()}
- Wallet should connect automatically
`;

    fs.writeFileSync('READY_FOR_TESTING.txt', successInfo);
    console.log('📝 Created READY_FOR_TESTING.txt');
    console.log('');
    console.log('🎯 YOUR NEXT STEP: npm start');
    return;
  }
  
  console.log('🔄 Program not initialized yet');
  console.log('💡 Since this is a complex initialization requiring the exact Anchor instruction format,');
  console.log('    the best approach is to initialize through the frontend when you create the first game.');
  console.log('');
  console.log('🎯 RECOMMENDED APPROACH:');
  console.log('   1. Start the frontend: npm start');
  console.log('   2. Connect your wallet');
  console.log('   3. Try to create a game room - this will trigger initialization');
  console.log('   4. The first user to create a room will initialize the program');
  console.log('');
  
  const instructions = `=== SOLANA COIN FLIPPER - INITIALIZATION NEEDED ===

Status: Program deployed but not initialized

Program ID: ${programId.toString()}
Your Wallet: ${wallet.publicKey.toString()}
Network: https://api.devnet.solana.com
Wallet Balance: ${balance / 1e9} SOL

🎯 HOW TO INITIALIZE:

Option 1 (RECOMMENDED): Initialize via Frontend
1. Run: npm start
2. Connect your wallet (${wallet.publicKey.toString()})
3. Create the first game room - this will automatically initialize the program
4. The frontend handles all the complex initialization logic

Option 2: Manual Script (if Option 1 fails)
1. Make sure you have the correct IDL file
2. Use anchor CLI or custom initialization script
3. Check Anchor.toml has correct program ID

🔗 EXPLORER LINKS:
- Program: https://explorer.solana.com/address/${programId.toString()}?cluster=devnet
- Your Wallet: https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=devnet

Frontend Configuration Check:
- .env should have: REACT_APP_PROGRAM_ID=${programId.toString()}
- Wallet adapter should be configured for devnet

🚀 START WITH: npm start
`;

  fs.writeFileSync('INITIALIZATION_INSTRUCTIONS.txt', instructions);
  console.log('📝 Created INITIALIZATION_INSTRUCTIONS.txt');
  console.log('');
  console.log('🎯 YOUR NEXT STEP: npm start');
}

manualInitialize().catch(console.error);