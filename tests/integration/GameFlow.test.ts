import { describe, beforeEach, test, expect } from 'vitest';
import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { FairCoinFlipper } from '../../target/types/fair_coin_flipper';
import { generateCommitment, generateSecret } from '../../src/utils/gameInstructions';
import fairCoinFlipperIdl from '../../src/idl/fair_coin_flipper.json';

describe('Fair Coin Flipper Game Flow', () => {
  // Test accounts
  let playerA: Keypair;
  let playerB: Keypair;
  let program: Program<FairCoinFlipper>;
  let connection: Connection;
  let provider: AnchorProvider;

  // Test game data
  let gameId: bigint;
  let gamePDA: PublicKey;
  let escrowPDA: PublicKey;
  let playerASecret: bigint;
  let playerBSecret: bigint;
  let playerACommitment: Uint8Array;
  let playerBCommitment: Uint8Array;

  beforeEach(async () => {
    // Setup test environment
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    playerA = Keypair.generate();
    playerB = Keypair.generate();

    // Fund test accounts
    await connection.requestAirdrop(playerA.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(playerB.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(await connection.requestAirdrop(playerA.publicKey, 2 * LAMPORTS_PER_SOL));
    await connection.confirmTransaction(await connection.requestAirdrop(playerB.publicKey, 2 * LAMPORTS_PER_SOL));

    // Initialize program
    provider = new AnchorProvider(connection, playerA, {});
    program = new Program(fairCoinFlipperIdl, new PublicKey(process.env.PROGRAM_ID), provider);

    // Generate test game data
    gameId = BigInt(Date.now());
    [gamePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        playerA.publicKey.toBuffer(),
        new BN(gameId.toString()).toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );
    [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('escrow'),
        playerA.publicKey.toBuffer(),
        new BN(gameId.toString()).toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    // Generate secrets and commitments
    playerASecret = generateSecret();
    playerBSecret = generateSecret();
    playerACommitment = generateCommitment('heads', playerASecret);
    playerBCommitment = generateCommitment('tails', playerBSecret);
  });

  test('Complete game flow', async () => {
    const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

    // 1. Create Game
    console.log('🎮 Creating game...');
    await program.methods
      .createGame(new BN(gameId.toString()), new BN(betAmount))
      .accounts({
        playerA: playerA.publicKey,
        game: gamePDA,
        escrow: escrowPDA,
        houseWallet: new PublicKey(process.env.HOUSE_WALLET),
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    // Verify game creation
    let gameAccount = await program.account.game.fetch(gamePDA);
    expect(gameAccount.gameId.toString()).toBe(gameId.toString());
    expect(gameAccount.playerA.toString()).toBe(playerA.publicKey.toString());
    expect(gameAccount.betAmount.toNumber()).toBe(betAmount);
    expect(gameAccount.status).toBe({ waitingForPlayer: {} });

    // 2. Join Game
    console.log('🤝 Joining game...');
    await program.methods
      .joinGame()
      .accounts({
        playerB: playerB.publicKey,
        game: gamePDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerB])
      .rpc();

    // Verify join
    gameAccount = await program.account.game.fetch(gamePDA);
    expect(gameAccount.playerB.toString()).toBe(playerB.publicKey.toString());
    expect(gameAccount.status).toBe({ playersReady: {} });

    // 3. Make Commitments
    console.log('🔒 Making commitments...');
    await program.methods
      .makeCommitment(Array.from(playerACommitment))
      .accounts({
        player: playerA.publicKey,
        game: gamePDA,
      })
      .signers([playerA])
      .rpc();

    await program.methods
      .makeCommitment(Array.from(playerBCommitment))
      .accounts({
        player: playerB.publicKey,
        game: gamePDA,
      })
      .signers([playerB])
      .rpc();

    // Verify commitments
    gameAccount = await program.account.game.fetch(gamePDA);
    expect(gameAccount.status).toBe({ commitmentsReady: {} });
    expect(Buffer.from(gameAccount.commitmentA)).toEqual(Buffer.from(playerACommitment));
    expect(Buffer.from(gameAccount.commitmentB)).toEqual(Buffer.from(playerBCommitment));

    // 4. Reveal Choices
    console.log('🎭 Revealing choices...');
    await program.methods
      .revealChoice({ heads: {} }, new BN(playerASecret.toString()))
      .accounts({
        player: playerA.publicKey,
        game: gamePDA,
      })
      .signers([playerA])
      .rpc();

    await program.methods
      .revealChoice({ tails: {} }, new BN(playerBSecret.toString()))
      .accounts({
        player: playerB.publicKey,
        game: gamePDA,
      })
      .signers([playerB])
      .rpc();

    // 5. Verify Game Resolution
    console.log('🎲 Verifying resolution...');
    gameAccount = await program.account.game.fetch(gamePDA);
    expect(gameAccount.status).toBe({ resolved: {} });
    expect(gameAccount.winner).toBeDefined();
    expect(gameAccount.coinResult).toBeDefined();
    
    // Verify escrow is empty
    const escrowBalance = await connection.getBalance(escrowPDA);
    expect(escrowBalance).toBe(0);

    // Verify house fee was paid
    const houseFee = gameAccount.houseFee.toNumber();
    expect(houseFee).toBeGreaterThan(0);
    
    console.log('✅ Game completed successfully!');
    console.log(`🎲 Result: ${gameAccount.coinResult}`);
    console.log(`🏆 Winner: ${gameAccount.winner}`);
    console.log(`💰 House Fee: ${houseFee / LAMPORTS_PER_SOL} SOL`);
  });

  test('Game error cases', async () => {
    const betAmount = 0.1 * LAMPORTS_PER_SOL;

    // Test invalid bet amounts
    await expect(
      program.methods
        .createGame(new BN(gameId.toString()), new BN(0.0001 * LAMPORTS_PER_SOL))
        .accounts({
          playerA: playerA.publicKey,
          game: gamePDA,
          escrow: escrowPDA,
          houseWallet: new PublicKey(process.env.HOUSE_WALLET),
          systemProgram: SystemProgram.programId,
        })
        .signers([playerA])
        .rpc()
    ).rejects.toThrow('Bet amount is too low');

    // Test invalid commitment
    await program.methods
      .createGame(new BN(gameId.toString()), new BN(betAmount))
      .accounts({
        playerA: playerA.publicKey,
        game: gamePDA,
        escrow: escrowPDA,
        houseWallet: new PublicKey(process.env.HOUSE_WALLET),
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    await expect(
      program.methods
        .makeCommitment(new Array(32).fill(0))
        .accounts({
          player: playerA.publicKey,
          game: gamePDA,
        })
        .signers([playerA])
        .rpc()
    ).rejects.toThrow('Invalid commitment provided');

    // Test invalid reveal
    await program.methods
      .makeCommitment(Array.from(playerACommitment))
      .accounts({
        player: playerA.publicKey,
        game: gamePDA,
      })
      .signers([playerA])
      .rpc();

    await expect(
      program.methods
        .revealChoice({ heads: {} }, new BN(123456)) // Wrong secret
        .accounts({
          player: playerA.publicKey,
          game: gamePDA,
        })
        .signers([playerA])
        .rpc()
    ).rejects.toThrow('Invalid commitment');
  });

  test('Security validations', async () => {
    // Test commitment uniqueness
    const commit1 = generateCommitment('heads', generateSecret());
    const commit2 = generateCommitment('heads', generateSecret());
    expect(commit1).not.toEqual(commit2);

    // Test commitment irreversibility
    const secret = generateSecret();
    const commitment = generateCommitment('heads', secret);
    // Try to brute force a small range - should not find match
    let found = false;
    for (let i = 0n; i < 1000n; i++) {
      if (generateCommitment('heads', i).equals(commitment)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(false);

    // Test weak secrets rejection
    await program.methods
      .createGame(new BN(gameId.toString()), new BN(0.1 * LAMPORTS_PER_SOL))
      .accounts({
        playerA: playerA.publicKey,
        game: gamePDA,
        escrow: escrowPDA,
        houseWallet: new PublicKey(process.env.HOUSE_WALLET),
        systemProgram: SystemProgram.programId,
      })
      .signers([playerA])
      .rpc();

    await expect(
      program.methods
        .revealChoice({ heads: {} }, new BN(0))
        .accounts({
          player: playerA.publicKey,
          game: gamePDA,
        })
        .signers([playerA])
        .rpc()
    ).rejects.toThrow('Weak secret');
  });
});
