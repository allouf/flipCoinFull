import { useCallback, useState, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sha256 } from 'js-sha256';
import { PROGRAM_ID, HOUSE_WALLET } from '../config/constants';
import { WebSocketManager } from '../services/WebSocketManager';
import { storeCommitment, getCommitment } from '../services/commitmentService';
// Import IDL - use the existing coin_flipper.json
let fairCoinFlipperIdl: any;
try {
  fairCoinFlipperIdl = require('../idl/coin_flipper.json');
} catch {
  // Fallback IDL structure
  fairCoinFlipperIdl = {
    version: "0.1.0",
    name: "coin_flipper",
    instructions: [],
    accounts: []
  };
}

// Use program ID and house wallet from config
const TIMEOUT_SECONDS = 300; // 5 minutes
const MIN_BET_SOL = 0.01;
const MAX_BET_SOL = 100;

// Types
export type GamePhase = 'idle' | 'creating' | 'waiting' | 'committing' | 'revealing' | 'resolved';
export type CoinSide = 'heads' | 'tails';
export type GameStatus = 'WaitingForPlayer' | 'PlayersReady' | 'CommitmentsReady' | 'RevealingPhase' | 'Resolved' | 'Cancelled';

export interface FairGameState {
  // Game identification
  gameId: number | null;
  phase: GamePhase;
  
  // Player data
  playerRole: 'creator' | 'joiner' | null;
  playerChoice: CoinSide | null;
  playerSecret: number | null;
  playerCommitment: number[] | null;
  
  // Opponent data
  opponentRevealed: boolean;
  opponentChoice: CoinSide | null;

  // Player reveal status
  isPlayerRevealed: boolean;
  
  // Game results
  coinResult: CoinSide | null;
  winner: string | null;
  winnerPayout: number | null;
  houseFee: number | null;
  
  // Game settings
  betAmount: number;
  timeRemaining: number;
  selectionDeadline: number | null;
  
  // Game state from blockchain
  blockchainStatus: GameStatus | null;
  createdAt: number | null;
  resolvedAt: number | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  txSignature: string | null;
}

export interface FairGameNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

const initialGameState: FairGameState = {
  gameId: null,
  phase: 'idle',
  playerRole: null,
  playerChoice: null,
  playerSecret: null,
  playerCommitment: null,
  opponentRevealed: false,
  opponentChoice: null,
  isPlayerRevealed: false,
  coinResult: null,
  winner: null,
  winnerPayout: null,
  houseFee: null,
  betAmount: 0.05, // Default 0.05 SOL
  timeRemaining: 0,
  selectionDeadline: null,
  blockchainStatus: null,
  createdAt: null,
  resolvedAt: null,
  isLoading: false,
  error: null,
  txSignature: null,
};

export const useFairCoinFlipper = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [gameState, setGameState] = useState<FairGameState>(initialGameState);
  const [notifications, setNotifications] = useState<FairGameNotification[]>([]);
  const [program, setProgram] = useState<Program | null>(null);

  // Refs for cleanup and state management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Anchor program
  useEffect(() => {
    if (!wallet.publicKey || !connection) {
      setProgram(null);
      return;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        AnchorProvider.defaultOptions()
      );
      // Initialize program with the actual IDL
      const programInstance = new Program(
        fairCoinFlipperIdl as Idl,
        PROGRAM_ID,
        provider
      );
      setProgram(programInstance);
      // Removed repetitive logging - only log critical errors
    } catch (error) {
      console.error('Failed to initialize program:', error);
      setProgram(null);
    }
  }, [connection, wallet]);

  // Countdown timer effect
  useEffect(() => {
    if (gameState.phase !== 'committing') {
      return;
    }

    // Set initial time if not set
    if (gameState.timeRemaining === 0) {
      setGameState(prev => ({ ...prev, timeRemaining: 180 })); // 3 minutes
      return;
    }

    // Create countdown interval
    const countdownInterval = setInterval(() => {
      setGameState(prev => {
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);

        if (newTimeRemaining === 0 && prev.phase === 'committing') {
          console.warn('⏰ Commitment phase timeout!');
          // Could trigger auto-cancellation or move to reveal phase
        }

        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [gameState.phase, gameState.timeRemaining === 0]);

  // Utility Functions
  const generateSecret = useCallback((): number => {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }, []);

  const generateCommitment = useCallback((choice: CoinSide, secret: number): number[] => {
    // MUST MATCH smart contract's generate_commitment function:
    // 1. choice_byte (1 byte) + padding (7 bytes of 0x00) + secret (8 bytes LE)
    // 2. Double hash: hash(hash(data))

    const choiceByte = choice === 'heads' ? 0 : 1;
    const padding = Buffer.alloc(7, 0); // 7 bytes of 0x00 padding
    const secretBytes = new BN(secret).toArrayLike(Buffer, 'le', 8);

    // Concatenate: choice + padding + secret = 1 + 7 + 8 = 16 bytes total
    const commitmentData = Buffer.concat([
      Buffer.from([choiceByte]),
      padding,
      secretBytes
    ]);

    // First hash
    const firstHash = sha256.create();
    firstHash.update(commitmentData);
    const firstHashBytes = new Uint8Array(firstHash.arrayBuffer());

    // Second hash (hash the first hash) - CRITICAL for matching smart contract
    const finalHash = sha256.create();
    finalHash.update(firstHashBytes);
    const finalHashBytes = new Uint8Array(finalHash.arrayBuffer());

    return Array.from(finalHashBytes);
  }, []);

  const generateGameId = useCallback((): number => {
    // Generate a truly unique ID using high resolution time + random + counter
    const now = performance.now();
    const timestamp = Math.floor(now * 1000); // microsecond precision
    const random = Math.floor(Math.random() * 1000000);
    const counter = Math.floor(Math.random() * 1000);

    // Combine all components and ensure it's a positive integer within safe range
    const uniqueId = Math.abs(timestamp + random + counter);
    return uniqueId % (Number.MAX_SAFE_INTEGER - 1000000) + 1000000; // Ensure minimum size
  }, []);

  const deriveGamePDA = useCallback((playerA: PublicKey, gameId: number): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        playerA.toBuffer(),
        new BN(gameId).toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    );
  }, []);

  const deriveEscrowPDA = useCallback((playerA: PublicKey, gameId: number): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('escrow'),
        playerA.toBuffer(),
        new BN(gameId).toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    );
  }, []);

  // Notification management
  const addNotification = useCallback((notification: Omit<FairGameNotification, 'id'>) => {
    const newNotification: FairGameNotification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      duration: notification.duration ?? 5000,
    };
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, newNotification.duration);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Error handling
  const setError = useCallback((error: string | null) => {
    setGameState(prev => ({ ...prev, error, isLoading: false }));
    if (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error,
        duration: 8000,
      });
    }
  }, [addNotification]);

  // Game state management
  const setLoading = useCallback((isLoading: boolean) => {
    setGameState(prev => ({ ...prev, isLoading }));
  }, []);

  const resetGame = useCallback(() => {
    // Clear polling intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current);
      timeoutIntervalRef.current = null;
    }

    setGameState(initialGameState);
    clearNotifications();
  }, [clearNotifications]);

  // Phase 1: Game Creation (without requiring choice upfront)
  const createGame = useCallback(async (betAmount: number): Promise<number | null> => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return null;
    }

    if (betAmount < MIN_BET_SOL || betAmount > MAX_BET_SOL) {
      setError(`Bet amount must be between ${MIN_BET_SOL} and ${MAX_BET_SOL} SOL`);
      return null;
    }

    // Clear any existing polling before creating new game
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Reset game state for new game
    setGameState(prev => ({
      ...initialGameState,
      betAmount,
    }));

    setLoading(true);
    setError(null);

    // Try up to 3 times with different game IDs in case of collision
    let attempts = 0;
    const maxAttempts = 3;
    let gameId: number = 0;
    let gamePda: PublicKey | undefined;
    let escrowPda: PublicKey | undefined;

    while (attempts < maxAttempts) {
      try {
        // Generate unique game data
        gameId = generateGameId();

        // Derive PDAs
        [gamePda] = deriveGamePDA(wallet.publicKey, gameId);
        [escrowPda] = deriveEscrowPDA(wallet.publicKey, gameId);

        // Check if game account already exists to prevent duplicates
        try {
          const existingGame = await program.account.game.fetch(gamePda);
          if (existingGame) {
            console.log('Game PDA already exists, generating new ID...');
            attempts++;
            continue;
          }
        } catch {
          // Account doesn't exist, which is what we want
        }

        console.log('🎮 Creating game:', {
          gameId,
          betAmount,
          gamePda: gamePda.toString(),
          escrowPda: escrowPda.toString(),
        });

      // Call smart contract without commitment
      console.log('📤 Sending transaction to blockchain...');
      const tx = await program.methods
        .createGame(new BN(gameId), new BN(betAmount * LAMPORTS_PER_SOL))
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerA: wallet.publicKey,
          houseWallet: HOUSE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Transaction successful:', tx);

      // Update game state (without player choice - will be set later)
      console.log('🔄 Updating game state...');
      setGameState(prev => ({
        ...prev,
        gameId,
        phase: 'waiting',
        playerRole: 'creator',
        playerChoice: null, // No choice made yet
        playerSecret: null, // Will be set when choice is made
        playerCommitment: null, // Will be set when choice is made
        betAmount,
        blockchainStatus: 'WaitingForPlayer',
        createdAt: Date.now(),
        selectionDeadline: Date.now() + (TIMEOUT_SECONDS * 1000),
        txSignature: tx,
        isLoading: false,
      }));

      console.log('🎉 Adding success notification...');
      addNotification({
        type: 'success',
        title: 'Game Created!',
        message: `Waiting for opponent to join your ${betAmount} SOL game.`,
        duration: 6000,
      });

      // Emit WebSocket event to notify about new game
      const wsManager = WebSocketManager.getInstance();
      wsManager.sendMessage('room_created', {
        type: 'room_created',
        roomId: gameId.toString(),
        playerId: wallet.publicKey.toString(),
        data: {
          gameId,
          playerA: wallet.publicKey.toString(),
          betAmount,
          status: 'WaitingForPlayer',
          txSignature: tx,
        },
        timestamp: Date.now(),
        signature: tx,
      });

      // Subscribe to room updates for this game
      wsManager.subscribeToRoom(gameId.toString());

      // Start polling for opponent
      console.log('🔍 Starting game polling...');
      startGamePolling(gameId);

      return gameId; // Return gameId instead of just true
      } catch (error: any) {
        attempts++;
        console.error(`Error creating game (attempt ${attempts}/${maxAttempts}):`, error);

        // Check if the transaction was already processed successfully
        if (error.message?.includes('already been processed')) {
          console.log('Transaction was already processed - checking if game was created...');

          try {
            // Try to fetch the game account to see if it was actually created
            if (gamePda) {
              const gameAccount = await program.account.game.fetch(gamePda);
              if (gameAccount) {
                console.log('✅ Game was actually created successfully:', gameId);
                // Game was created, update state and return success
                setGameState(prev => ({
                  ...prev,
                  gameId,
                  phase: 'waiting',
                  playerRole: 'creator',
                  betAmount,
                  blockchainStatus: 'WaitingForPlayer',
                  createdAt: Date.now(),
                  error: null,
                  txSignature: null, // We don't have the signature
                }));

                setLoading(false);
                addNotification({
                  type: 'success',
                  title: 'Game Created!',
                  message: `Game ${gameId} is ready. Waiting for an opponent to join.`,
                });

                return gameId;
              }
            }
          } catch (fetchError) {
            // Game doesn't exist, continue with retry logic
          }
        }

        // Check for retryable errors
        const isRetryable =
          error.message?.includes('already exists') ||
          error.message?.includes('Account already exists') ||
          error.message?.includes('custom program error: 0x0') || // Account already in use
          error.code === 'TransactionExpiredTimeoutError' ||
          error.message?.includes('Transaction was not confirmed');

        if (isRetryable && attempts < maxAttempts) {
          console.log(`Retrying with new game ID (attempt ${attempts + 1}/${maxAttempts})...`);
          // Progressive delay: 500ms, 1s, 1.5s
          const delay = 500 * attempts;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // For non-retryable errors or max attempts reached, fail
        setError(error.message || 'Failed to create game');
        setLoading(false);
        return null;
      }
    }

    // If all attempts failed
    setError('Failed to create game after multiple attempts. Please try again.');
    setLoading(false);
    return null;
  }, [program, wallet.publicKey, generateGameId, deriveGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);


  // Helper function to find game PDA by ID - improved approach using direct derivation
  const findGamePDA = useCallback(async (gameId: number): Promise<PublicKey | null> => {
    if (!program) return null;

    // Cache to avoid repeated API calls for the same game
    const cacheKey = `game_${gameId}`;
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache

    // Check if we have a cached result
    const cached = (window as any).__gameCache?.[cacheKey];
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.pda ? new PublicKey(cached.pda) : null;
    }

    try {
      // Create a fresh PublicKey instance to avoid any serialization issues
      const programId = new PublicKey('7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6');

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // First, try to find the game by scanning all program accounts (without filters to avoid Base58 errors)
      const accounts = await program.provider.connection.getProgramAccounts(programId);

      // Search through all accounts to find the game with matching ID
      for (const account of accounts) {
        try {
          const decoded = program.coder.accounts.decode('Game', account.account.data);
          if (decoded.gameId?.toNumber() === gameId) {
            // Cache the result
            (window as any).__gameCache = (window as any).__gameCache || {};
            (window as any).__gameCache[cacheKey] = {
              pda: account.pubkey.toString(),
              timestamp: now
            };
            return account.pubkey;
          }
        } catch {
          // Skip non-Game accounts or invalid data
          continue;
        }
      }

      // Cache null result too
      (window as any).__gameCache = (window as any).__gameCache || {};
      (window as any).__gameCache[cacheKey] = {
        pda: null,
        timestamp: now
      };

      return null;
    } catch (error) {
      console.error('Error finding game PDA:', error);
      return null;
    }
  }, [program]);

  // Handle game resolution - stub implementation
  const handleGameResolution = useCallback(async (gameAccount: any) => {
    try {
      console.log('Handling game resolution:', gameAccount);

      // Extract resolution data from game account
      const winner = (gameAccount as any).winner;
      const coinResult = (gameAccount as any).coinResult;
      const winnerPayout = (gameAccount as any).winnerPayout;
      const houseFee = (gameAccount as any).houseFee;
      const choice_a = (gameAccount as any).choiceA || (gameAccount as any).choice_a;
      const choice_b = (gameAccount as any).choiceB || (gameAccount as any).choice_b;

      // Determine opponent's choice based on current player role
      let opponentChoice: CoinSide | null = null;
      const currentPlayerRole = gameState.playerRole;
      if (currentPlayerRole === 'creator') {
        // Player is A, opponent is B
        opponentChoice = choice_b === 0 ? 'heads' : choice_b === 1 ? 'tails' : null;
      } else if (currentPlayerRole === 'joiner') {
        // Player is B, opponent is A
        opponentChoice = choice_a === 0 ? 'heads' : choice_a === 1 ? 'tails' : null;
      }

      const resolvedData = {
        winner: winner?.toString() || null,
        coinResult: coinResult === 0 ? 'heads' : 'tails',
        opponentChoice,
        winnerPayout: winnerPayout ? winnerPayout.toNumber() / LAMPORTS_PER_SOL : null,
        houseFee: houseFee ? houseFee.toNumber() / LAMPORTS_PER_SOL : null,
      };

      console.log('🎲 Game resolved! Starting 3-second animation delay before showing results...');

      // Wait 3 seconds for coin flip animation before showing final result
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('✨ Animation complete, showing final results!');

      setGameState(prev => ({
        ...prev,
        phase: 'resolved',
        blockchainStatus: 'Resolved',
        ...resolvedData,
        resolvedAt: Date.now(),
      }));

      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

    } catch (error) {
      console.error('Error handling game resolution:', error);
    }
  }, []);

  // Start commitment polling - stub implementation
  const startCommitmentPolling = useCallback((gameId: number) => {
    // Clear existing polling FIRST
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    console.log('Starting commitment polling for game:', gameId);

    // Poll for commitment updates
    pollingIntervalRef.current = setInterval(async () => {
      if (!program) return;

      // Get the current game state to check if we should still be polling
      setGameState(currentState => {
        // Stop polling if game changed or we're in wrong phase
        if (currentState.gameId !== gameId ||
            (currentState.phase !== 'committing' && currentState.phase !== 'revealing')) {
          console.log(`Stopping commitment polling - game changed or wrong phase (current: ${currentState.gameId}, polling: ${gameId}, phase: ${currentState.phase})`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return currentState;
        }
        return currentState;
      });

      try {
        const gamePda = await findGamePDA(gameId);
        if (!gamePda) return;

        const gameAccount = await program.account.game.fetch(gamePda);
        const status = (gameAccount as any).status;

        if ('commitmentsReady' in status || 'revealingPhase' in status) {
          // Only transition if we're still in committing phase
          setGameState(prev => {
            if (prev.gameId !== gameId || prev.phase === 'resolved' || prev.phase === 'idle') {
              return prev; // Don't update if game changed or already resolved
            }

            if (prev.phase === 'committing') {
              // Only log once when transitioning
              return {
                ...prev,
                phase: 'revealing',
                blockchainStatus: 'commitmentsReady' in status ? 'CommitmentsReady' : 'RevealingPhase',
                // Keep the existing playerChoice, playerSecret, and playerCommitment
                playerChoice: prev.playerChoice,
                playerSecret: prev.playerSecret,
                playerCommitment: prev.playerCommitment,
              };
            }
            return prev;
          });
        } else if ('resolved' in status) {
          await handleGameResolution(gameAccount);
        }
      } catch (error: any) {
        // Silence errors for games that don't exist anymore
        if (!error?.message?.includes('Account does not exist')) {
          console.error('Error in commitment polling:', error);
        }
      }
    }, 2000);
  }, [program, findGamePDA, handleGameResolution]);

  // Polling functions
  const startGamePolling = useCallback((gameId: number) => {
    // Clear existing polling FIRST
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!program) return;

      // Check if we should still be polling for this game
      setGameState(currentState => {
        if (currentState.gameId !== gameId || currentState.phase !== 'waiting') {
          console.log(`Stopping game polling - game changed or wrong phase (current: ${currentState.gameId}, polling: ${gameId}, phase: ${currentState.phase})`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        return currentState;
      });

      try {
        const gamePda = await findGamePDA(gameId);
        if (!gamePda) return;

        const gameAccount = await program.account.game.fetch(gamePda);
        const status = (gameAccount as any).status;

        if ('playersReady' in status) {
          setGameState(prev => {
            if (prev.gameId !== gameId) return prev; // Don't update if game changed
            return {
              ...prev,
              phase: 'committing',
              blockchainStatus: 'PlayersReady',
            };
          });
          startCommitmentPolling(gameId);
        } else if ('commitmentsReady' in status) {
          setGameState(prev => {
            if (prev.gameId !== gameId) return prev;
            return {
              ...prev,
              phase: 'revealing',
              blockchainStatus: 'CommitmentsReady',
            };
          });
        } else if ('revealingPhase' in status) {
          setGameState(prev => {
            if (prev.gameId !== gameId) return prev;
            return {
              ...prev,
              phase: 'revealing',
              blockchainStatus: 'RevealingPhase',
            };
          });
        } else if ('resolved' in status) {
          // Handle game resolution
          setGameState(prev => {
            if (prev.gameId !== gameId) return prev;
            return {
              ...prev,
              phase: 'resolved',
              blockchainStatus: 'Resolved',
              resolvedAt: Date.now(),
            };
          });
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
      } catch (error: any) {
        // Silence errors for games that don't exist anymore
        if (!error?.message?.includes('Account does not exist')) {
          console.error('Error polling game:', error);
        }
      }
    }, 2000); // Poll every 2 seconds
  }, [program, findGamePDA]);

// Join existing game with choice (matches smart contract flow)
  const joinExistingGame = useCallback(async (gameId: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    // First verify the game exists and is joinable
    try {
      const gamePda = await findGamePDA(gameId);
      if (!gamePda) {
        setError('Game not found');
        return false;
      }

      const gameAccount = await program.account.game.fetch(gamePda);
      const status = (gameAccount as any).status;
      const playerA = (gameAccount as any).playerA;
      const playerB = (gameAccount as any).playerB;
      
      // Check if current user is already in this game
      const isPlayerA = playerA.equals(wallet.publicKey);
      const isPlayerB = playerB && !playerB.equals(PublicKey.default) && playerB.equals(wallet.publicKey);
      
      if (isPlayerA || isPlayerB) {
        // User is already in the game, rejoin instead
        return await rejoinExistingGame(gameId);
      }
      
      // Check if game is still joinable
      if (!('waitingForPlayer' in status)) {
        setError('Game is no longer available to join');
        return false;
      }

      // Join the game on blockchain first
      const joinSuccess = await joinGameOnBlockchain(gameId);
      if (!joinSuccess) {
        return false;
      }

      // The joinGameOnBlockchain already sets up the state, so just return success
      return true;
    } catch (error: any) {
      console.error('Error loading game:', error);
      setError(error.message || 'Failed to load game');
      return false;
    }
  }, [program, wallet.publicKey, findGamePDA, addNotification, setError]);

  // Cancel stuck game (after 1 hour timeout)
  const cancelGame = useCallback(async (gameId?: number) => {
    const targetGameId = gameId || gameState.gameId;
    if (!gameState || !wallet.publicKey || !targetGameId || !program) {
      setError('Invalid state for game cancellation');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const gamePda = await findGamePDA(targetGameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      const gameAccount = await program.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const playerB = (gameAccount as any).playerB;
      const [escrowPda] = deriveEscrowPDA(playerA, targetGameId);

      console.log('❌ Cancelling stuck game:', {
        gameId: targetGameId,
        gamePda: gamePda.toString(),
      });

      const tx = await program!.methods
        .cancelGame()
        .accounts({
          canceller: wallet.publicKey,
          game: gamePda,
          playerA,
          playerB,
          houseWallet: HOUSE_WALLET,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Update game state
      setGameState(prev => ({
        ...prev,
        phase: 'resolved',
        blockchainStatus: 'Cancelled',
        resolvedAt: Date.now(),
        txSignature: tx,
        isLoading: false,
      }));

      addNotification({
        type: 'info',
        title: 'Game Cancelled',
        message: 'Stuck game has been cancelled and funds refunded.',
        duration: 6000,
      });

      // Clear polling intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      return true;
    } catch (error: any) {
      console.error('Error cancelling game:', error);
      setError(error.message || 'Failed to cancel game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, gameState.gameId, findGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);

  // Manually resolve game (for games stuck in revealing phase)
  const resolveGameManual = useCallback(async (gameId?: number) => {
    const targetGameId = gameId || gameState.gameId;
    if (!program || !wallet.publicKey || !targetGameId) {
      setError('Invalid state for manual resolution');
      return false;
    }

    setLoading(true);
    setError(null);


    try {
      const gamePda = await findGamePDA(targetGameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      const gameAccount = await program!.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const playerB = (gameAccount as any).playerB;
      const [escrowPda] = deriveEscrowPDA(playerA, targetGameId);

      console.log('🔧 Manually resolving game:', {
        gameId: targetGameId,
        gamePda: gamePda.toString(),
      });

      await program!.methods
        .resolveGameManual()
        .accounts({
          resolver: wallet.publicKey,
          game: gamePda,
          playerA,
          playerB,
          houseWallet: HOUSE_WALLET,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch updated game account to get resolution results
      const updatedGameAccount = await program.account.game.fetch(gamePda);
      await handleGameResolution(updatedGameAccount);

      addNotification({
        type: 'success',
        title: 'Game Resolved',
        message: 'Game has been manually resolved.',
        duration: 6000,
      });

      return true;
    } catch (error: any) {
      console.error('Error manually resolving game:', error);
      setError(error.message || 'Failed to manually resolve game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, gameState.gameId, findGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);

  // Fetch game data for spectators (without joining)
  const fetchGameData = useCallback(async (gameId: number): Promise<any> => {
    if (!program) return null;

    try {
      // Find the game PDA
      const gamePda = await findGamePDA(gameId);
      if (!gamePda) {
        return null;
      }

      // Fetch the game account data
      const gameAccount = await program.account.game.fetch(gamePda);

      // Return raw game data for display
      return {
        gameId: (gameAccount as any).gameId?.toNumber(),
        betAmount: (gameAccount as any).betAmount ? (gameAccount as any).betAmount.toNumber() / LAMPORTS_PER_SOL : 0,
        playerA: (gameAccount as any).playerA?.toString(),
        playerB: (gameAccount as any).playerB?.toString(),
        status: Object.keys((gameAccount as any).status)[0],
        gamePda: gamePda.toString(),
      };
    } catch (error) {
      console.error('Error fetching game data:', error);
      return null;
    }
  }, [program, findGamePDA]);

  // Load game directly by PDA (more efficient than searching)
  const loadGameByPda = useCallback(async (gameId: number, gamePdaString: string) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const gamePda = new PublicKey(gamePdaString);
      console.log(`🎮 Loading game ${gameId} directly via PDA: ${gamePdaString}`);

      const gameAccount = await program!.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const playerB = (gameAccount as any).playerB;
      const betAmount = (gameAccount as any).betAmount.toNumber() / LAMPORTS_PER_SOL;
      const status = (gameAccount as any).status;

      // Check if current user is a player in this game
      const isPlayerA = playerA.equals(wallet.publicKey);
      const isPlayerB = playerB && !playerB.equals(PublicKey.default) && playerB.equals(wallet.publicKey);

      if (!isPlayerA && !isPlayerB) {
        // If user is not a player, try to join
        console.log(`🔗 User not in game, attempting to join...`);
        if ('waitingForPlayer' in status) {
          return await joinGameOnBlockchain(gameId);
        } else {
          setError('Game is no longer available to join');
          return false;
        }
      }

      console.log('🎮 Loading existing game state:', {
        gameId,
        isPlayerA,
        isPlayerB,
        betAmount,
        status
      });

      // Check if the player has already made their commitment
      const commitmentA = (gameAccount as any).commitmentA;
      const commitmentB = (gameAccount as any).commitmentB;
      const hasPlayerACommitted = commitmentA && commitmentA.length > 0 && !commitmentA.every((byte: number) => byte === 0);
      const hasPlayerBCommitted = commitmentB && commitmentB.length > 0 && !commitmentB.every((byte: number) => byte === 0);
      const hasCurrentPlayerCommitted = isPlayerA ? hasPlayerACommitted : hasPlayerBCommitted;

      
      const hasBothPlayersCommitted = hasPlayerACommitted && hasPlayerBCommitted;

      console.log('🔍 [REJOIN] Commitment Status Check:', {
        gameId,
        currentPlayer: isPlayerA ? 'Player A' : 'Player B',
        hasPlayerACommitted,
        hasPlayerBCommitted,
        hasCurrentPlayerCommitted,
        hasBothPlayersCommitted,
        blockchainStatus: Object.keys(status)[0]
      });

      // Determine the correct game phase based on blockchain status
      let phase: GamePhase = 'waiting';
      let blockchainStatus: GameStatus = 'WaitingForPlayer';

      if ('waitingForPlayer' in status) {
        phase = 'waiting';
        blockchainStatus = 'WaitingForPlayer';
      } else if ('playersReady' in status) {
        // Determine phase based on commitment status
        if (hasBothPlayersCommitted) {
          console.log('🎯 [REJOIN] Both players committed - ready to reveal');
          phase = 'revealing';
        } else if (hasCurrentPlayerCommitted) {
          console.log('⏳ [REJOIN] Current player committed, waiting for opponent');
          phase = 'committing';
        } else {
          console.log('🎲 [REJOIN] Current player needs to make commitment');
          phase = 'committing';
        }
        blockchainStatus = 'PlayersReady';
      } else if ('commitmentsReady' in status) {
        phase = 'revealing';
        blockchainStatus = 'CommitmentsReady';
      } else if ('revealingPhase' in status) {
        phase = 'revealing';
        blockchainStatus = 'RevealingPhase';
      } else if ('resolved' in status) {
        phase = 'resolved';
        blockchainStatus = 'Resolved';
        await handleGameResolution(gameAccount);
      }

      // Try to restore commitment from commitmentService if player has already committed
      let restoredChoice = null;
      let restoredSecret = null;
      let restoredCommitment = null;

      // Always try to restore from commitmentService if player has committed or game is in revealing phase
      if ((hasCurrentPlayerCommitted || phase === 'revealing') && wallet.publicKey) {
        try {
          const commitment = await getCommitment(wallet.publicKey.toString(), gameId);
          if (commitment) {
            restoredChoice = commitment.choice;
            restoredSecret = parseInt(commitment.secret);
            restoredCommitment = commitment.commitment;
            console.log('💾 Restored commitment from local storage:', {
              gameId,
              choice: restoredChoice,
              phase,
              source: 'IndexedDB/localStorage',
            });
          } else {
            console.warn(`⚠️ No commitment found in local storage for game ${gameId}`);

            // ⚠️ CRITICAL WARNING: Blockchain has commitment but local storage doesn't
            if (hasCurrentPlayerCommitted) {
              console.error('🚨 CRITICAL: Blockchain shows you committed, but secret is missing from local storage!');
              setError(
                '⚠️ Critical Issue: Your browser lost your game secret! ' +
                'You cannot complete this game without it. ' +
                'Please avoid clearing browser data during active games.'
              );
            }
          }
        } catch (e) {
          console.warn('Failed to restore commitment from commitmentService:', e);
        }
      }

      // Determine the error message based on the critical state
      let errorMessage = null;
      if (hasCurrentPlayerCommitted && !restoredSecret) {
        errorMessage = '⚠️ Game secret lost - cannot reveal. Avoid clearing browser data during games.';
      }

      // Update game state
      setGameState(prev => ({
        ...prev,
        gameId,
        phase,
        blockchainStatus,
        playerRole: isPlayerA ? 'creator' : 'joiner',
        betAmount,
        isLoading: false,
        error: errorMessage,
        timeRemaining: phase === 'committing' ? 180 : 0,  // Set timer for committing phase
        playerChoice: restoredChoice || prev.playerChoice,
        playerSecret: restoredSecret || prev.playerSecret,
        playerCommitment: restoredCommitment || prev.playerCommitment,
      }));

      // Start polling for phases that need updates
      if (['waiting', 'committing', 'revealing'].includes(phase)) {
        if (phase === 'waiting') {
          // Start game polling to detect when opponent joins
          startGamePolling(gameId);
        } else if (phase === 'committing') {
          // Start commitment polling to detect when both players commit
          startCommitmentPolling(gameId);
        } else if (phase === 'revealing') {
          // Game is ready for reveal - use commitment polling to watch for reveals
          startCommitmentPolling(gameId);
        }
      }

      setLoading(false);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to load game ${gameId} by PDA:`, error);
      setError(error.message || 'Failed to load game');
      setLoading(false);
      return false;
    }
  }, [program, wallet.publicKey, setGameState, setError, setLoading]);

  // Make choice function - stub implementation
  const makeChoice = useCallback(async (choice: CoinSide) => {
    if (!program || !wallet.publicKey || !gameState.gameId) {
      setError('Invalid state for making choice');
      return false;
    }

    // Declare variables outside try/catch for error recovery access
    let gamePda: PublicKey | null = null;
    let secret: number | null = null;
    let commitment: number[] | null = null;
    let isPlayerA = false;
    let isPlayerB = false;

    setLoading(true);
    try {
      // Find the game PDA
      gamePda = await findGamePDA(gameState.gameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      // ✅ CRITICAL: Check blockchain state BEFORE attempting commitment
      console.log('🔍 Checking blockchain state before commitment...');
      const gameAccount = await program.account.game.fetch(gamePda);

      console.log('📊 Game account fetched:', {
        playerA: (gameAccount as any).playerA?.toString(),
        playerB: (gameAccount as any).playerB?.toString(),
        status: (gameAccount as any).status,
      });

      // Determine if current player is A or B
      isPlayerA = wallet.publicKey.equals(gameAccount.playerA as PublicKey);
      isPlayerB = wallet.publicKey.equals(gameAccount.playerB as PublicKey);

      console.log('👤 Player role check:', {
        walletAddress: wallet.publicKey.toString(),
        isPlayerA,
        isPlayerB,
      });

      if (!isPlayerA && !isPlayerB) {
        throw new Error('You are not a player in this game');
      }

      // Check if player has already committed on blockchain
      const commitmentA = (gameAccount as any).commitmentA;
      const commitmentB = (gameAccount as any).commitmentB;
      const hasPlayerACommitted = commitmentA && commitmentA.length > 0 && !commitmentA.every((byte: number) => byte === 0);
      const hasPlayerBCommitted = commitmentB && commitmentB.length > 0 && !commitmentB.every((byte: number) => byte === 0);
      const hasCurrentPlayerCommitted = isPlayerA ? hasPlayerACommitted : hasPlayerBCommitted;

      console.log('🔐 Commitment check:', {
        commitmentA: commitmentA?.slice(0, 8),
        commitmentB: commitmentB?.slice(0, 8),
        hasPlayerACommitted,
        hasPlayerBCommitted,
        hasCurrentPlayerCommitted,
        currentPlayerRole: isPlayerA ? 'Player A' : 'Player B',
      });

      if (hasCurrentPlayerCommitted) {
        console.error('❌ Already committed on blockchain!');

        // Check if we have the commitment locally
        const localCommitment = await getCommitment(wallet.publicKey.toString(), gameState.gameId);

        if (!localCommitment) {
          // Critical issue: blockchain has commitment but local storage doesn't
          throw new Error(
            '⚠️ You have already committed to this game, but your browser lost the secret data. ' +
            'Without the secret, you cannot reveal your choice. This game cannot be completed. ' +
            'Please avoid clearing browser data during active games.'
          );
        } else {
          // Player has local commitment, just needs to wait
          throw new Error(
            'You have already made your commitment for this game. ' +
            'Please wait for your opponent to commit.'
          );
        }
      }

      secret = generateSecret();
      commitment = generateCommitment(choice, secret);

      console.log('📤 Sending commitment to blockchain...', {
        gameId: gameState.gameId,
        choice,
        commitment: Array.from(commitment),
      });

      // Send commitment to blockchain
      const tx = await program.methods
        .makeCommitment(Array.from(commitment))
        .accounts({
          player: wallet.publicKey,
          game: gamePda,
        })
        .rpc();

      console.log('✅ Commitment transaction successful:', tx);

      // Store choice and secret locally for reveal phase
      setGameState(prev => ({
        ...prev,
        playerChoice: choice,
        playerSecret: secret,
        playerCommitment: commitment,
        phase: 'committing',
        txSignature: tx,
      }));

      // Store commitment using the commitmentService (IndexedDB + localStorage)
      if (wallet.publicKey && gameState.gameId) {
        try {
          await storeCommitment({
            walletAddress: wallet.publicKey.toString(),
            roomId: gameState.gameId,
            choice,
            secret: secret.toString(),
            commitment: Array.from(commitment),
          });
          console.log('💾 Commitment stored securely on your device (IndexedDB + localStorage backup)');
        } catch (error) {
          console.error('⚠️ Failed to store commitment locally:', error);
          // Continue anyway as the commitment is still in state
        }
      }

      addNotification({
        type: 'success',
        title: 'Choice Committed!',
        message: `Your ${choice} choice has been locked on the blockchain.`,
        duration: 3000,
      });

      // Emit WebSocket event to notify other player
      const wsManager = WebSocketManager.getInstance();
      wsManager.sendMessage('commitment_made', {
        type: 'commitment_made',
        roomId: gameState.gameId.toString(),
        playerId: wallet.publicKey.toString(),
        data: {
          gameId: gameState.gameId,
          playerRole: gameState.playerRole,
          status: 'committed',
        },
        timestamp: Date.now(),
      });

      // Start polling to check if both players have committed
      startCommitmentPolling(gameState.gameId);

      return true;
    } catch (error: any) {
      console.error('Error making commitment:', error);

      // Check if the transaction was already processed successfully (Solana quirk)
      if (error.message?.includes('already been processed')) {
        console.log('Transaction was already processed - checking if commitment was made...');

        // Ensure we have the necessary data to check
        if (!gamePda || !secret || !commitment) {
          console.error('Cannot verify commitment - missing data');
          setError(error.message || 'Failed to make choice');
          return false;
        }

        try {
          // Fetch game account to check if commitment was actually made
          const gameAccount = await program.account.game.fetch(gamePda);

          // Re-determine player role
          const checkIsPlayerA = wallet.publicKey.equals(gameAccount.playerA as PublicKey);
          const checkIsPlayerB = wallet.publicKey.equals(gameAccount.playerB as PublicKey);

          const commitmentA = (gameAccount as any).commitmentA;
          const commitmentB = (gameAccount as any).commitmentB;
          const hasPlayerACommitted = commitmentA && commitmentA.length > 0 && !commitmentA.every((byte: number) => byte === 0);
          const hasPlayerBCommitted = commitmentB && commitmentB.length > 0 && !commitmentB.every((byte: number) => byte === 0);
          const hasCurrentPlayerCommitted = checkIsPlayerA ? hasPlayerACommitted : hasPlayerBCommitted;

          if (hasCurrentPlayerCommitted) {
            console.log('✅ Commitment was actually made successfully');

            // Store choice and secret locally for reveal phase
            setGameState(prev => ({
              ...prev,
              playerChoice: choice,
              playerSecret: secret as number,
              playerCommitment: commitment as number[],
              phase: 'committing',
            }));

            // Store commitment using the commitmentService (IndexedDB + localStorage)
            if (wallet.publicKey && gameState.gameId) {
              try {
                await storeCommitment({
                  walletAddress: wallet.publicKey.toString(),
                  roomId: gameState.gameId,
                  choice,
                  secret: secret.toString(),
                  commitment: Array.from(commitment),
                });
                console.log('💾 Commitment stored securely on your device (IndexedDB + localStorage backup)');
              } catch (err) {
                console.error('⚠️ Failed to store commitment locally:', err);
                // Continue anyway as the commitment is still in state
              }
            }

            addNotification({
              type: 'success',
              title: 'Choice Committed!',
              message: `Your ${choice} choice has been locked on the blockchain.`,
              duration: 3000,
            });

            // Emit WebSocket event to notify other player
            const wsManager = WebSocketManager.getInstance();
            wsManager.sendMessage('commitment_made', {
              type: 'commitment_made',
              roomId: gameState.gameId.toString(),
              playerId: wallet.publicKey.toString(),
              data: {
                gameId: gameState.gameId,
                playerRole: gameState.playerRole,
                status: 'committed',
              },
              timestamp: Date.now(),
            });

            // Start polling to check if both players have committed
            startCommitmentPolling(gameState.gameId);

            setLoading(false);
            return true;
          }
        } catch (checkError) {
          console.error('Failed to verify commitment:', checkError);
        }
      }

      setError(error.message || 'Failed to make choice');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, gameState.gameId, generateSecret, generateCommitment, findGamePDA, addNotification, setError, setLoading]);

  // Rejoin existing game - stub implementation
  const rejoinExistingGame = useCallback(async (gameId: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    try {
      console.log('Rejoining game:', gameId);
      // This would contain logic to rejoin an existing game
      // For now, just load the game by finding its PDA
      const gamePda = await findGamePDA(gameId);
      if (gamePda) {
        return await loadGameByPda(gameId, gamePda.toString());
      }
      return false;
    } catch (error: any) {
      setError(error.message || 'Failed to rejoin game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, findGamePDA, loadGameByPda, setError, setLoading]);

  // Join game on blockchain - stub implementation
  const joinGameOnBlockchain = useCallback(async (gameId: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    try {
      console.log('Joining game on blockchain:', gameId);

      // Find the game PDA
      const gamePda = await findGamePDA(gameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      const gameAccount = await program.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const betAmount = (gameAccount as any).betAmount.toNumber();
      const [escrowPda] = deriveEscrowPDA(playerA, gameId);

      // Join the game
      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          playerB: wallet.publicKey,
          playerA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Update game state
      setGameState(prev => ({
        ...prev,
        gameId,
        phase: 'committing',
        playerRole: 'joiner',
        betAmount: betAmount / LAMPORTS_PER_SOL,
        blockchainStatus: 'PlayersReady',
        txSignature: tx,
      }));

      addNotification({
        type: 'success',
        title: 'Joined Game!',
        message: 'Successfully joined the game. Make your choice!',
        duration: 3000,
      });

      // Emit WebSocket event to notify other players
      const wsManager = WebSocketManager.getInstance();
      wsManager.sendMessage('player_joined', {
        type: 'player_joined',
        roomId: gameId.toString(),
        playerId: wallet.publicKey.toString(),
        data: {
          gameId,
          playerB: wallet.publicKey.toString(),
          status: 'PlayersReady',
          txSignature: tx,
        },
        timestamp: Date.now(),
        signature: tx,
      });

      // Subscribe to room updates for this game
      wsManager.subscribeToRoom(gameId.toString());

      return true;
    } catch (error: any) {
      console.error('Error joining game:', error);
      setError(error.message || 'Failed to join game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, findGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);

  // Reveal choice - stub implementation
  const revealChoice = useCallback(async () => {
    if (!program || !wallet.publicKey || !gameState.gameId) {
      setError('Wallet not connected or game not found');
      return false;
    }

    // Try to restore from commitmentService if data is missing (e.g., after hot-reload)
    let playerChoice = gameState.playerChoice;
    let playerSecret = gameState.playerSecret;
    let playerCommitment = gameState.playerCommitment;

    if (!playerChoice || !playerSecret) {
      console.log('⚠️ Player data missing, attempting to restore from commitmentService...');

      try {
        const commitment = await getCommitment(wallet.publicKey.toString(), gameState.gameId);

        if (commitment) {
          playerChoice = commitment.choice as CoinSide;
          playerSecret = parseInt(commitment.secret);
          playerCommitment = commitment.commitment;

          console.log('✅ Restored commitment from local storage:', {
            gameId: gameState.gameId,
            choice: playerChoice,
            source: 'IndexedDB/localStorage',
          });

          // Update state with restored data
          setGameState(prev => ({
            ...prev,
            playerChoice: playerChoice,
            playerSecret: playerSecret,
            playerCommitment: playerCommitment,
          }));
        } else {
          console.error('No commitment found in local storage');
        }
      } catch (e) {
        console.error('Failed to restore from commitmentService:', e);
      }
    }

    // Check again after restore attempt
    if (!playerChoice || !playerSecret) {
      setError('Cannot reveal - choice data is missing. You may need to re-commit.');
      return false;
    }

    setLoading(true);
    try {
      const gamePda = await findGamePDA(gameState.gameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      // Check blockchain state BEFORE attempting reveal
      const gameAccount = await program.account.game.fetch(gamePda);

      // Check game status
      const status = (gameAccount as any).status;
      const statusKey = typeof status === 'object' ? Object.keys(status)[0] : status;

      // If already resolved, no need to reveal
      if (statusKey === 'resolved' || statusKey === 'Resolved') {
        console.log('⚠️ Game is already resolved, no need to reveal');
        addNotification({
          type: 'info',
          title: 'Game Already Resolved',
          message: 'This game has already been resolved!',
          duration: 3000,
        });
        return true;
      }

      // Check if current player already revealed
      const playerA = (gameAccount as any).playerA;
      const isPlayerA = wallet.publicKey.equals(playerA);
      const choiceA = (gameAccount as any).choiceA;
      const choiceB = (gameAccount as any).choiceB;
      const hasPlayerARevealed = choiceA !== null && choiceA !== undefined;
      const hasPlayerBRevealed = choiceB !== null && choiceB !== undefined;
      const hasCurrentPlayerRevealed = isPlayerA ? hasPlayerARevealed : hasPlayerBRevealed;

      if (hasCurrentPlayerRevealed) {
        console.log('⚠️ You have already revealed your choice');
        setError('You have already revealed your choice');
        return false;
      }

      console.log('📊 Reveal check:', {
        status: statusKey,
        isPlayerA,
        hasPlayerARevealed,
        hasPlayerBRevealed,
        canReveal: !hasCurrentPlayerRevealed,
      });

      const [escrowPda] = deriveEscrowPDA(playerA, gameState.gameId);

      // Reveal the choice - use proper enum variant format
      const choiceEnum = playerChoice === 'heads'
        ? { heads: {} }  // Enum variant for Heads
        : { tails: {} }; // Enum variant for Tails

      console.log('📤 Revealing choice:', {
        choice: playerChoice,
        choiceEnum,
        secret: playerSecret,
      });

      const tx = await program.methods
        .revealChoice(
          choiceEnum,
          new BN(playerSecret)
        )
        .accounts({
          player: wallet.publicKey,  // Changed from 'revealer' to 'player'
          game: gamePda,
          escrow: escrowPda,
          playerA,
          playerB: (gameAccount as any).playerB,
          houseWallet: HOUSE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Reveal transaction successful:', tx);

      // IMPORTANT: Re-fetch game state immediately to check if auto-resolution happened
      // When the second player reveals, the smart contract auto-resolves the game
      console.log('🔍 Re-fetching game state to check for auto-resolution...');
      const updatedGameAccount = await program.account.game.fetch(gamePda);
      const updatedStatus = (updatedGameAccount as any).status;
      const updatedStatusKey = typeof updatedStatus === 'object' ? Object.keys(updatedStatus)[0] : updatedStatus;

      console.log('📊 Updated game status after reveal:', updatedStatusKey);

      setGameState(prev => ({
        ...prev,
        txSignature: tx,
        isPlayerRevealed: true,
      }));

      // Check if game auto-resolved (second player revealed)
      if (updatedStatusKey === 'resolved' || updatedStatusKey === 'Resolved') {
        console.log('🎉 Game auto-resolved after second reveal!');
        addNotification({
          type: 'success',
          title: 'Game Resolved!',
          message: 'Both players revealed. Determining winner...',
          duration: 3000,
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Choice Revealed!',
          message: 'Your choice has been revealed. Waiting for opponent to reveal...',
          duration: 3000,
        });
      }

      // Emit WebSocket event to notify other player
      const wsManager = WebSocketManager.getInstance();
      wsManager.sendMessage('choice_revealed', {
        type: 'choice_revealed',
        roomId: gameState.gameId.toString(),
        playerId: wallet.publicKey.toString(),
        data: {
          gameId: gameState.gameId,
          playerRole: gameState.playerRole,
          status: 'revealed',
          gameResolved: updatedStatusKey === 'resolved' || updatedStatusKey === 'Resolved',
        },
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      console.error('Error revealing choice:', error);

      // Check if the transaction was already processed (game already resolved)
      if (error.message?.includes('already been processed')) {
        console.log('Transaction was already processed - checking if game was resolved...');

        try {
          const gamePda = await findGamePDA(gameState.gameId);
          if (!gamePda) {
            setError('Game not found');
            return false;
          }

          const gameAccount = await program.account.game.fetch(gamePda);
          const status = (gameAccount as any).status;
          const statusKey = typeof status === 'object' ? Object.keys(status)[0] : status;

          // If game is resolved, this is actually success
          if (statusKey === 'resolved' || statusKey === 'Resolved') {
            console.log('✅ Game was actually resolved successfully');

            setGameState(prev => ({
              ...prev,
              isPlayerRevealed: true,
            }));

            addNotification({
              type: 'success',
              title: 'Game Resolved!',
              message: 'The game has been resolved. Check the results!',
              duration: 3000,
            });

            return true;
          }

          // If revealing phase, check who revealed
          if (statusKey === 'revealingPhase' || statusKey === 'RevealingPhase') {
            const playerA = (gameAccount as any).playerA;
            const isPlayerA = wallet.publicKey.equals(playerA);
            const choiceA = (gameAccount as any).choiceA;
            const choiceB = (gameAccount as any).choiceB;
            const hasPlayerARevealed = choiceA !== null && choiceA !== undefined;
            const hasPlayerBRevealed = choiceB !== null && choiceB !== undefined;
            const hasCurrentPlayerRevealed = isPlayerA ? hasPlayerARevealed : hasPlayerBRevealed;

            if (hasCurrentPlayerRevealed) {
              // Current player DID reveal (transaction succeeded despite error)
              console.log('✅ Your reveal was actually successful (RevealingPhase)');

              setGameState(prev => ({
                ...prev,
                isPlayerRevealed: true,
              }));

              addNotification({
                type: 'success',
                title: 'Choice Revealed!',
                message: 'Your choice has been revealed. Waiting for opponent...',
                duration: 3000,
              });

              return true;
            } else {
              // Opponent revealed first
              console.log('⚠️ Opponent revealed first, game is in revealing phase');
              setError('Opponent revealed their choice first. Click reveal again.');
              return false;
            }
          }

          // Unknown state
          console.error('Unexpected game status after reveal error:', statusKey);
          setError('Unexpected game state');
          return false;
        } catch (checkError) {
          console.error('Error checking game status:', checkError);
          setError(error.message || 'Failed to reveal choice');
          return false;
        }
      }

      setError(error.message || 'Failed to reveal choice');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, gameState.gameId, gameState.playerChoice, gameState.playerSecret, findGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);

  return {
    // State
    gameState,
    notifications,

    // Actions
    createGame,
    makeChoice,
    joinGameOnBlockchain,
    joinExistingGame,
    rejoinExistingGame,
    loadGameByPda,
    fetchGameData,
    revealChoice,
    resetGame,
    cancelGame,
    resolveGameManual,

    // Utilities
    generateGameId,

    // Notifications
    addNotification,
    dismissNotification,
    clearNotifications,
  };
};
