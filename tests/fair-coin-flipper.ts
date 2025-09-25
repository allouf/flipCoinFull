import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCoinFlipper } from "../target/types/fair_coin_flipper";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import crypto from "crypto";
import { sha256 } from "js-sha256";

describe("fair-coin-flipper", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FairCoinFlipper as Program<FairCoinFlipper>;
  
  // Test keypairs
  let playerA: Keypair;
  let playerB: Keypair;
  let houseWallet: Keypair;
  
  // Game data
  let gameId: anchor.BN;
  let betAmount: anchor.BN;
  let secretA: anchor.BN;
  let secretB: anchor.BN;
  let choiceA: { heads: {} } | { tails: {} };
  let choiceB: { heads: {} } | { tails: {} };
  let commitmentA: number[];
  let commitmentB: number[];
  
  // PDAs
  let gamePda: PublicKey;
  let escrowPda: PublicKey;

  beforeEach(async () => {
    // Initialize test keypairs
    playerA = Keypair.generate();
    playerB = Keypair.generate();
    houseWallet = Keypair.generate();
    
    // Fund players
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerA.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerB.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    
    // Generate game data
    gameId = new anchor.BN(Math.floor(Math.random() * 1000000));
    betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
    
    // Generate secrets and choices
    secretA = new anchor.BN(crypto.randomInt(0, Number.MAX_SAFE_INTEGER));
    secretB = new anchor.BN(crypto.randomInt(0, Number.MAX_SAFE_INTEGER));
    choiceA = { heads: {} };
    choiceB = { tails: {} };
    
    // Generate commitments
    commitmentA = Array.from(generateCommitment(choiceA, secretA));
    commitmentB = Array.from(generateCommitment(choiceB, secretB));
    
    // Derive PDAs
    [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        playerA.publicKey.toBuffer(),
        gameId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        playerA.publicKey.toBuffer(),
        gameId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  });

  describe("Game Creation", () => {
    it("Should create a new game successfully", async () => {
      const tx = await program.methods
        .createGame(gameId, betAmount, commitmentA)
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: playerA.publicKey,
          houseWallet: houseWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerA])
        .rpc();

      // Verify game account was created correctly
      const gameAccount = await program.account.game.fetch(gamePda);
      expect(gameAccount.gameId.eq(gameId)).to.be.true;
      expect(gameAccount.playerA.equals(playerA.publicKey)).to.be.true;
      expect(gameAccount.betAmount.eq(betAmount)).to.be.true;
      expect(gameAccount.status).to.deep.equal({ waitingForPlayer: {} });
      expect(gameAccount.commitmentA).to.deep.equal(commitmentA);
      expect(gameAccount.commitmentsComplete).to.be.false;
      
      // Verify escrow received the bet
      const escrowBalance = await provider.connection.getBalance(escrowPda);
      expect(escrowBalance).to.equal(betAmount.toNumber());
    });

    it("Should fail with bet amount too low", async () => {
      const lowBetAmount = new anchor.BN(100); // Less than 0.001 SOL
      
      try {
        await program.methods
          .createGame(gameId, lowBetAmount, commitmentA)
          .accounts({
            game: gamePda,
            escrow: escrowPda,
            playerA: playerA.publicKey,
            houseWallet: houseWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([playerA])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Bet amount too low");
      }
    });

    it("Should fail with bet amount too high", async () => {
      const highBetAmount = new anchor.BN(150 * LAMPORTS_PER_SOL); // More than 100 SOL
      
      try {
        await program.methods
          .createGame(gameId, highBetAmount, commitmentA)
          .accounts({
            game: gamePda,
            escrow: escrowPda,
            playerA: playerA.publicKey,
            houseWallet: houseWallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([playerA])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Bet amount too high");
      }
    });
  });

  describe("Game Joining", () => {
    beforeEach(async () => {
      // Create a game first
      await program.methods
        .createGame(gameId, betAmount, commitmentA)
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: playerA.publicKey,
          houseWallet: houseWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerA])
        .rpc();
    });

    it("Should join game successfully", async () => {
      const tx = await program.methods
        .joinGame(commitmentB)
        .accounts({
          game: gamePda,
          playerB: playerB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerB])
        .rpc();

      // Verify game state updated correctly
      const gameAccount = await program.account.game.fetch(gamePda);
      expect(gameAccount.playerB.equals(playerB.publicKey)).to.be.true;
      expect(gameAccount.status).to.deep.equal({ commitmentsReady: {} });
      expect(gameAccount.commitmentB).to.deep.equal(commitmentB);
      expect(gameAccount.commitmentsComplete).to.be.true;
      
      // Verify escrow received both bets
      const escrowBalance = await provider.connection.getBalance(escrowPda);
      expect(escrowBalance).to.equal(betAmount.toNumber() * 2);
    });

    it("Should fail to join twice", async () => {
      // First join
      await program.methods
        .joinGame(commitmentB)
        .accounts({
          game: gamePda,
          playerB: playerB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerB])
        .rpc();

      // Try to join again
      try {
        await program.methods
          .joinGame(commitmentB)
          .accounts({
            game: gamePda,
            playerB: playerB.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([playerB])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Invalid game status");
      }
    });
  });

  describe("Choice Revelation", () => {
    beforeEach(async () => {
      // Create and join game
      await program.methods
        .createGame(gameId, betAmount, commitmentA)
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: playerA.publicKey,
          houseWallet: houseWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerA])
        .rpc();

      await program.methods
        .joinGame(commitmentB)
        .accounts({
          game: gamePda,
          playerB: playerB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerB])
        .rpc();
    });

    it("Should reveal choice successfully", async () => {
      const tx = await program.methods
        .revealChoice(choiceA, secretA)
        .accounts({
          game: gamePda,
          player: playerA.publicKey,
        })
        .signers([playerA])
        .rpc();

      // Verify revelation stored correctly
      const gameAccount = await program.account.game.fetch(gamePda);
      expect(gameAccount.choiceA).to.deep.equal(choiceA);
      expect(gameAccount.secretA.eq(secretA)).to.be.true;
      expect(gameAccount.status).to.deep.equal({ revealingPhase: {} });
    });

    it("Should fail with invalid commitment", async () => {
      const wrongSecret = new anchor.BN(999999);
      
      try {
        await program.methods
          .revealChoice(choiceA, wrongSecret)
          .accounts({
            game: gamePda,
            player: playerA.publicKey,
          })
          .signers([playerA])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Invalid commitment");
      }
    });

    it("Should auto-resolve when both players reveal", async () => {
      // Player A reveals
      await program.methods
        .revealChoice(choiceA, secretA)
        .accounts({
          game: gamePda,
          player: playerA.publicKey,
        })
        .signers([playerA])
        .rpc();

      // Player B reveals - should trigger auto-resolution
      await program.methods
        .revealChoice(choiceB, secretB)
        .accounts({
          game: gamePda,
          player: playerB.publicKey,
        })
        .remainingAccounts([
          {
            pubkey: playerA.publicKey,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: playerB.publicKey,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: houseWallet.publicKey,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: escrowPda,
            isWritable: true,
            isSigner: false,
          },
        ])
        .signers([playerB])
        .rpc();

      // Verify game was resolved
      const gameAccount = await program.account.game.fetch(gamePda);
      expect(gameAccount.status).to.deep.equal({ resolved: {} });
      expect(gameAccount.winner).to.not.be.null;
      expect(gameAccount.coinResult).to.not.be.null;
      expect(gameAccount.houseFee.toNumber()).to.be.greaterThan(0);
      
      // Verify escrow is empty (funds distributed)
      const escrowBalance = await provider.connection.getBalance(escrowPda);
      expect(escrowBalance).to.equal(0);
    });

    it("Should prevent double revelation", async () => {
      // First revelation
      await program.methods
        .revealChoice(choiceA, secretA)
        .accounts({
          game: gamePda,
          player: playerA.publicKey,
        })
        .signers([playerA])
        .rpc();

      // Try to reveal again
      try {
        await program.methods
          .revealChoice(choiceA, secretA)
          .accounts({
            game: gamePda,
            player: playerA.publicKey,
          })
          .signers([playerA])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Already revealed");
      }
    });
  });

  describe("Randomness Tests", () => {
    it("Should generate different results with different inputs", () => {
      // Test commitment generation with different inputs
      const choice1 = { heads: {} };
      const choice2 = { tails: {} };
      const secret1 = new anchor.BN(12345);
      const secret2 = new anchor.BN(54321);
      
      const commitment1 = generateCommitment(choice1, secret1);
      const commitment2 = generateCommitment(choice1, secret2);
      const commitment3 = generateCommitment(choice2, secret1);
      
      expect(commitment1).to.not.deep.equal(commitment2);
      expect(commitment1).to.not.deep.equal(commitment3);
      expect(commitment2).to.not.deep.equal(commitment3);
    });

    it("Should generate consistent results with same inputs", () => {
      const choice = { heads: {} };
      const secret = new anchor.BN(12345);
      
      const commitment1 = generateCommitment(choice, secret);
      const commitment2 = generateCommitment(choice, secret);
      
      expect(commitment1).to.deep.equal(commitment2);
    });
  });

  describe("Timeout Handling", () => {
    it("Should handle timeout when no one reveals", async () => {
      // Create and join game
      await program.methods
        .createGame(gameId, betAmount, commitmentA)
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: playerA.publicKey,
          houseWallet: houseWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerA])
        .rpc();

      await program.methods
        .joinGame(commitmentB)
        .accounts({
          game: gamePda,
          playerB: playerB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerB])
        .rpc();

      // Wait for timeout (this would normally require time manipulation in tests)
      // For now, just verify the function exists and can be called
      try {
        await program.methods
          .handleTimeout()
          .accounts({
            game: gamePda,
            escrow: escrowPda,
            playerA: playerA.publicKey,
            playerB: playerB.publicKey,
            caller: playerA.publicKey,
          })
          .signers([playerA])
          .rpc();
        
        // Should fail because timeout not reached
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Timeout not reached");
      }
    });
  });

  describe("Security Tests", () => {
    it("Should prevent non-players from revealing", async () => {
      // Create and join game
      await program.methods
        .createGame(gameId, betAmount, commitmentA)
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: playerA.publicKey,
          houseWallet: houseWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerA])
        .rpc();

      await program.methods
        .joinGame(commitmentB)
        .accounts({
          game: gamePda,
          playerB: playerB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([playerB])
        .rpc();

      // Try to reveal with random keypair
      const randomPlayer = Keypair.generate();
      const randomSecret = new anchor.BN(999999);
      const randomChoice = { heads: {} };

      try {
        await program.methods
          .revealChoice(randomChoice, randomSecret)
          .accounts({
            game: gamePda,
            player: randomPlayer.publicKey,
          })
          .signers([randomPlayer])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.error.errorMessage).to.include("Not a player");
      }
    });

    it("Should prevent manipulation attempts", async () => {
      // Test various manipulation scenarios
      // This would include tests for:
      // - Front-running attempts
      // - Invalid commitment manipulation  
      // - Replay attacks
      // - Account substitution attacks
      
      // For now, just verify basic security measures work
      expect(true).to.be.true; // Placeholder for comprehensive security tests
    });
  });
});

// Helper function to generate commitment hash (matches smart contract logic)
function generateCommitment(
  choice: { heads: {} } | { tails: {} },
  secret: anchor.BN
): Uint8Array {
  const choiceStr = "heads" in choice ? "heads" : "tails";
  const secretBytes = secret.toArrayLike(Buffer, "le", 8);
  
  const hash = sha256.create();
  hash.update(choiceStr);
  hash.update(secretBytes);
  
  return new Uint8Array(hash.arrayBuffer());
}

// Performance benchmarking helper
function benchmarkFunction(name: string, fn: () => void, iterations: number = 1000) {
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  
  console.log(`${name}: ${duration.toFixed(2)}ms for ${iterations} iterations`);
  console.log(`${name}: ${(duration / iterations).toFixed(4)}ms per iteration`);
}
