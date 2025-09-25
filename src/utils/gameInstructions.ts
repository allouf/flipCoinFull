import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { sha256 } from 'js-sha256';
import { PROGRAM_ID } from '../config/constants';

export type CoinSide = 'heads' | 'tails';

/**
 * Generate a cryptographically secure commitment for the commit-reveal scheme
 */
export function generateCommitment(choice: CoinSide, secret: bigint): Uint8Array {
  const choiceByte = choice === 'heads' ? 0 : 1;
  const secretBytes = new BN(secret.toString()).toArrayLike(Buffer, 'le', 8);
  
  // Create fixed-size data structure
  const data = Buffer.alloc(16);
  data.writeUInt8(choiceByte, 0);
  // 7 bytes of padding for alignment
  secretBytes.copy(data, 8);
  
  // Double hash for security
  const firstHash = sha256.arrayBuffer(data);
  const finalHash = sha256.arrayBuffer(new Uint8Array(firstHash));
  
  return new Uint8Array(finalHash);
}

/**
 * Generate a cryptographically secure random secret
 */
export function generateSecret(): bigint {
  // Generate a secure random 64-bit number
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  
  // Combine two 32-bit numbers into a 64-bit number
  const secret = (BigInt(array[0]) << 32n) | BigInt(array[1]);
  
  // Ensure it's not a weak secret (avoid 0, 1, or max values)
  if (secret === 0n || secret === 1n || secret === (2n ** 64n - 1n)) {
    return generateSecret(); // Recursively generate until we get a good one
  }
  
  return secret;
}

/**
 * Derive the Game PDA address
 */
export function deriveGamePDA(playerA: PublicKey, gameId: bigint): [PublicKey, number] {
  const gameIdBytes = new BN(gameId.toString()).toArrayLike(Buffer, 'le', 8);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('game'),
      playerA.toBuffer(),
      gameIdBytes,
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the Escrow PDA address
 */
export function deriveEscrowPDA(playerA: PublicKey, gameId: bigint): [PublicKey, number] {
  const gameIdBytes = new BN(gameId.toString()).toArrayLike(Buffer, 'le', 8);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      playerA.toBuffer(),
      gameIdBytes,
    ],
    PROGRAM_ID
  );
}

/**
 * Generate a unique game ID
 */
export function generateGameId(): bigint {
  const timestamp = BigInt(Date.now());
  const random = BigInt(Math.floor(Math.random() * 1000000));
  return (timestamp * 1000000n) + random;
}

/**
 * Create game instruction builder
 */
export async function buildCreateGameInstruction(
  program: Program,
  playerA: PublicKey,
  gameId: bigint,
  betAmount: number,
  houseWallet: PublicKey
) {
  const betAmountLamports = new BN(betAmount * 1e9); // Convert SOL to lamports
  const gameIdBN = new BN(gameId.toString());
  
  const [gamePDA] = deriveGamePDA(playerA, gameId);
  const [escrowPDA] = deriveEscrowPDA(playerA, gameId);
  
  return program.methods
    .createGame(gameIdBN, betAmountLamports)
    .accounts({
      playerA,
      game: gamePDA,
      escrow: escrowPDA,
      houseWallet,
      systemProgram: SystemProgram.programId,
    });
}

/**
 * Join game instruction builder
 */
export async function buildJoinGameInstruction(
  program: Program,
  playerB: PublicKey,
  gamePDA: PublicKey,
  escrowPDA: PublicKey
) {
  return program.methods
    .joinGame()
    .accounts({
      playerB,
      game: gamePDA,
      escrow: escrowPDA,
      systemProgram: SystemProgram.programId,
    });
}

/**
 * Make commitment instruction builder
 */
export async function buildMakeCommitmentInstruction(
  program: Program,
  player: PublicKey,
  gamePDA: PublicKey,
  commitment: Uint8Array
) {
  // Convert Uint8Array to the expected format
  const commitmentArray = Array.from(commitment);
  
  return program.methods
    .makeCommitment(commitmentArray)
    .accounts({
      player,
      game: gamePDA,
    });
}

/**
 * Reveal choice instruction builder
 */
export async function buildRevealChoiceInstruction(
  program: Program,
  player: PublicKey,
  gamePDA: PublicKey,
  choice: CoinSide,
  secret: bigint,
  houseWallet: PublicKey
) {
  const choiceEnum = choice === 'heads' ? { heads: {} } : { tails: {} };
  const secretBN = new BN(secret.toString());

  // Need to get game account to fetch playerA, playerB for auto-resolution
  const gameAccount = await program.account.game.fetch(gamePDA);
  const playerA = (gameAccount as any).playerA;
  const playerB = (gameAccount as any).playerB;
  const gameId = (gameAccount as any).gameId;
  const [escrowPDA] = deriveEscrowPDA(playerA, BigInt(gameId.toNumber()));

  return program.methods
    .revealChoice(choiceEnum, secretBN)
    .accounts({
      player,
      game: gamePDA,
      playerA,
      playerB,
      houseWallet,
      escrow: escrowPDA,
      systemProgram: SystemProgram.programId,
    });
}

/**
 * Validate bet amount according to smart contract limits
 */
export function validateBetAmount(betAmount: number): { isValid: boolean; error?: string } {
  const MIN_BET = 0.01; // 0.01 SOL
  const MAX_BET = 100; // 100 SOL
  
  if (betAmount < MIN_BET) {
    return {
      isValid: false,
      error: `Minimum bet amount is ${MIN_BET} SOL`,
    };
  }
  
  if (betAmount > MAX_BET) {
    return {
      isValid: false,
      error: `Maximum bet amount is ${MAX_BET} SOL`,
    };
  }
  
  return { isValid: true };
}

/**
 * Calculate house fee for a given bet amount
 */
export function calculateHouseFee(betAmount: number): number {
  const HOUSE_FEE_PERCENTAGE = 0.07; // 7%
  const totalPot = betAmount * 2;
  return totalPot * HOUSE_FEE_PERCENTAGE;
}

/**
 * Calculate winner payout after house fee
 */
export function calculateWinnerPayout(betAmount: number): number {
  const totalPot = betAmount * 2;
  const houseFee = calculateHouseFee(betAmount);
  return totalPot - houseFee;
}

/**
 * Format game status for display
 */
export function formatGameStatus(status: string): string {
  switch (status) {
    case 'WaitingForPlayer':
      return 'Waiting for Player';
    case 'PlayersReady':
      return 'Players Ready';
    case 'CommitmentsReady':
      return 'Commitments Ready';
    case 'RevealingPhase':
      return 'Revealing Phase';
    case 'Resolved':
      return 'Resolved';
    default:
      return status;
  }
}

/**
 * Convert lamports to SOL with proper formatting
 */
export function lamportsToSol(lamports: number | BN): number {
  const lamportsBN = typeof lamports === 'number' ? new BN(lamports) : lamports;
  return lamportsBN.toNumber() / 1e9;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): BN {
  return new BN(sol * 1e9);
}

/**
 * Cancel game instruction builder (for stuck games after 1 hour)
 */
export async function buildCancelGameInstruction(
  program: Program,
  canceller: PublicKey,
  gamePDA: PublicKey,
  houseWallet: PublicKey
) {
  // Need to get game account to fetch playerA, playerB for refunds
  const gameAccount = await program.account.game.fetch(gamePDA);
  const playerA = (gameAccount as any).playerA;
  const playerB = (gameAccount as any).playerB;
  const gameId = (gameAccount as any).gameId;
  const [escrowPDA] = deriveEscrowPDA(playerA, BigInt(gameId.toNumber()));

  return program.methods
    .cancelGame()
    .accounts({
      canceller,
      game: gamePDA,
      playerA,
      playerB,
      houseWallet,
      escrow: escrowPDA,
      systemProgram: SystemProgram.programId,
    });
}

/**
 * Manual resolve game instruction builder (for games stuck in revealing phase)
 */
export async function buildResolveGameManualInstruction(
  program: Program,
  resolver: PublicKey,
  gamePDA: PublicKey,
  houseWallet: PublicKey
) {
  // Need to get game account to fetch playerA, playerB for payouts
  const gameAccount = await program.account.game.fetch(gamePDA);
  const playerA = (gameAccount as any).playerA;
  const playerB = (gameAccount as any).playerB;
  const gameId = (gameAccount as any).gameId;
  const [escrowPDA] = deriveEscrowPDA(playerA, BigInt(gameId.toNumber()));

  return program.methods
    .resolveGameManual()
    .accounts({
      resolver,
      game: gamePDA,
      playerA,
      playerB,
      houseWallet,
      escrow: escrowPDA,
      systemProgram: SystemProgram.programId,
    });
}
