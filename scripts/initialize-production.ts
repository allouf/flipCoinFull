  import * as anchor from "@coral-xyz/anchor";
  import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

  async function initialize() {
    // Configure the client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.CoinFlipper;
    const wallet = provider.wallet;

    console.log("🚀 Initializing Coin Flipper Program");
    console.log("📋 Program ID:", program.programId.toString());
    console.log("👤 Authority:", wallet.publicKey.toString());

    // Create house wallet (same as authority for now)
    const houseWallet = wallet.publicKey;
    const houseFee = 300; // 3%

    try {
      // Find global state PDA
      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      );

      console.log("🏛️ Global State PDA:", globalStatePda.toString());

      // Initialize the program
      const initTx = await program.methods
        .initialize(houseFee)
        .accounts({
          globalState: globalStatePda,
          authority: wallet.publicKey,
          houseWallet: houseWallet,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Program initialized!");
      console.log("📝 Transaction:", initTx);
      console.log("💰 House wallet:", houseWallet.toString());
      console.log("💸 House fee: 3%");

      // Verify
      const globalState = await program.account.globalState.fetch(globalStatePda);
      console.log("\n📊 Global State:");
      console.log("   Authority:", globalState.authority.toString());
      console.log("   House Fee:", globalState.houseFeeBps, "bps");
      console.log("   Total Games:", globalState.totalGames.toString());

    } catch (error) {
      console.error("❌ Error:", error);
    }
  }

  initialize();
