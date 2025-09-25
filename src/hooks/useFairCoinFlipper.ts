import { useCallback, useState, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sha256 } from 'js-sha256';
// Import IDL - fallback if direct import doesn't work
let fairCoinFlipperIdl: any;
try {
  fairCoinFlipperIdl = require('../idl/fair_coin_flipper.json');
} catch {
  // Fallback IDL structure
  fairCoinFlipperIdl = {
    version: "0.1.0",
    name: "fair_coin_flipper",
    instructions: [],
    accounts: []
  };
}

// Program configuration
const PROGRAM_ID = new PublicKey('7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6');
const HOUSE_WALLET = new PublicKey('HouseWalletPublicKeyHere123456789012345678901234');

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

  // Utility Functions
  const generateSecret = useCallback((): number => {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }, []);

  const generateCommitment = useCallback((choice: CoinSide, secret: number): number[] => {
    const choiceStr = choice === 'heads' ? 'heads' : 'tails';
    const secretBytes = new BN(secret).toArrayLike(Buffer, 'le', 8);
    
    const hash = sha256.create();
    hash.update(choiceStr);
    hash.update(secretBytes);
    
    return Array.from(new Uint8Array(hash.arrayBuffer()));
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
  const createGame = useCallback(async (betAmount: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    if (betAmount < MIN_BET_SOL || betAmount > MAX_BET_SOL) {
      setError(`Bet amount must be between ${MIN_BET_SOL} and ${MAX_BET_SOL} SOL`);
      return false;
    }

    setLoading(true);
    setError(null);

    // Try up to 3 times with different game IDs in case of collision
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        // Generate unique game data
        const gameId = generateGameId();

        // Derive PDAs
        const [gamePda] = deriveGamePDA(wallet.publicKey, gameId);
        const [escrowPda] = deriveEscrowPDA(wallet.publicKey, gameId);

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

      // Start polling for opponent
      console.log('🔍 Starting game polling...');
      startGamePolling(gameId);

      return true;
      } catch (error: any) {
        attempts++;
        console.error(`Error creating game (attempt ${attempts}/${maxAttempts}):`, error);

        // Check for retryable errors
        const isRetryable =
          error.message?.includes('already been processed') ||
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
        return false;
      }
    }

    // If all attempts failed
    setError('Failed to create game after multiple attempts. Please try again.');
    setLoading(false);
    return false;
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

  // Polling functions
  const startGamePolling = useCallback((gameId: number) => {
    pollingIntervalRef.current = setInterval(async () => {
      if (!program) return;

      try {
        const gamePda = await findGamePDA(gameId);
        if (!gamePda) return;

        const gameAccount = await program.account.game.fetch(gamePda);
        const status = (gameAccount as any).status;

        if ('playersReady' in status) {
          setGameState(prev => ({
            ...prev,
            phase: 'committing',
            blockchainStatus: 'PlayersReady',
          }));
          startCommitmentPolling(gameId);
        } else if ('commitmentsReady' in status) {
          setGameState(prev => ({
            ...prev,
            phase: 'revealing',
            blockchainStatus: 'CommitmentsReady',
          }));
        } else if ('revealingPhase' in status) {
          setGameState(prev => ({
            ...prev,
            phase: 'revealing',
            blockchainStatus: 'RevealingPhase',
          }));
        } else if ('resolved' in status) {
          setGameState(prev => ({
            ...prev,
            phase: 'resolved',
            blockchainStatus: 'Resolved',
          }));
          // Handle game resolution inline
          setGameState(prev => ({
            ...prev,
            phase: 'resolved',
            blockchainStatus: 'Resolved',
            resolvedAt: Date.now(),
          }));
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
      } catch (error: any) {
        console.error('Error polling game:', error);
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
    if (!program || !wallet.publicKey || !targetGameId) {
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

      const tx = await program.methods
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

      const gameAccount = await program.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const playerB = (gameAccount as any).playerB;
      const [escrowPda] = deriveEscrowPDA(playerA, targetGameId);

      console.log('🔧 Manually resolving game:', {
        gameId: targetGameId,
        gamePda: gamePda.toString(),
      });

      await program.methods
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

      const gameAccount = await program.account.game.fetch(gamePda);
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

      // Update game state
      setGameState(prev => ({
        ...prev,
        gameId,
        phase,
        blockchainStatus,
        playerRole: isPlayerA ? 'creator' : 'joiner',
        betAmount,
        isLoading: false,
        error: null,
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

    setLoading(true);
    try {
      const secret = generateSecret();
      const commitment = generateCommitment(choice, secret);

      setGameState(prev => ({
        ...prev,
        playerChoice: choice,
        playerSecret: secret,
        playerCommitment: commitment,
        phase: 'committing',
      }));

      addNotification({
        type: 'success',
        title: 'Choice Made!',
        message: `You chose ${choice}. Waiting for opponent...`,
        duration: 3000,
      });

      return true;
    } catch (error: any) {
      setError(error.message || 'Failed to make choice');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, gameState.gameId, generateSecret, generateCommitment, addNotification, setError, setLoading]);

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

      return true;
    } catch (error: any) {
      console.error('Error joining game:', error);
      setError(error.message || 'Failed to join game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey, findGamePDA, deriveEscrowPDA, addNotification, setError, setLoading]);

  // Handle game resolution - stub implementation
  const handleGameResolution = useCallback(async (gameAccount: any) => {
    try {
      console.log('Handling game resolution:', gameAccount);

      // Extract resolution data from game account
      const winner = (gameAccount as any).winner;
      const coinResult = (gameAccount as any).coinResult;
      const winnerPayout = (gameAccount as any).winnerPayout;
      const houseFee = (gameAccount as any).houseFee;

      setGameState(prev => ({
        ...prev,
        phase: 'resolved',
        blockchainStatus: 'Resolved',
        winner: winner?.toString() || null,
        coinResult: coinResult === 0 ? 'heads' : 'tails',
        winnerPayout: winnerPayout ? winnerPayout.toNumber() / LAMPORTS_PER_SOL : null,
        houseFee: houseFee ? houseFee.toNumber() / LAMPORTS_PER_SOL : null,
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
    console.log('Starting commitment polling for game:', gameId);

    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll for commitment updates
    pollingIntervalRef.current = setInterval(async () => {
      if (!program) return;

      try {
        const gamePda = await findGamePDA(gameId);
        if (!gamePda) return;

        const gameAccount = await program.account.game.fetch(gamePda);
        const status = (gameAccount as any).status;

        if ('commitmentsReady' in status || 'revealingPhase' in status) {
          setGameState(prev => ({
            ...prev,
            phase: 'revealing',
            blockchainStatus: 'commitmentsReady' in status ? 'CommitmentsReady' : 'RevealingPhase',
          }));
        } else if ('resolved' in status) {
          await handleGameResolution(gameAccount);
        }
      } catch (error) {
        console.error('Error in commitment polling:', error);
      }
    }, 2000);
  }, [program, findGamePDA, handleGameResolution]);

  // Reveal choice - stub implementation
  const revealChoice = useCallback(async () => {
    if (!program || !wallet.publicKey || !gameState.gameId || !gameState.playerChoice || !gameState.playerSecret) {
      setError('Invalid state for revealing choice');
      return false;
    }

    setLoading(true);
    try {
      const gamePda = await findGamePDA(gameState.gameId);
      if (!gamePda) {
        throw new Error('Game not found');
      }

      const gameAccount = await program.account.game.fetch(gamePda);
      const playerA = (gameAccount as any).playerA;
      const [escrowPda] = deriveEscrowPDA(playerA, gameState.gameId);

      // Reveal the choice
      const tx = await program.methods
        .revealChoice(
          gameState.playerChoice === 'heads' ? 0 : 1,
          new BN(gameState.playerSecret)
        )
        .accounts({
          game: gamePda,
          escrow: escrowPda,
          revealer: wallet.publicKey,
          playerA,
          playerB: (gameAccount as any).playerB,
          houseWallet: HOUSE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setGameState(prev => ({
        ...prev,
        txSignature: tx,
      }));

      addNotification({
        type: 'success',
        title: 'Choice Revealed!',
        message: 'Your choice has been revealed. Waiting for game resolution...',
        duration: 3000,
      });

      return true;
    } catch (error: any) {
      console.error('Error revealing choice:', error);
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
