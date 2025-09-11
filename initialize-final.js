  const anchor = require("@project-serum/anchor");
  const { PublicKey, SystemProgram } = require("@solana/web3.js");
  const fs = require('fs');

  class NodeWallet {
    constructor(payer) { this.payer = payer; }
    async signTransaction(tx) { tx.partialSign(this.payer); return tx; }
    async signAllTransactions(txs) { return txs.map((tx) => { tx.partialSign(this.payer); return     
  tx; }); }
    get publicKey() { return this.payer.publicKey; }
  }

  async function initialize() {
    console.log('🚀 Final Initialization with Deployed Program');

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");     
    const keyData = JSON.parse(fs.readFileSync('/home/codespace/.config/solana/devnet.json',
  'utf8'));
    const wallet = new NodeWallet(anchor.web3.Keypair.fromSecretKey(new Uint8Array(keyData)));       

    console.log('✅ Wallet:', wallet.publicKey.toString());

    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });     
    const programId = new PublicKey("EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou");

    console.log('📋 Program ID:', programId.toString());

    const idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
    const program = new anchor.Program(idl, programId, provider);

    const [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global_state")],
  programId);
    console.log('🏛️  Global State PDA:', globalState.toString());

    try {
      const account = await program.account.globalState.fetch(globalState);
      console.log('✅ Already initialized!');
      console.log('📊 House wallet:', account.houseWallet.toString());
      console.log('📊 House fee:', account.houseFeeBps, 'bps');
      return;
    } catch (e) {
      console.log('🔄 Initializing...');
    }

    const tx = await program.methods.initialize(300).accounts({
      globalState, authority: wallet.publicKey, houseWallet: wallet.publicKey, systemProgram:        
  SystemProgram.programId,
    }).rpc();

    console.log('🎉 Initialization Success!');
    console.log('📋 Transaction:', tx);
    console.log('🔗 Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');
  }

  initialize().catch(console.error);
