const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const fs = require('fs');

// FOR GITHUB CODESPACE ENVIRONMENT ONLY
async function codespaceInit() {
  console.log('🚀 GitHub Codespace Initialization');
  console.log('📝 Copy this file to your Codespace and run: node codespace-init.js');
  
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load Codespace wallet
  let wallet;
  try {
    // Try the standard Codespace Solana wallet paths
    const paths = [
      '/home/codespace/.config/solana/id.json',
      '/home/codespace/.config/solana/devnet.json',
      process.env.HOME + '/.config/solana/id.json',
      process.env.HOME + '/.config/solana/devnet.json'
    ];
    
    for (const path of paths) {
      try {
        if (fs.existsSync(path)) {
          const keyData = JSON.parse(fs.readFileSync(path, 'utf8'));
          wallet = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
          console.log('✅ Codespace wallet loaded from:', path);
          console.log('🔑 Wallet address:', wallet.publicKey.toString());
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!wallet) {
      console.error('❌ No Codespace wallet found!');
      console.error('💡 Run these commands in your Codespace first:');
      console.error('   solana-keygen new --no-bip39-passphrase');
      console.error('   solana airdrop 2');
      return;
    }
  } catch (err) {
    console.error('❌ Failed to load Codespace wallet:', err.message);
    return;
  }
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Codespace wallet balance:', balance / 1e9, 'SOL');
  
  if (balance < 0.01 * 1e9) {
    console.error('❌ Insufficient balance in Codespace wallet');
    console.error('💡 Run in Codespace: solana airdrop 2');
    return;
  }
  
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  
  // Use YOUR deployed program ID
  const programId = new PublicKey("GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47");
  console.log('📋 Program ID:', programId.toString());
  
  // Load IDL
  let idl;
  try {
    idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
    console.log('✅ IDL loaded');
  } catch (err) {
    console.error('❌ Failed to load IDL. Run in Codespace: anchor build');
    return;
  }
  
  const program = new anchor.Program(idl, programId, provider);
  
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );
  console.log('🏛️  Global State PDA:', globalState.toString());
  
  // Check if already initialized
  try {
    const account = await program.account.globalState.fetch(globalState);
    console.log('✅ Program ALREADY initialized!');
    console.log('📊 House wallet:', account.houseWallet.toString());
    console.log('📊 House fee (bps):', account.houseFeeBps);
    console.log('📊 Total games:', account.totalGames.toString());
    
    console.log('');
    console.log('🎯 SYSTEM READY FOR USE!');
    console.log('');
    console.log('🌐 To use locally:');
    console.log('1. Copy this info to your local .env:');
    console.log(`   REACT_APP_PROGRAM_ID=${programId.toString()}`);
    console.log('2. Start local frontend: npm start');
    console.log('3. Use any wallet to connect and play');
    
    return;
    
  } catch (e) {
    console.log('🔄 Program not initialized. Initializing now...');
  }
  
  // Initialize with Codespace wallet as house
  try {
    console.log('🔧 Initializing with Codespace wallet as house...');
    
    const tx = await program.methods
      .initialize(300) // 3% house fee
      .accounts({
        globalState,
        authority: wallet.publicKey,
        houseWallet: wallet.publicKey, // Use same wallet as house
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('🎉 Initialization successful!');
    console.log('📋 Transaction:', tx);
    console.log('🔗 Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');
    
    console.log('');
    console.log('✅ CODESPACE INITIALIZATION COMPLETE!');
    console.log('');
    console.log('🌐 To use locally:');
    console.log('1. Update local .env with:');
    console.log(`   REACT_APP_PROGRAM_ID=${programId.toString()}`);
    console.log('2. Start local frontend: npm start');
    console.log('3. Connect any wallet and play!');
    
  } catch (err) {
    console.error('❌ Initialization failed:', err);
    console.error('💡 Make sure you are running this in the same Codespace where you deployed');
  }
}

codespaceInit().catch(console.error);