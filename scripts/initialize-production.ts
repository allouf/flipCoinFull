<<<<<<< HEAD
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlipper } from "../target/types/coin_flipper";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function initializeProgram() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
  const wallet = provider.wallet;

  console.log("🚀 Initializing Coin Flipper Program");
  console.log("📋 Program ID:", program.programId.toString());
  console.log("👤 Authority:", wallet.publicKey.toString());

  // Create house wallet (can be the same as authority or different)
  const houseWallet = wallet.publicKey; // You can change this to a different wallet
  
  // House fee: 3% = 300 basis points
  const houseFee = 300;

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
    console.log("📝 Transaction signature:", initTx);
    console.log("💰 House wallet:", houseWallet.toString());
    console.log("💸 House fee:", houseFee / 100, "%");
    
    // Verify initialization
    const globalState = await program.account.globalState.fetch(globalStatePda);
    console.log("\n📊 Global State:");
    console.log("   Authority:", globalState.authority.toString());
    console.log("   House Wallet:", globalState.houseWallet.toString());
    console.log("   House Fee (bps):", globalState.houseFeeBps);
    console.log("   Total Games:", globalState.totalGames.toString());
    console.log("   Is Paused:", globalState.isPaused);
    
    return {
      programId: program.programId,
      globalState: globalStatePda,
      authority: wallet.publicKey,
      houseWallet,
      houseFee
    };
    
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    throw error;
  }
}

// Test game flow
export async function testGameFlow() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
  
  console.log("\n🎮 Testing Complete Game Flow");
  
  // Create test players
  const player1 = provider.wallet;
  const player2 = Keypair.generate();
  
  // Airdrop SOL to player 2 for testing
  console.log("💰 Airdropping SOL to player 2...");
  const airdropTx = await provider.connection.requestAirdrop(
    player2.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(airdropTx);
  
  const roomId = Math.floor(Math.random() * 1000000);
  const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
  
  console.log("🎲 Room ID:", roomId);
  console.log("💵 Bet Amount:", betAmount / LAMPORTS_PER_SOL, "SOL");
  
  // Find PDAs
  const [gameRoomPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("game_room"),
      player1.publicKey.toBuffer(),
      new anchor.BN(roomId).toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );
  
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      player1.publicKey.toBuffer(),
      new anchor.BN(roomId).toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );
  
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  try {
    // Step 1: Create room
    console.log("\n1️⃣ Creating room...");
    const createTx = await program.methods
      .createRoom(new anchor.BN(roomId), new anchor.BN(betAmount))
      .accounts({
        gameRoom: gameRoomPda,
        escrowAccount: escrowPda,
        creator: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Room created, TX:", createTx);
    
    // Check escrow balance
    const escrowBalance = await provider.connection.getBalance(escrowPda);
    console.log("💰 Escrow balance:", escrowBalance / LAMPORTS_PER_SOL, "SOL");

    // Step 2: Join room
    console.log("\n2️⃣ Player 2 joining room...");
    const joinTx = await program.methods
      .joinRoom()
      .accounts({
        gameRoom: gameRoomPda,
        escrowAccount: escrowPda,
        joiner: player2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();
    
    console.log("✅ Player 2 joined, TX:", joinTx);
    
    // Check escrow balance after join
    const escrowBalanceAfterJoin = await provider.connection.getBalance(escrowPda);
    console.log("💰 Escrow balance after join:", escrowBalanceAfterJoin / LAMPORTS_PER_SOL, "SOL");

    // Step 3: Make selections
    console.log("\n3️⃣ Players making selections...");
    
    // Player 1 selects Heads
    const p1SelectTx = await program.methods
      .makeSelection({ heads: {} })
      .accounts({
        gameRoom: gameRoomPda,
        player: player1.publicKey,
      })
      .rpc();
    
    console.log("✅ Player 1 selected Heads, TX:", p1SelectTx);
    
    // Player 2 selects Tails
    const p2SelectTx = await program.methods
      .makeSelection({ tails: {} })
      .accounts({
        gameRoom: gameRoomPda,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();
    
    console.log("✅ Player 2 selected Tails, TX:", p2SelectTx);

    // Step 4: Resolve game
    console.log("\n4️⃣ Resolving game...");
    
    const globalState = await program.account.globalState.fetch(globalStatePda);
    
    // Get balances before resolution
    const p1BalanceBefore = await provider.connection.getBalance(player1.publicKey);
    const p2BalanceBefore = await provider.connection.getBalance(player2.publicKey);
    const houseBalanceBefore = await provider.connection.getBalance(globalState.houseWallet);
    
    const resolveTx = await program.methods
      .resolveGame()
      .accounts({
        gameRoom: gameRoomPda,
        globalState: globalStatePda,
        escrowAccount: escrowPda,
        player1: player1.publicKey,
        player2: player2.publicKey,
        houseWallet: globalState.houseWallet,
        resolver: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Game resolved, TX:", resolveTx);
    
    // Get balances after resolution
    const p1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
    const p2BalanceAfter = await provider.connection.getBalance(player2.publicKey);
    const houseBalanceAfter = await provider.connection.getBalance(globalState.houseWallet);
    const escrowBalanceAfter = await provider.connection.getBalance(escrowPda);
    
    // Show results
    const room = await program.account.gameRoom.fetch(gameRoomPda);
    const winner = room.winner;
    
    console.log("\n🏆 GAME RESULTS:");
    console.log("Winner:", winner?.toString());
    console.log("Player 1 balance change:", (p1BalanceAfter - p1BalanceBefore) / LAMPORTS_PER_SOL, "SOL");
    console.log("Player 2 balance change:", (p2BalanceAfter - p2BalanceBefore) / LAMPORTS_PER_SOL, "SOL");
    console.log("House balance change:", (houseBalanceAfter - houseBalanceBefore) / LAMPORTS_PER_SOL, "SOL");
    console.log("Final escrow balance:", escrowBalanceAfter / LAMPORTS_PER_SOL, "SOL");
    
    console.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await initializeProgram();
      console.log("\n" + "=".repeat(50));
      await testGameFlow();
    } catch (error) {
      console.error("Script failed:", error);
      process.exit(1);
    }
  })();
}
=======
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
>>>>>>> a3240bbb5f653348ce26db5b5699e8140160ba70
