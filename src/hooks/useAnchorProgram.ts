import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Program, AnchorProvider, BN, Idl,
} from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/coin_flipper.json';
import { PROGRAM_ID } from '../config/program';
import { retryTransaction, formatTransactionError } from '../utils/transaction';

// Type definitions for the program
export interface GameRoom {
  roomId: BN;
  creator: PublicKey;
  player1: PublicKey;
  player2: PublicKey;
  betAmount: BN;
  status:
  | { waitingForPlayer?: Record<string, never> }
  | { selectionsPending?: Record<string, never> }
  | { resolving?: Record<string, never> }
  | { completed?: Record<string, never> }
  | { cancelled?: Record<string, never> };
  player1Selection:
  | { heads?: Record<string, never> }
  | { tails?: Record<string, never> }
  | null;
  player2Selection:
  | { heads?: Record<string, never> }
  | { tails?: Record<string, never> }
  | null;
  createdAt: BN;
  selectionDeadline: BN;
  vrfResult: number[] | null;
  vrfStatus:
  | { none?: Record<string, never> }
  | { pending?: Record<string, never> }
  | { fulfilled?: Record<string, never> }
  | { failed?: Record<string, never> };
  winner: PublicKey | null;
  totalPot: BN;
  bump: number;
  escrowBump: number;
}

export interface GlobalState {
  authority: PublicKey;
  houseWallet: PublicKey;
  houseFeeBps: number;
  totalGames: BN;
  totalVolume: BN;
  isPaused: boolean;
  bump: number;
}

// Helper function to derive game room PDA
const deriveGameRoomPDA = (
  programId: PublicKey,
  creatorKey: PublicKey,
  roomId: number,
): [PublicKey, number] => {
  const roomIdBN = new BN(roomId);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('game_room'),
      creatorKey.toBuffer(),
      roomIdBN.toArrayLike(Buffer, 'le', 8),
    ],
    programId,
  );
};

// Helper function to derive player stats PDA
const derivePlayerStatsPDA = (
  programId: PublicKey,
  playerKey: PublicKey,
): [PublicKey, number] => PublicKey.findProgramAddressSync(
  [
    Buffer.from('player_stats'),
    playerKey.toBuffer(),
  ],
  programId,
);

export const useAnchorProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!wallet || !wallet.publicKey) {
      setProgram(null);
      return;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
          skipPreflight: false,
          maxRetries: 3,
        },
      );

      // Try to create program instance with minimal IDL processing
      const programInstance = new Program(
        idl as Idl,
        PROGRAM_ID,
        provider,
      );

      console.log('Program initialized with ID:', PROGRAM_ID.toString());
      console.log('IDL metadata address:', idl.metadata?.address);
      console.log('Program instance ID:', programInstance.programId.toString());

      setProgram(programInstance);
    } catch (error) {
      console.error('Failed to initialize program:', error);
      setProgram(null);
    }
  }, [connection, wallet]);

  const createRoom = async (roomId: number, betAmountSol: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    const betAmount = new BN(betAmountSol * LAMPORTS_PER_SOL);
    const roomIdBN = new BN(roomId);

    // Derive PDAs
    console.log('Creating room with:');
    console.log('- Program ID:', program.programId.toString());
    console.log('- Creator:', wallet.publicKey.toString());
    console.log('- Room ID:', roomId);

    const [gameRoomPda] = deriveGameRoomPDA(program.programId, wallet.publicKey, roomId);
    const [creatorStatsPda] = derivePlayerStatsPDA(program.programId, wallet.publicKey);

    // Debug the actual seed generation
    const seeds = [
      Buffer.from('game_room'),
      wallet.publicKey.toBuffer(),
      roomIdBN.toArrayLike(Buffer, 'le', 8),
    ];
    console.log('- Seeds used for PDA:', seeds.map((s) => s.toString('hex')));
    console.log('- Room ID as BN:', roomIdBN.toString());
    console.log('- Room ID as Buffer (hex):', roomIdBN.toArrayLike(Buffer, 'le', 8).toString('hex'));
    console.log('- Game Room PDA:', gameRoomPda.toString());
    console.log('- Creator Stats PDA:', creatorStatsPda.toString());

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .createRoom(roomIdBN, betAmount)
          .accounts({
            gameRoom: gameRoomPda,
            creatorStats: creatorStatsPda,
            creator: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          }),
        { maxRetries: 3, retryDelay: 1000 },
      );

      return { tx, gameRoomPda };
    } catch (error) {
      console.error('Error creating room:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  };

  const joinRoom = async (roomId: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    // First, we need to find the correct PDA by trying different potential creators
    // For now, let's get all game rooms and find the one with matching roomId
    let gameRoomPda: PublicKey;

    try {
      // Use connection to get program accounts since typed accounts aren't available
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const allRooms = accounts.map((account) => {
        try {
          const decoded = program.coder.accounts.decode('gameRoom', account.account.data);
          return { publicKey: account.pubkey, account: decoded };
        } catch {
          return null;
        }
      }).filter((room) => room !== null);
      const targetRoom = allRooms.find(
        (room: any) => room.account?.roomId?.toNumber() === roomId,
      );

      if (!targetRoom) {
        throw new Error(`Room ${roomId} not found`);
      }

      gameRoomPda = targetRoom.publicKey;
    } catch (error) {
      throw new Error(`Failed to find room ${roomId}: ${error}`);
    }

    const [joinerStatsPda] = derivePlayerStatsPDA(program.programId, wallet.publicKey);

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .joinRoom()
          .accounts({
            gameRoom: gameRoomPda,
            joinerStats: joinerStatsPda,
            joiner: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          }),
        { maxRetries: 3, retryDelay: 1000 },
      );

      return { tx, gameRoomPda };
    } catch (error) {
      console.error('Error joining room:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  };

  const makeSelection = async (roomId: number, selection: 'heads' | 'tails') => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    // Find the correct PDA by getting all game rooms and finding the one with matching roomId
    let gameRoomPda: PublicKey;

    try {
      // Use connection to get program accounts since typed accounts aren't available
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const allRooms = accounts.map((account) => {
        try {
          const decoded = program.coder.accounts.decode('gameRoom', account.account.data);
          return { publicKey: account.pubkey, account: decoded };
        } catch {
          return null;
        }
      }).filter((room) => room !== null);
      const targetRoom = allRooms.find(
        (room: any) => room.account?.roomId?.toNumber() === roomId,
      );

      if (!targetRoom) {
        throw new Error(`Room ${roomId} not found`);
      }

      gameRoomPda = targetRoom.publicKey;
    } catch (error) {
      throw new Error(`Failed to find room ${roomId}: ${error}`);
    }

    const coinSide = selection === 'heads' ? { heads: {} } : { tails: {} };

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .makeSelection(coinSide)
          .accounts({
            gameRoom: gameRoomPda,
            player: wallet.publicKey!,
          })
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          }),
        { maxRetries: 3, retryDelay: 1000 },
      );

      return { tx, gameRoomPda };
    } catch (error) {
      console.error('Error making selection:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  };

  const fetchGameRoom = async (roomId: number): Promise<GameRoom | null> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    try {
      // Get all game rooms and find the one with matching roomId
      // Use connection to get program accounts since typed accounts aren't available
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const allRooms = accounts.map((account) => {
        try {
          const decoded = program.coder.accounts.decode('gameRoom', account.account.data);
          return { publicKey: account.pubkey, account: decoded };
        } catch {
          return null;
        }
      }).filter((room) => room !== null);
      const targetRoom = allRooms.find(
        (room: any) => room.account?.roomId?.toNumber() === roomId,
      );

      if (!targetRoom) {
        console.error(`Room ${roomId} not found`);
        return null;
      }

      return targetRoom.account as any;
    } catch (error) {
      console.error('Error fetching game room:', error);
      return null;
    }
  };

  const fetchAllGameRooms = async (): Promise<GameRoom[]> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    try {
      // Use connection to get program accounts since typed accounts aren't available
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const gameRooms = accounts.map((account) => {
        try {
          const decoded = program.coder.accounts.decode('gameRoom', account.account.data);
          return decoded;
        } catch {
          return null;
        }
      }).filter((room) => room !== null);

      return gameRooms;
    } catch (error) {
      console.error('Error fetching all game rooms:', error);
      return [];
    }
  };

  return {
    program,
    createRoom,
    joinRoom,
    makeSelection,
    fetchGameRoom,
    fetchAllGameRooms,
  };
};
