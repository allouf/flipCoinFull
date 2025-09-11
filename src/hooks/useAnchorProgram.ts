import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Program, AnchorProvider, BN, Idl,
} from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/coin_flipper.json';
import { PROGRAM_ID } from '../config/program';
import { retryTransaction, formatTransactionError } from '../utils/transaction';
import { checkSufficientBalance, formatInsufficientBalanceMessage } from '../utils/balanceValidation';

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

export const useAnchorProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState<Program | null>(null);
  const [isProgramReady, setIsProgramReady] = useState(false);

  // Use a ref to track initialization state to avoid dependency issues
  const initializationRef = useRef(false);

  useEffect(() => {
    if (!wallet || !wallet.publicKey) {
      setProgram(null);
      setIsProgramReady(false);
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

      // Only log initialization once per session
      if (!initializationRef.current) {
        console.log('Program initialized with ID:', PROGRAM_ID.toString());
        initializationRef.current = true;
      }

      setProgram(programInstance);
      setIsProgramReady(true);
    } catch (error) {
      console.error('Failed to initialize program:', error);
      setProgram(null);
      initializationRef.current = false;
      setIsProgramReady(false);
    }
  }, [connection, wallet]);

  const createRoom = useCallback(async (roomId: number, betAmountSol: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    // Check balance before attempting transaction
    console.log('Checking wallet balance before creating room...');
    const balanceCheck = await checkSufficientBalance(
      program.provider.connection,
      wallet.publicKey,
      betAmountSol,
      0.01, // Estimated transaction fee
    );

    if (!balanceCheck.hasSufficientBalance) {
      const errorMessage = formatInsufficientBalanceMessage(
        balanceCheck.currentBalance,
        balanceCheck.required,
        balanceCheck.shortage,
      );
      console.log('Insufficient balance detected:', balanceCheck);
      throw new Error(errorMessage);
    }

    console.log('Balance check passed:', balanceCheck);
    const betAmount = new BN(betAmountSol * LAMPORTS_PER_SOL);
    const roomIdBN = new BN(roomId);

    // Derive PDAs
    console.log('Creating room with:');
    console.log('- Program ID:', program.programId.toString());
    console.log('- Creator:', wallet.publicKey.toString());
    console.log('- Room ID:', roomId);

    const [gameRoomPda] = deriveGameRoomPDA(program.programId, wallet.publicKey, roomId);
    // Derive escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('escrow'),
        wallet.publicKey.toBuffer(),
        roomIdBN.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    );

    console.log('- Game Room PDA:', gameRoomPda.toString());
    console.log('- Escrow PDA:', escrowPda.toString());

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .createRoom(roomIdBN, betAmount)
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
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
      // Handle user rejection gracefully
      if (error instanceof Error && error.message.includes('User rejected')) {
        console.log('Transaction cancelled by user');
        throw new Error('Transaction cancelled');
      }
      console.error('Error creating room:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  }, [program, wallet.publicKey]);

  const joinRoom = useCallback(async (roomId: number, _betAmountSol: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    console.log(`Looking for room ${roomId}...`);
    let gameRoomPda: PublicKey;
    try {
      // Use connection to get program accounts
      const { connection: conn } = program.provider;
      console.log('Fetching all program accounts...');
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      console.log(`Found ${accounts.length} total accounts`);

      const allRooms = accounts.map((account) => {
        try {
          // IMPORTANT: Anchor account discriminators use the exact IDL name (e.g., "GameRoom")
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
          console.log(`Decoded room: ID=${decoded.roomId?.toNumber()}, PDA=${account.pubkey.toString()}`);
          return { publicKey: account.pubkey, account: decoded };
        } catch (e) {
          console.log(`Failed to decode account ${account.pubkey.toString()}: ${e}`);
          return null;
        }
      }).filter((room) => room !== null);

      console.log(`Successfully decoded ${allRooms.length} game rooms`);
      console.log('Available rooms:', allRooms.map((r: any) => r.account.roomId?.toNumber()));

      const targetRoom = allRooms.find(
        (room: any) => room.account?.roomId?.toNumber() === roomId,
      );

      if (!targetRoom) {
        throw new Error(`Room ${roomId} not found. Available rooms: ${allRooms.map((r: any) => r.account.roomId?.toNumber()).join(', ')}`);
      }

      console.log(`Found target room: ${targetRoom.publicKey.toString()}`);
      gameRoomPda = targetRoom.publicKey;
    } catch (error) {
      console.error(`Failed to find room ${roomId}:`, error);
      throw new Error(`Failed to find room ${roomId}: ${error}`);
    }

    // Get the room data to derive escrow PDA - manually fetch and decode
    const accountInfo = await program.provider.connection.getAccountInfo(gameRoomPda);
    if (!accountInfo) {
      throw new Error('Room account not found');
    }
    const roomData = program.coder.accounts.decode('GameRoom', accountInfo.data);
    const roomIdBN = roomData.roomId as BN;
    const creatorKey = roomData.creator as PublicKey;

    // Extract bet amount for balance validation
    const betAmountBN = roomData.betAmount as BN;
    const roomBetAmount = betAmountBN.toNumber() / 1_000_000_000; // Convert to SOL
    // Check balance before attempting to join
    console.log('Checking wallet balance before joining room...');
    const balanceCheck = await checkSufficientBalance(
      program.provider.connection,
      wallet.publicKey,
      roomBetAmount,
      0.01, // Estimated transaction fee
    );

    if (!balanceCheck.hasSufficientBalance) {
      const errorMessage = formatInsufficientBalanceMessage(
        balanceCheck.currentBalance,
        balanceCheck.required,
        balanceCheck.shortage,
      );
      console.log('Insufficient balance detected:', balanceCheck);
      throw new Error(errorMessage);
    }

    console.log('Balance check passed for joining room:', balanceCheck);
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('escrow'),
        creatorKey.toBuffer(),
        roomIdBN.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId,
    );

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .joinRoom()
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
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
  }, [program, wallet.publicKey]);

  const makeSelection = useCallback(async (roomId: number, selection: 'heads' | 'tails') => {
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
          // Use correct IDL account name for discriminator derivation
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
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

    // Try object-style enum variant (Borsh format)
    const coinSide = selection === 'heads' ? { heads: {} } : { tails: {} };
    console.log('Making selection with coinSide:', coinSide, 'for room:', roomId);
    console.log('CoinSide object keys:', Object.keys(coinSide));

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
  }, [program, wallet.publicKey]);

  const fetchGameRoom = useCallback(async (roomId: number): Promise<GameRoom | null> => {
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
          // Use correct IDL account name for discriminator derivation
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
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
  }, [program]);

  const fetchAllGameRooms = useCallback(async (): Promise<GameRoom[]> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    console.log('Starting fetchAllGameRooms...');
    console.log('Program ID:', PROGRAM_ID.toString());
    console.log('Connection endpoint:', program.provider.connection.rpcEndpoint);

    try {
      // First, verify connection is working
      const { connection: conn } = program.provider;
      console.log('Testing connection...');
      const slot = await conn.getSlot();
      console.log(`Connection working, current slot: ${slot}`);

      // Now try to get program accounts with a shorter timeout
      console.log('Fetching program accounts...');
      const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
      });

      console.log(`Found ${accounts.length} total accounts for program`);

      if (accounts.length === 0) {
        console.log('No game rooms found - this is normal if no games have been created yet');
        return [];
      }

      // Process the accounts
      const gameRooms: GameRoom[] = [];
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        try {
          console.log(`Processing account ${i + 1}/${accounts.length}: ${account.pubkey.toString()}`);
          console.log(`Account data length: ${account.account.data.length} bytes`);

          // Try to decode as GameRoom using exact IDL account name
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
          console.log(`Successfully decoded game room with ID: ${decoded.roomId?.toString()}`);
          const statusKeys = Object.keys(decoded.status || {});
          console.log('Room status:', decoded.status);
          console.log('Room status keys:', statusKeys); // Show actual key names
          if (statusKeys.length > 0) {
            console.log('Primary status key:', statusKeys[0]);
          }
          console.log('Room creator:', decoded.creator?.toString());
          gameRooms.push(decoded);
        } catch (decodeError) {
          const errorMessage = decodeError instanceof Error ? decodeError.message : 'Unknown decode error';
          console.warn(`Failed to decode account ${account.pubkey.toString()} as GameRoom:`, errorMessage);

          // Show raw account data for debugging
          console.log('Raw account data (first 50 bytes):', account.account.data.slice(0, 50));

          // Try to decode as other account types
          try {
            const globalState = program.coder.accounts.decode('GlobalState', account.account.data);
            console.log('Account is GlobalState:', globalState);
          } catch (globalError) {
            console.log('Not GlobalState either. Account might be different type or corrupted.');
          }
        }
      }

      console.log(`Successfully processed ${gameRooms.length} game rooms`);
      return gameRooms;
    } catch (error: any) {
      console.error('Error in fetchAllGameRooms:', error);

      // Handle specific error cases
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        console.warn('Rate limited - please wait a moment and try again');
        throw new Error('Network is busy. Please wait a moment and try again.');
      }

      if (error.message?.includes('timeout') || error.code === 'NETWORK_ERROR') {
        console.warn('Network timeout - connection may be slow');
        throw new Error('Network connection is slow. Please check your connection and try again.');
      }

      // For other errors, return empty array so the UI doesn't hang
      console.warn('Returning empty array due to error:', error.message);
      return [];
    }
  }, [program]);

  const handleTimeout = useCallback(async (roomId: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    console.log(`Handling timeout for room ${roomId}...`);
    let gameRoomPda: PublicKey;

    try {
      // Find the room first
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const allRooms = accounts.map((account) => {
        try {
          // Use correct IDL account name for discriminator derivation
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
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
      const roomData = targetRoom.account as any;

      // Derive escrow PDA
      const roomIdBN = roomData.roomId as BN;
      const creatorKey = roomData.creator as PublicKey;
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          creatorKey.toBuffer(),
          roomIdBN.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId,
      );

      // Get player addresses - player2 might be null if room was never joined
      const player1 = roomData.player1 as PublicKey;
      const player2 = roomData.player2 as PublicKey | null;

      console.log('Calling handleTimeout with:');
      console.log('- Game Room PDA:', gameRoomPda.toString());
      console.log('- Escrow PDA:', escrowPda.toString());
      console.log('- Player 1:', player1.toString());
      console.log('- Player 2:', player2?.toString() || 'None');

      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .handleTimeout()
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
            player1,
            player2: player2 || SystemProgram.programId, // Use system program if no player2
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          }),
        { maxRetries: 3, retryDelay: 1000 },
      );

      console.log('Timeout handled successfully:', tx);
      return { tx, gameRoomPda };
    } catch (error) {
      console.error('Error handling timeout:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  }, [program, wallet.publicKey]);

  return {
    program,
    isProgramReady,
    createRoom,
    joinRoom,
    makeSelection,
    fetchGameRoom,
    fetchAllGameRooms,
    handleTimeout,
  };
};
