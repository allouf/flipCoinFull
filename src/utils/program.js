import * as anchor from '@project-serum/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl.json';
import config from '../config.json';

// Program setup
const PROGRAM_ID = new PublicKey(config.programId);
const HOUSE_WALLET = new PublicKey(config.houseWallet);

export class CoinFlipperProgram {
  constructor(wallet, connection) {
    this.wallet = wallet;
    this.connection = connection;
    this.provider = new anchor.AnchorProvider(connection, wallet, {});
    this.program = new anchor.Program(idl, PROGRAM_ID, this.provider);
  }

  // Generate game PDA
  getGamePDA(playerA, gameId) {
    const [gamePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        playerA.toBuffer(),
        new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)
      ],
      PROGRAM_ID
    );
    return gamePDA;
  }

  // Generate escrow PDA
  getEscrowPDA(playerA, gameId) {
    const [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        playerA.toBuffer(),
        new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)
      ],
      PROGRAM_ID
    );
    return escrowPDA;
  }

  // Create a new game
  async createGame(gameId, betAmountSOL, choice) {
    const betAmount = new anchor.BN(betAmountSOL * LAMPORTS_PER_SOL);
    const playerA = this.wallet.publicKey;
    
    const gamePDA = this.getGamePDA(playerA, gameId);
    const escrowPDA = this.getEscrowPDA(playerA, gameId);
    
    const choiceEnum = choice === 'heads' ? { heads: {} } : { tails: {} };
    
    try {
      const tx = await this.program.methods
        .createGame(new anchor.BN(gameId), betAmount, choiceEnum)
        .accounts({
          game: gamePDA,
          escrow: escrowPDA,
          playerA: playerA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Game created:", tx);
      return { 
        success: true, 
        txId: tx, 
        gameId, 
        gamePDA: gamePDA.toString(),
        escrowPDA: escrowPDA.toString()
      };
    } catch (error) {
      console.error("❌ Create game failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Join an existing game
  async joinGame(gameAddress, choice) {
    const gamePDA = new PublicKey(gameAddress);
    const gameAccount = await this.program.account.game.fetch(gamePDA);
    
    const escrowPDA = this.getEscrowPDA(gameAccount.playerA, gameAccount.gameId);
    const choiceEnum = choice === 'heads' ? { heads: {} } : { tails: {} };
    
    try {
      const tx = await this.program.methods
        .joinGame(choiceEnum)
        .accounts({
          game: gamePDA,
          escrow: escrowPDA,
          playerA: gameAccount.playerA,
          playerB: this.wallet.publicKey,
          houseWallet: HOUSE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Game joined and resolved:", tx);
      return { success: true, txId: tx };
    } catch (error) {
      console.error("❌ Join game failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Get game state
  async getGame(gameAddress) {
    try {
      const gamePDA = new PublicKey(gameAddress);
      const gameAccount = await this.program.account.game.fetch(gamePDA);
      
      return {
        success: true,
        game: {
          gameId: gameAccount.gameId.toString(),
          playerA: gameAccount.playerA.toString(),
          playerB: gameAccount.playerB.toString(),
          betAmount: gameAccount.betAmount.toNumber() / LAMPORTS_PER_SOL,
          playerAChoice: Object.keys(gameAccount.playerAChoice)[0],
          playerBChoice: Object.keys(gameAccount.playerBChoice)[0],
          status: Object.keys(gameAccount.status)[0],
          createdAt: new Date(gameAccount.createdAt.toNumber() * 1000),
          timeoutAt: new Date(gameAccount.timeoutAt.toNumber() * 1000),
          winner: gameAccount.winner.toString(),
          resolved: gameAccount.resolved,
        }
      };
    } catch (error) {
      console.error("❌ Get game failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Get all games for a player
  async getPlayerGames(playerAddress) {
    try {
      const player = new PublicKey(playerAddress);
      const games = await this.program.account.game.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: player.toBase58(),
          },
        },
      ]);
      
      return {
        success: true,
        games: games.map(g => ({
          address: g.publicKey.toString(),
          gameId: g.account.gameId.toString(),
          playerA: g.account.playerA.toString(),
          playerB: g.account.playerB.toString(),
          betAmount: g.account.betAmount.toNumber() / LAMPORTS_PER_SOL,
          status: Object.keys(g.account.status)[0],
          resolved: g.account.resolved,
        }))
      };
    } catch (error) {
      console.error("❌ Get player games failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Listen for events
  addEventListener(eventName, callback) {
    this.program.addEventListener(eventName, callback);
  }

  // Resolve timeout
  async resolveTimeout(gameAddress) {
    const gamePDA = new PublicKey(gameAddress);
    const gameAccount = await this.program.account.game.fetch(gamePDA);
    const escrowPDA = this.getEscrowPDA(gameAccount.playerA, gameAccount.gameId);
    
    try {
      const tx = await this.program.methods
        .resolveTimeout()
        .accounts({
          game: gamePDA,
          escrow: escrowPDA,
          playerA: gameAccount.playerA,
          resolver: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Timeout resolved:", tx);
      return { success: true, txId: tx };
    } catch (error) {
      console.error("❌ Resolve timeout failed:", error);
      return { success: false, error: error.message };
    }
  }
}

export { PROGRAM_ID, HOUSE_WALLET };
