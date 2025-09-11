  const anchor = require("@project-serum/anchor");
  const { PublicKey, SystemProgram } = require("@solana/web3.js");
  const fs = require('fs');

  async function initializeProgram() {
    console.log('🚀 Codespace Program Initialization');

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");     

    // Load Codespace wallet
    const keyData = JSON.parse(fs.readFileSync('/home/codespace/.config/solana/id.json',
  'utf8'));
    const wallet = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));
    console.log('✅ Codespace wallet:', wallet.publicKey.toString());

    const balance = await connection.getBalance(wallet.publicKey);
    console.log('💰 Balance:', balance / 1e9, 'SOL');

    if (balance < 0.01 * 1e9) {
      console.error('❌ Need more SOL. Run: solana airdrop 2');
      return;
    }

    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });     
    const programId = new PublicKey("GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47");

    // Load IDL
    const idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
    const program = new anchor.Program(idl, programId, provider);

    const [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global_state")],
  programId);
    console.log('🏛️  Global State PDA:', globalState.toString());

    // Check if already initialized
    try {
      const account = await program.account.globalState.fetch(globalState);
      console.log('✅ Already initialized!');
      console.log('House wallet:', account.houseWallet.toString());
      return;
    } catch (e) {
      console.log('🔄 Initializing...');
    }

    // Initialize
    try {
      const tx = await program.methods
        .initialize(300) // 3% house fee
        .accounts({
          globalState,
          authority: wallet.publicKey,
          houseWallet: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('🎉 Success! TX:', tx);
      console.log('🔗 Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');

    } catch (err) {
      console.error('❌ Failed:', err);
    }
  }

  initializeProgram().catch(console.error);
