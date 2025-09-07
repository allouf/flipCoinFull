const anchor = require("@project-serum/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

// Configure the client to use the devnet cluster
const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

async function initialize() {
  // Load wallet from ~/.config/solana/id.json or your wallet
  const wallet = anchor.web3.Keypair.generate(); // Replace with your wallet
  
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );
  
  // Program ID from deployment
  const programId = new PublicKey("GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn");
  
  // Load IDL
  const idl = require("../src/idl/coin_flipper.json");
  
  // Create program interface
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive global state PDA
  const [globalState] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );
  
  console.log("Global State PDA:", globalState.toString());
  
  // Check if already initialized
  try {
    const account = await program.account.globalState.fetch(globalState);
    console.log("Program already initialized!");
    console.log("House wallet:", account.houseWallet.toString());
    console.log("House fee (bps):", account.houseFeeBps);
    console.log("Total games:", account.totalGames.toString());
    console.log("Is paused:", account.isPaused);
    return;
  } catch (e) {
    console.log("Program not initialized, initializing now...");
  }
  
  // Create house wallet
  const houseWallet = anchor.web3.Keypair.generate();
  
  try {
    // Initialize the program
    const tx = await program.methods
      .initialize(300) // 3% house fee
      .accounts({
        globalState,
        authority: provider.wallet.publicKey,
        houseWallet: houseWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("Initialization transaction signature:", tx);
    console.log("Program initialized successfully!");
    console.log("House wallet:", houseWallet.publicKey.toString());
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

initialize();