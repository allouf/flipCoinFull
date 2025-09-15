const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram, Keypair } = require("@solana/web3.js");
const fs = require('fs');

class NodeWallet {
  constructor(keypair) {
    this.payer = keypair;
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
  console.log('🚀 Working Codespace Program Initialization');

  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet properly
  const keyData = JSON.parse(fs.readFileSync('/home/codespace/.config/solana/id.json', 'utf8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keyData));
  const wallet = new NodeWallet(keypair);
  
  console.log('✅ Wallet:', wallet.publicKey.toString());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');

  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const programId = new PublicKey("DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp");

  // Load IDL
  const idl = JSON.parse(fs.readFileSync('./target/idl/coin_flipper.json', 'utf8'));
  const program = new anchor.Program(idl, programId, provider);

  const [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], programId);
  console.log('🏛️  Global State:', globalState.toString());

  // Check if initialized
  try {
    const account = await program.account.globalState.fetch(globalState);
    console.log('✅ Already initialized!');
    console.log('Authority:', account.authority.toString());
    console.log('House wallet:', account.houseWallet.toString());
    console.log('House fee:', account.houseFeeBps, 'bps');
    return account;
  } catch (e) {
    console.log('🔄 Not initialized, initializing now...');
  }

  // Initialize the program
  try {
    console.log('📝 Calling initialize with 300 bps house fee...');
    
    const tx = await program.methods
      .initialize(300)
      .accounts({
        globalState: globalState,
        authority: wallet.publicKey,
        houseWallet: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('🎉 Initialization successful!');
    console.log('Transaction:', tx);
    console.log('🔗 Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');

    // Verify
    const account = await program.account.globalState.fetch(globalState);
    console.log('✅ Verified initialization:');
    console.log('  Authority:', account.authority.toString());
    console.log('  House wallet:', account.houseWallet.toString());
    console.log('  House fee:', account.houseFeeBps, 'bps');
    console.log('  Total games:', account.totalGames.toString());

    return account;

  } catch (err) {
    console.error('❌ Initialization failed:');
    console.error(err);
    return null;
  }
}

// Run the initialization
initializeProgram()
  .then((result) => {
    if (result) {
      console.log('🎉 Program is ready for use!');
    } else {
      console.log('❌ Program initialization incomplete');
    }
  })
  .catch((err) => {
    console.error('💥 Error:', err);
  });
