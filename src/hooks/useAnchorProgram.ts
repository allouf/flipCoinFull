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
import { PROGRAM_ID, getExplorerUrl } from '../config/program';
import { retryTransaction, formatTransactionError } from '../utils/transaction';
import { checkSufficientBalance, formatInsufficientBalanceMessage } from '../utils/balanceValidation';
import { rpcManager } from '../utils/rpcManager';

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
  // Note: selectionDeadline removed from current program version
  vrfResult: number[] | null;
  // Note: vrfStatus also removed from current program version - using simple auto-resolution
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

// Helper function to get room status as a string
const getRoomStatusString = (status: any): string => {
  if (!status) return 'Unknown';
  if (status.waitingForPlayer) return 'WaitingForPlayer';
  if (status.selectionsPending) return 'SelectionsPending';
  if (status.resolving) return 'Resolving';
  if (status.completed) return 'Completed';
  if (status.cancelled) return 'Cancelled';
  return 'Unknown';
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

    // Derive global state PDA (required by CreateRoom struct)
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      program.programId,
    );

    console.log('- Game Room PDA:', gameRoomPda.toString());
    console.log('- Escrow PDA:', escrowPda.toString());
    console.log('- Global State PDA:', globalStatePda.toString());

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .createRoom(roomIdBN, betAmount)
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
            globalState: globalStatePda,
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

    // Derive global state PDA (required by JoinRoom struct)
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      program.programId,
    );

    console.log('Joining room with:');
    console.log('- Game Room PDA:', gameRoomPda.toString());
    console.log('- Escrow PDA:', escrowPda.toString());
    console.log('- Global State PDA:', globalStatePda.toString());

    try {
      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .joinRoom()
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
            globalState: globalStatePda,
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
      const roomData = targetRoom.account as any;

      // Check if room is in correct state for making selections
      const roomStatus = roomData.status;
      console.log('Current room status before selection:', getRoomStatusString(roomStatus));

      if (!roomStatus || !roomStatus.selectionsPending) {
        const statusName = getRoomStatusString(roomStatus);

        // Clear cache for this room since we have stale data
        console.log('⚠️ Room state mismatch detected, clearing cache for room:', roomId);
        rpcManager.clearCache();

        // If game is already resolving, both players have selected - show appropriate message
        if (roomStatus && roomStatus.resolving) {
          throw new Error(`Cannot make selection: Both players have already selected. Game is now resolving. Current status: ${statusName}`);
        }

        // For other invalid states
        throw new Error(`Cannot make selection: Room status must be 'SelectionsPending' but is currently '${statusName}'. This room may not be ready for selections.`);
      }

      // Check if this player has already made a selection
      const isPlayer1 = roomData.player1 && wallet.publicKey && roomData.player1.equals(wallet.publicKey);
      const isPlayer2 = roomData.player2 && wallet.publicKey && roomData.player2.equals(wallet.publicKey);
      
      console.log('=== GAME ROOM STATE DEBUG ===');
      console.log('Room Status:', getRoomStatusString(roomStatus));
      console.log('Player 1:', roomData.player1?.toString());
      console.log('Player 2:', roomData.player2?.toString());
      console.log('Current wallet:', wallet.publicKey?.toString());
      console.log('Is Player 1:', isPlayer1);
      console.log('Is Player 2:', isPlayer2);
      console.log('Player 1 selection:', roomData.player1Selection);
      console.log('Player 2 selection:', roomData.player2Selection);
      console.log('Room created at:', new Date(roomData.createdAt?.toNumber() * 1000));
      // Note: selectionDeadline and vrfStatus fields removed from current program version
      console.log('Winner:', roomData.winner?.toString() || 'None');
      console.log('Total pot:', roomData.totalPot?.toNumber() / 1_000_000_000, 'SOL');
      console.log('=== END GAME ROOM STATE DEBUG ===');

      if (isPlayer1 && roomData.player1Selection !== null) {
        throw new Error('Cannot make selection: You have already made your selection.');
      }

      if (isPlayer2 && roomData.player2Selection !== null) {
        throw new Error('Cannot make selection: You have already made your selection.');
      }
    } catch (error) {
      // If this is already one of our formatted error messages, just re-throw it
      if (error instanceof Error && (
        error.message.includes('Cannot make selection:')
        || error.message.includes('Room ${roomId} not found')
      )) {
        throw error;
      }
      // Otherwise, wrap in a generic validation error
      throw new Error(`Failed to validate room state: ${error}`);
    }

    // Derive global state PDA
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      PROGRAM_ID,
    );

    // Use correct lowercase enum format for Anchor serialization
    // Anchor expects lowercase variant names despite IDL showing capitalized names
    const coinSide = selection === 'heads' ? { heads: {} } : { tails: {} };
    console.log(`Making ${selection} selection using format: ${JSON.stringify(coinSide)}`);

    // Try different enum serialization formats if the first attempt fails
    const enumFormats = [
      selection === 'heads' ? { heads: {} } : { tails: {} },     // Lowercase (most common)
      selection === 'heads' ? { Heads: {} } : { Tails: {} },     // Capitalized (IDL style)
      selection === 'heads' ? 'heads' : 'tails',                // String format
      selection === 'heads' ? 0 : 1,                            // Numeric format
    ];
    
    let lastError: Error | null = null;
    
    for (let formatIndex = 0; formatIndex < enumFormats.length; formatIndex++) {
      const coinSide = enumFormats[formatIndex];
      console.log(`Attempting selection with format ${formatIndex + 1}/${enumFormats.length}: ${JSON.stringify(coinSide)}`);
      
      try {
        // Clear cache and get fresh room data before each attempt
        if (formatIndex > 0) {
          console.log(`🔄 Clearing cache before format ${formatIndex + 1} attempt`);
          rpcManager.clearCache();
          // Brief delay to ensure fresh state
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Get room data to extract required account addresses
        const room = await fetchGameRoom(roomId, true);
        if (!room) {
          throw new Error(`Room ${roomId} not found for selection`);
        }
        
        // Double-check account state is still valid before transaction
        console.log(`🔍 Validating room state for format ${formatIndex + 1}...`);
        if (!(room as any).status?.selectionsPending) {
          throw new Error(`Room state changed: no longer in SelectionsPending state`);
        }

      // Derive escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          (room as any).creator.toBuffer(),
          new BN(roomId).toArrayLike(Buffer, 'le', 8),
        ],
        PROGRAM_ID,
      );

      // Get global state to find house wallet
      const { connection: conn } = program.provider;
      const globalStateInfo = await conn.getAccountInfo(globalStatePda);
      if (!globalStateInfo) {
        throw new Error('Global state account not found');
      }
      const globalStateData = program.coder.accounts.decode('GlobalState', globalStateInfo.data);
      const houseWallet = globalStateData.houseWallet as PublicKey;

        // Create a transaction builder that fetches fresh account data on each attempt
        const buildTransactionWithFreshData = async () => {
          // Force fresh account data fetch before building transaction
          console.log(`🔄 Fetching fresh account data for transaction attempt...`);
          
          // Clear cache and get absolutely fresh room data
          rpcManager.clearCache();
          const freshRoom = await fetchGameRoom(roomId, true);
          if (!freshRoom) {
            throw new Error(`Room ${roomId} not found during fresh data fetch`);
          }
          
          // Get fresh global state data
          const { connection: freshConn } = program.provider;
          const freshGlobalStateInfo = await freshConn.getAccountInfo(globalStatePda);
          if (!freshGlobalStateInfo) {
            throw new Error('Global state account not found during fresh fetch');
          }
          const freshGlobalStateData = program.coder.accounts.decode('GlobalState', freshGlobalStateInfo.data);
          const freshHouseWallet = freshGlobalStateData.houseWallet as PublicKey;
          
          // Derive fresh escrow PDA
          const [freshEscrowPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('escrow'),
              (freshRoom as any).creator.toBuffer(),
              new BN(roomId).toArrayLike(Buffer, 'le', 8),
            ],
            PROGRAM_ID,
          );
          
          console.log(`🕵️ Using fresh account data: Room=${gameRoomPda.toString().slice(-8)}, Escrow=${freshEscrowPda.toString().slice(-8)}`);
          
          return program.methods
            .makeSelection(coinSide)
            .accounts({
              gameRoom: gameRoomPda,
              globalState: globalStatePda,
              escrowAccount: freshEscrowPda,
              player1: (freshRoom as any).player1,
              player2: (freshRoom as any).player2,
              houseWallet: freshHouseWallet,
              player: wallet.publicKey!,
              systemProgram: SystemProgram.programId,
            })
            .rpc({
              commitment: 'confirmed',
              preflightCommitment: 'confirmed',
              skipPreflight: false,
            });
        };
        
        // Execute transaction with fresh data rebuilding on each retry
        const tx = await retryTransaction(
          program.provider.connection,
          buildTransactionWithFreshData,
          { maxRetries: 3, retryDelay: 1500 }, // Increased retries and delay for AccountDidNotSerialize
        );

        // Success! Log which format worked
        console.log(`✅ Selection successful with format ${formatIndex + 1}: ${JSON.stringify(coinSide)}`);
        return { tx, gameRoomPda };
        
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Format ${formatIndex + 1} failed: ${lastError.message}`);
        
        // Check for different types of retryable enum/serialization errors
        const isEnumError = 
          lastError.message.includes('unable to infer src variant') ||
          lastError.message.includes('Invalid enum variant') ||
          lastError.message.includes('AccountDidNotSerialize') ||
          lastError.message.includes('Failed to serialize') ||
          lastError.message.includes('3004'); // AccountDidNotSerialize error code
        
        // If this is not an enum/serialization error, don't try other formats
        if (!isEnumError) {
          console.log('🛑 Non-enum/serialization error detected, stopping format attempts');
          console.log('Error type:', typeof lastError, lastError.constructor.name);
          break;
        }
        
        console.log(`🔄 Enum/serialization error detected, trying next format...`);
        // Continue to next format
        continue;
      }
    }
    
    // All formats failed, throw the last error
    if (lastError) {
      console.error('\n=== ALL ENUM FORMATS FAILED ===');
      console.error('Original selection:', selection);
      console.error('Tried formats:', enumFormats.length);
      console.error('Final error:', lastError.message);
      
      // Provide comprehensive guidance based on error type
      if (lastError.message.includes('unable to infer src variant')) {
        console.error('\n🚨 ENUM SERIALIZATION ISSUE PERSISTS!');
        console.error('This suggests the IDL definition may be outdated or incompatible.');
        console.error('\nRecommendations:');
        console.error('1. Regenerate IDL from the deployed program');
        console.error('2. Check if the program was redeployed with different enum structure');
        console.error('3. Verify the Anchor version compatibility');
      } else if (lastError.message.includes('insufficient')) {
        console.error('\n💰 INSUFFICIENT BALANCE ERROR');
        console.error('User needs more SOL for transaction fees and/or bet amount.');
      } else {
        console.error('\n⚠️ OTHER TRANSACTION ERROR');
        console.error('This may be a network issue, account constraint violation, or program logic error.');
      }
      
      console.error('=== END ERROR DEBUG ===\n');
      
      const formattedError = new Error(formatTransactionError(lastError));
      throw formattedError;
    }
    
    // This should never be reached, but just in case
    throw new Error('Unknown error occurred during selection - no formats were attempted');
  }, [program, wallet.publicKey]);

  const fetchAllGameRooms = useCallback(async (options: { userInitiated?: boolean; priority?: 'low' | 'normal' | 'high' } = {}): Promise<GameRoom[]> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    const { userInitiated = false, priority = 'normal' } = options;
    const requestKey = 'fetchAllGameRooms';

    return rpcManager.execute(requestKey, async () => {
      console.log('🚀 Starting optimized fetchAllGameRooms...');
      const { connection: conn } = program.provider;

      // Get program accounts efficiently
      const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
        encoding: 'base64',
      });

      console.log(`📊 Found ${accounts.length} total accounts for program`);

      if (accounts.length === 0) {
        console.log('ℹ️ No game rooms found - this is normal for new programs');
        return [];
      }

      // Process the accounts efficiently
      const gameRooms: GameRoom[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const account of accounts) {
        try {
          // Try to decode as GameRoom using exact IDL account name
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
          gameRooms.push(decoded);
        } catch (decodeError) {
          // Skip non-GameRoom accounts (like GlobalState) silently
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      console.log(`✅ Successfully processed ${gameRooms.length} game rooms`);
      return gameRooms;
    }, {
      ttl: userInitiated ? 8000 : 15000, // 8s for user actions, 15s for background - much more responsive
      priority,
      userInitiated,
      useStale: false, // Never use stale data for game rooms - too critical for real-time updates
    });
  }, [program]);

  const fetchGameRoom = useCallback(async (roomId: number, userInitiated = false): Promise<GameRoom | null> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    const requestKey = `fetchGameRoom-${roomId}`;

    try {
      return await rpcManager.execute(requestKey, async () => {
        // Get all game rooms and find the one with matching roomId
        const allRooms = await fetchAllGameRooms({ userInitiated });
        const targetRoom = allRooms.find((room: any) => room.roomId?.toNumber() === roomId);

        if (!targetRoom) {
          console.warn(`Room ${roomId} not found`);
          return null;
        }

        return targetRoom;
      }, {
        ttl: userInitiated ? 2000 : 3000, // 2s for user actions, 3s for background - extremely responsive
        priority: userInitiated ? 'high' : 'normal',
        userInitiated,
        useStale: false, // Never use stale data for game room updates - too critical
      });
    } catch (error) {
      console.error('Error fetching game room:', error);
      return null;
    }
  }, [program, fetchAllGameRooms]);

  const resolveGame = useCallback(async (roomId: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    console.log(`Resolving game for room ${roomId}...`);
    let gameRoomPda: PublicKey;

    try {
      // Find the room first with enhanced validation
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
        encoding: 'base64',
      });

      console.log(`🔍 Found ${accounts.length} program accounts to scan`);

      const allRooms = accounts.map((account) => {
        try {
          // Validate account data exists and has minimum length
          if (!account.account.data || account.account.data.length < 8) {
            return null;
          }

          // Use correct IDL account name for discriminator derivation
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);

          // Validate decoded data has required fields
          if (!decoded.roomId || !decoded.status) {
            console.warn('⚠️ Decoded account missing required fields:', account.pubkey.toString());
            return null;
          }

          return { publicKey: account.pubkey, account: decoded };
        } catch (err) {
          // Log decode failures for debugging
          console.debug(`Failed to decode account ${account.pubkey.toString()}:`, err);
          return null;
        }
      }).filter((room) => room !== null);

      console.log(`✅ Successfully decoded ${allRooms.length} GameRoom accounts`);

      const targetRoom = allRooms.find(
        (room: any) => room.account?.roomId?.toNumber() === roomId,
      );

      if (!targetRoom) {
        throw new Error(`Room ${roomId} not found among ${allRooms.length} available rooms`);
      }

      gameRoomPda = targetRoom.publicKey;
      const roomData = targetRoom.account as any;

      // Additional validation of room data integrity
      if (!roomData.player1 || !roomData.player2) {
        throw new Error(`Room ${roomId} has invalid player data`);
      }

      // Log current room state for debugging
      console.log('🔍 Room state analysis for resolution:', {
        roomId,
        status: getRoomStatusString(roomData.status),
        player1Selection: roomData.player1Selection ? 'Made' : 'Pending',
        player2Selection: roomData.player2Selection ? 'Made' : 'Pending',
        player1: roomData.player1?.toString(),
        player2: roomData.player2?.toString(),
      });

      // ENHANCED: Verify room is ready for resolution with multiple valid scenarios
      const isResolving = roomData.status && roomData.status.resolving;
      const isSelectionsPending = roomData.status && roomData.status.selectionsPending;
      const isWaitingForPlayer = roomData.status && roomData.status.waitingForPlayer;
      const bothSelected = roomData.player1Selection && roomData.player2Selection;

      console.log('📊 Resolution state check:', {
        isResolving,
        isSelectionsPending,
        isWaitingForPlayer,
        bothSelected,
        p1Selection: roomData.player1Selection ? 'Made' : 'Pending',
        p2Selection: roomData.player2Selection ? 'Made' : 'Pending',
      });

      // Multiple valid scenarios for resolution:
      // 1. Room is already in Resolving state (normal flow)
      // 2. Room is in SelectionsPending with both selections made (recovery flow)
      // 3. Allow resolution even if smart contract state is inconsistent but selections exist
      const canResolve = isResolving
        || (isSelectionsPending && bothSelected)
        || (bothSelected); // Force resolve if both players selected regardless of state

      if (!canResolve) {
        const statusStr = getRoomStatusString(roomData.status);
        if (isSelectionsPending && !bothSelected) {
          const p1Selected = roomData.player1Selection ? 'Yes' : 'No';
          const p2Selected = roomData.player2Selection ? 'Yes' : 'No';
          throw new Error(`Cannot resolve game: Waiting for player selections (Player 1: ${p1Selected}, Player 2: ${p2Selected})`);
        }
        if (isWaitingForPlayer) {
          throw new Error('Cannot resolve game: Still waiting for a second player to join');
        }
        throw new Error(`Cannot resolve game: Invalid room state '${statusStr}' and selections not complete`);
      }

      console.log('✅ Room ready for resolution');

      // Derive PDAs and get account addresses
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

      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        program.programId,
      );

      // Get player addresses
      const player1 = roomData.player1 as PublicKey;
      const player2 = roomData.player2 as PublicKey;

      // Get house wallet from global state
      const globalStateInfo = await conn.getAccountInfo(globalStatePda);
      if (!globalStateInfo) {
        throw new Error('Global state not found');
      }
      const globalStateData = program.coder.accounts.decode('GlobalState', globalStateInfo.data);
      const houseWallet = globalStateData.houseWallet as PublicKey;

      console.log('Resolving game with:');
      console.log('- Game Room PDA:', gameRoomPda.toString());
      console.log('- Global State PDA:', globalStatePda.toString());
      console.log('- Escrow PDA:', escrowPda.toString());
      console.log('- Player 1:', player1.toString());
      console.log('- Player 2:', player2.toString());
      console.log('- House Wallet:', houseWallet.toString());

      // Pre-transaction validation - verify accounts exist and are accessible
      console.log('🔍 Pre-transaction validation...');

      // Verify GameRoom account is still accessible
      const gameRoomAccountInfo = await conn.getAccountInfo(gameRoomPda);
      if (!gameRoomAccountInfo) {
        throw new Error(`GameRoom account ${gameRoomPda.toString()} no longer exists`);
      }

      // Verify GlobalState account is accessible
      const globalStateAccountCheck = await conn.getAccountInfo(globalStatePda);
      if (!globalStateAccountCheck) {
        throw new Error(`GlobalState account ${globalStatePda.toString()} not found`);
      }

      console.log('✅ All accounts validated, proceeding with resolution transaction');

      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .resolveGame()
          .accounts({
            gameRoom: gameRoomPda,
            globalState: globalStatePda,
            escrowAccount: escrowPda,
            player1,
            player2,
            houseWallet,
            resolver: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            skipPreflight: false,
          }),
        { maxRetries: 3, retryDelay: 2000 }, // Increased retry delay
      );

      console.log('🎉 Game resolved successfully:', tx);
      return { tx, gameRoomPda };
    } catch (error) {
      console.error('❌ Error resolving game:', error);

      // Enhanced error handling with specific guidance
      const errorMessage = (error as Error).message || 'Unknown error';

      if (errorMessage.includes('AccountDidNotSerialize') || errorMessage.includes('3004')) {
        throw new Error(`Game account data is corrupted or incompatible. This usually happens when the on-chain program structure differs from the frontend. Try "Handle Timeout" instead, or contact support. Technical details: ${errorMessage}`);
      }

      if (errorMessage.includes('MissingSelections') || errorMessage.includes('6008')) {
        throw new Error('Cannot resolve: Both players must make selections before the game can be resolved. Check that both players have selected heads or tails.');
      }

      if (errorMessage.includes('InvalidGameState') || errorMessage.includes('6007')) {
        throw new Error('Game state is invalid for resolution. Try refreshing the game state or use "Handle Timeout" if the game is stuck.');
      }

      if (errorMessage.includes('InvalidRoomStatus') || errorMessage.includes('6004')) {
        throw new Error('Room status does not allow resolution. The game may already be completed or not ready for resolution.');
      }

      // Generic error with actionable advice
      throw new Error(`Resolution failed: ${errorMessage}. You can try: 1) Refresh game state, 2) Use "Handle Timeout" if game is stuck, 3) Use "Force Abandon" in emergency controls.`);
    }
  }, [program, wallet.publicKey]);

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

      // Get player addresses and room status
      const player1 = roomData.player1 as PublicKey;
      const player2 = roomData.player2 as PublicKey | null;
      const roomStatus = roomData.status;

      // Check if player2 is actually set (not the default public key)
      const defaultPubkey = new PublicKey('11111111111111111111111111111111');
      const isPlayer2Valid = player2 && !player2.equals(defaultPubkey);

      console.log('Calling handleTimeout with:');
      console.log('- Game Room PDA:', gameRoomPda.toString());
      console.log('- Escrow PDA:', escrowPda.toString());
      console.log('- Player 1:', player1.toString());
      console.log('- Player 2:', isPlayer2Valid ? player2!.toString() : 'None (using default pubkey)');
      console.log('- Player 2 Valid:', isPlayer2Valid);
      console.log('- Room Status:', roomStatus);

      // Check if this is a single-player room that was never joined
      if (!isPlayer2Valid && roomStatus && roomStatus.waitingForPlayer) {
        throw new Error('Cannot handle timeout: This is a single-player room that was never joined. Single-player rooms cannot be timed out - they need to be cancelled through a different method or left to expire naturally.');
      }

      // Check if room status allows timeout (must be SelectionsPending)
      if (!roomStatus || !roomStatus.selectionsPending) {
        const statusName = getRoomStatusString(roomStatus);
        throw new Error(`Cannot handle timeout: Room status must be 'SelectionsPending' but is currently '${statusName}'. Only rooms with both players joined can be timed out.`);
      }

      // For valid two-player timeout scenarios
      const finalPlayer2 = isPlayer2Valid ? player2! : defaultPubkey;

      console.log('- Final Player 2 for transaction:', finalPlayer2.toString());

      const tx = await retryTransaction(
        program.provider.connection,
        () => program.methods
          .handleTimeout()
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
            player1,
            player2: finalPlayer2,
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

  // Cancel a single-player room (room that was never joined)
  const cancelRoom = useCallback(async (roomId: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Program not initialized or wallet not connected');
    }

    console.log(`Canceling single-player room ${roomId}...`);
    let gameRoomPda: PublicKey;

    try {
      // Find the room first
      const { connection: conn } = program.provider;
      const accounts = await conn.getProgramAccounts(PROGRAM_ID);
      const allRooms = accounts.map((account) => {
        try {
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

      // Get room details
      const player1 = roomData.player1 as PublicKey;
      const player2 = roomData.player2 as PublicKey;
      const roomStatus = roomData.status;
      const roomCreator = roomData.creator as PublicKey;

      // Check if player2 is actually set (not the default public key)
      const defaultPubkey = new PublicKey('11111111111111111111111111111111');
      const isPlayer2Valid = player2 && !player2.equals(defaultPubkey);

      // Validate this is indeed a single-player room
      if (isPlayer2Valid) {
        throw new Error('Cannot cancel room: This room has a second player. Use "Handle Timeout" instead for two-player rooms.');
      }

      // Check room status (should be WaitingForPlayer)
      if (!roomStatus || !roomStatus.waitingForPlayer) {
        const statusName = getRoomStatusString(roomStatus);
        throw new Error(`Cannot cancel room: Room status must be 'WaitingForPlayer' but is currently '${statusName}'. This room may already be in progress or completed.`);
      }

      // Check if the caller is the room creator
      if (!roomCreator.equals(wallet.publicKey)) {
        throw new Error('Cannot cancel room: Only the room creator can cancel a single-player room.');
      }

      // Derive escrow PDA for refund
      const roomIdBN = roomData.roomId as BN;
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          roomCreator.toBuffer(),
          roomIdBN.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId,
      );

      console.log('Calling cancelRoom with:');
      console.log('- Game Room PDA:', gameRoomPda.toString());
      console.log('- Escrow PDA:', escrowPda.toString());
      console.log('- Creator:', roomCreator.toString());
      console.log('- Player 1:', player1.toString());
      console.log('- Player 2:', player2.toString());
      console.log('- Player 2 is valid:', isPlayer2Valid);
      console.log('- Room Status:', getRoomStatusString(roomStatus));
      console.log('- Bet Amount:', roomData.betAmount?.toString());

      // For single-player rooms, we have a few options:
      // 1. Wait for timeout (2 hours) then use handleTimeout
      // 2. Immediate cancellation with manual refund (if supported by contract)
      // 3. Simple notification that room will expire naturally

      const currentTime = Math.floor(Date.now() / 1000);
      const roomAge = currentTime - roomData.createdAt.toNumber();
      const timeoutThreshold = 7200; // 2 hours in seconds

      if (roomAge < timeoutThreshold) {
        const remainingTime = timeoutThreshold - roomAge;
        const remainingMinutes = Math.floor(remainingTime / 60);
        const remainingHours = Math.floor(remainingMinutes / 60);
        const displayTime = remainingHours > 0
          ? `${remainingHours} hour(s) and ${remainingMinutes % 60} minute(s)`
          : `${remainingMinutes} minute(s)`;

        // For now, inform user that single-player rooms cannot be immediately cancelled
        // This prevents the constraint violation error
        throw new Error(`Single-player room cancellation: Room ${roomId} contains ${(roomData.betAmount.toNumber() / 1_000_000_000).toFixed(2)} SOL that will be automatically refunded after ${displayTime} when the room times out. Unfortunately, the smart contract doesn't support immediate cancellation of single-player rooms - they must reach the 2-hour timeout period first. Your funds are safe in escrow.`);
      }

      // Room is old enough - try to claim timeout refund
      console.log(`Attempting timeout claim for single-player room ${roomId} (age: ${roomAge} seconds)`);

      try {
        // First, check if this will work by simulating
        console.log('Simulating transaction first...');

        const simulateResult = await program.methods
          .handleTimeout()
          .accounts({
            gameRoom: gameRoomPda,
            escrowAccount: escrowPda,
            player1, // Use the actual player1 from the room
            player2, // Use the actual player2 (should be defaultPubkey) from the room
            systemProgram: SystemProgram.programId,
          })
          .simulate();

        console.log('Simulation successful:', simulateResult);

        // If simulation passes, execute the real transaction
        const tx = await retryTransaction(
          program.provider.connection,
          () => program.methods
            .handleTimeout()
            .accounts({
              gameRoom: gameRoomPda,
              escrowAccount: escrowPda,
              player1,
              player2, // Use the exact player2 value from the room
              systemProgram: SystemProgram.programId,
            })
            .rpc({
              commitment: 'confirmed',
              preflightCommitment: 'confirmed',
              skipPreflight: false, // Enable preflight to catch issues early
            }),
          { maxRetries: 3, retryDelay: 1000 },
        );

        console.log('✅ Single-player room timeout claimed successfully');
        console.log('Transaction:', getExplorerUrl(tx));

        return { tx, refundAmount: roomData.betAmount };
      } catch (timeoutError) {
        console.error('Error calling handle_timeout:', timeoutError);

        // If the error suggests a constraint violation related to player accounts,
        // provide a more user-friendly message
        const errorMsg = timeoutError instanceof Error ? timeoutError.message : String(timeoutError);
        if (errorMsg.includes('constraint') || errorMsg.includes('InvalidPlayer')) {
          throw new Error(`Smart contract constraint error: The deployed contract has strict validation for player accounts that prevents single-player room cancellation. Room ${roomId} with ${(roomData.betAmount.toNumber() / 1_000_000_000).toFixed(2)} SOL will need to be handled manually or will expire naturally. Consider contacting support if this issue persists.`);
        }

        throw new Error(`Failed to cancel single-player room: ${formatTransactionError(timeoutError as Error)}`);
      }
    } catch (error) {
      console.error('Error canceling room:', error);
      const formattedError = new Error(formatTransactionError(error as Error));
      throw formattedError;
    }
  }, [program, wallet.publicKey]);

  // User-controlled refresh methods
  const forceRefreshAllRooms = useCallback(async (): Promise<GameRoom[]> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    const requestKey = 'fetchAllGameRooms';
    return rpcManager.forceRefresh(requestKey, async () => {
      console.log('🔄 Force refreshing all game rooms...');
      const { connection: conn } = program.provider;

      const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
        encoding: 'base64',
      });

      const gameRooms: GameRoom[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const account of accounts) {
        try {
          const decoded = program.coder.accounts.decode('GameRoom', account.account.data);
          gameRooms.push(decoded);
        } catch {
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      console.log('✅ Force refresh completed:', gameRooms.length, 'rooms');
      return gameRooms;
    });
  }, [program]);

  const forceRefreshGameRoom = useCallback(async (roomId: number): Promise<GameRoom | null> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    const requestKey = `fetchGameRoom-${roomId}`;
    return rpcManager.forceRefresh(requestKey, async () => {
      console.log(`🔄 Force refreshing room ${roomId}...`);
      const allRooms = await forceRefreshAllRooms();
      const targetRoom = allRooms.find(
        (room: any) => room.roomId?.toNumber() === roomId,
      );
      return targetRoom || null;
    });
  }, [program, forceRefreshAllRooms]);

  const clearRpcCache = useCallback(() => {
    rpcManager.clearCache();
  }, []);

  const getRpcStats = useCallback(() => rpcManager.getCacheStats(), []);

  const isRpcCircuitOpen = useCallback(() => rpcManager.isCircuitOpen(), []);

  return {
    program,
    isProgramReady,
    createRoom,
    joinRoom,
    makeSelection,
    resolveGame,
    fetchGameRoom,
    fetchAllGameRooms,
    handleTimeout,
    cancelRoom,
    // New user-controlled methods
    forceRefreshAllRooms,
    forceRefreshGameRoom,
    clearRpcCache,
    getRpcStats,
    isRpcCircuitOpen,
  };
};
