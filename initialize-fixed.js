  const anchor = require("@project-serum/anchor");
  const { PublicKey, SystemProgram } = require("@solana/web3.js");
  const fs = require('fs');

  // Create a proper wallet wrapper
  class NodeWallet {
    constructor(payer) {
      this.payer = payer;
    }

    async signTransaction(tx) {
      tx.partialSign(this.payer);
      return tx;
    }

    async signAllTransactions(txs) {
      return txs.map((tx) => {
        tx.partialSign(this.payer);
        return tx;
      });
    }

    get publicKey() {
      return this.payer.publicKey;
    }
  }

  async function initializeProgram() {
    console.log('🚀 Fixed Codespace Initialization');

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");     

    // Load keypair
    const keyData = JSON.parse(fs.readFileSync('/home/codespace/.config/solana/id.json',
  'utf8'));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData));

    // Create proper wallet
    const wallet = new NodeWallet(keypair);
    console.log('✅ Wallet:', wallet.publicKey.toString());

    const balance = await connection.getBalance(wallet.publicKey);
    console.log('💰 Balance:', balance / 1e9, 'SOL');

    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });     
    const programId = new PublicKey("GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47");

    const idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
    const program = new anchor.Program(idl, programId, provider);

    const [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global_state")],
  programId);
    console.log('🏛️  Global State PDA:', globalState.toString());

    // Check if already initialized
    try {
      const account = await program.account.globalState.fetch(globalState);
      console.log('✅ Program already initialized!');
      console.log('📊 House wallet:', account.houseWallet.toString());
      console.log('📊 House fee:', account.houseFeeBps, 'bps');
      console.log('📊 Total games:', account.totalGames.toString());
      return;
    } catch (e) {
      console.log('🔄 Program not initialized, proceeding...');
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

      console.log('🎉 Initialization successful!');
      console.log('📋 Transaction:', tx);
      console.log('🔗 Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');

      // Verify
      const account = await program.account.globalState.fetch(globalState);
      console.log('✅ Verification:');
      console.log('   House wallet:', account.houseWallet.toString());
      console.log('   House fee:', account.houseFeeBps, 'bps');

    } catch (err) {
      console.error('❌ Initialization failed:', err);
    }
  }

  initializeProgram().catch(console.error);
