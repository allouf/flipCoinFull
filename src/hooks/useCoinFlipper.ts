import {
  useCallback, useState, useRef, useEffect,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import { getExplorerUrl } from '../config/program';

export interface GameState {
  roomId: number | null;
  isCreator: boolean;
  betAmount: number;
  playerSelection: 'heads' | 'tails' | null;
  opponentSelection: boolean;
  gameStatus: 'idle' | 'waiting' | 'selecting' | 'resolving' | 'completed';
  winner: string | null;
  txSignature: string | null;
  selectionDeadline: number | null; // Unix timestamp in seconds
  lastUpdated: number; // Timestamp for optimistic UI updates
  isStale: boolean; // Indicates if data might be outdated
}

interface ErrorType {
  message?: string;
}

export const useCoinFlipper = () => {
  const { publicKey } = useWallet();
  const {
    program,
    createRoom,
    joinRoom,
    makeSelection,
    resolveGame,
    fetchGameRoom,
    fetchAllGameRooms,
    handleTimeout,
    cancelRoom,
    forceRefreshAllRooms,
    forceRefreshGameRoom,
    clearRpcCache,
    getRpcStats,
    isRpcCircuitOpen,
  } = useAnchorProgram();

  const [gameState, setGameState] = useState<GameState>({
    roomId: null,
    isCreator: false,
    betAmount: 0,
    playerSelection: null,
    opponentSelection: false,
    gameStatus: 'idle',
    winner: null,
    txSignature: null,
    selectionDeadline: null,
    lastUpdated: Date.now(),
    isStale: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userWantsToLeaveRef = useRef(false); // Track user intent to leave
  const abandonedRoomRef = useRef<number | null>(null); // Track abandoned room ID

  // Intelligent game state update that uses cached data efficiently
  const updateGameState = useCallback(async (roomId: number, userInitiated = false) => {
    if (!program || !publicKey) return;

    try {
      // Mark data as potentially stale during update
      setGameState((prev) => ({ ...prev, isStale: true }));

      const room = await fetchGameRoom(roomId, userInitiated);

      if (!room) {
        console.warn('Room not found during update, may have been closed');
        setGameState((prev) => ({ ...prev, isStale: false }));
        return;
      }

      // Check if the current wallet is one of the players
      const isPlayer1 = room.player1.toString() === publicKey.toString();
      const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();

      if (!isPlayer1 && !isPlayer2) {
        console.warn('Current player is not part of this room');
        setGameState((prev) => ({ ...prev, isStale: false }));
        return;
      }

      // Determine game status based on room state
      let gameStatus: 'waiting' | 'selecting' | 'resolving' | 'completed' = 'waiting';
      let playerSelection: 'heads' | 'tails' | null = null;
      let opponentSelection = false;
      let winner: string | null = null;
      let selectionDeadline: number | null = null;
      // Extract selection deadline if available
      if (room.selectionDeadline) {
        selectionDeadline = room.selectionDeadline.toNumber
          ? room.selectionDeadline.toNumber()
          : room.selectionDeadline;
      }

      if (room.status && 'waitingForPlayer' in room.status) {
        gameStatus = 'waiting';
      } else if (room.status && 'selectionsPending' in room.status) {
        // Check if both players have made selections
        const bothSelected = room.player1Selection && room.player2Selection;
        
        if (bothSelected) {
          // Both players selected but room still in SelectionsPending - should be ready for resolution
          gameStatus = 'resolving';
          console.log('🎯 Detected game ready for resolution: both players selected but room still in SelectionsPending state');
        } else {
          gameStatus = 'selecting';
        }
        
        // Check if current player has already made selection
        if (isPlayer1 && room.player1Selection) {
          playerSelection = 'heads' in room.player1Selection ? 'heads' : 'tails';
        } else if (isPlayer2 && room.player2Selection) {
          playerSelection = 'heads' in room.player2Selection ? 'heads' : 'tails';
        }
        // Check if opponent has made selection
        if (isPlayer1 && room.player2Selection) {
          opponentSelection = true;
        } else if (isPlayer2 && room.player1Selection) {
          opponentSelection = true;
        }
      } else if (room.status && 'resolving' in room.status) {
        gameStatus = 'resolving';

        // REMOVED AUTOMATIC VRF RESOLUTION to prevent wallet spam
        // User must manually resolve games to avoid unwanted transaction prompts
        if (room.player1Selection && room.player2Selection) {
          console.log('🎲 Both players selected - game ready for manual resolution');
          // Just log the state, no automatic resolution
        }
      } else if (room.status && 'completed' in room.status) {
        gameStatus = 'completed';
        if (room.winner) {
          const isWinner = room.winner.toString() === publicKey.toString();
          winner = isWinner ? 'You won!' : 'You lost!';
        }
      } else if (room.status && 'cancelled' in room.status) {
        gameStatus = 'completed';
        winner = 'Game was cancelled - funds refunded';
      }

      setGameState((prev) => {
        const newState = {
          ...prev,
          roomId,
          isCreator: isPlayer1,
          betAmount: Number(room.betAmount) / 1e9,
          playerSelection,
          opponentSelection,
          gameStatus,
          winner,
          selectionDeadline,
          lastUpdated: Date.now(),
          isStale: false,
        };

        // Log state transitions for debugging
        if (prev && prev.gameStatus !== gameStatus) {
          console.log(`🎯 Game State Transition: ${prev.gameStatus} → ${gameStatus} (Room: ${roomId})`);
          if (winner) {
            console.log(`🏆 Game Result: ${winner}`);
          }
        }

        return newState;
      });

      if (userInitiated) {
        console.log('✅ Game state refreshed by user:', {
          gameStatus,
          playerSelection,
          opponentSelection,
          winner,
        });
      }
    } catch (err) {
      console.error('Error updating game state:', err);
      setGameState((prev) => ({ ...prev, isStale: false }));
    }
  }, [program, publicKey, fetchGameRoom]);

  // Smart background refresh - MUCH less aggressive, only for critical states
  useEffect(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Monitor game state for issues and alert user
    if (gameState.roomId && gameState.gameStatus !== 'idle' && gameState.gameStatus !== 'completed') {
      // Check for games stuck too long in any state
      const stateAge = Date.now() - gameState.lastUpdated;
      const maxStateAge = {
        waiting: 300000, // 5 minutes
        selecting: 600000, // 10 minutes
        resolving: 300000, // 5 minutes
      };
      
      const maxAge = maxStateAge[gameState.gameStatus as keyof typeof maxStateAge];
      if (maxAge && stateAge > maxAge) {
        console.log(`⚠️ Game has been stuck in ${gameState.gameStatus} state for ${Math.floor(stateAge / 60000)} minutes (Room: ${gameState.roomId})`);
      }
    }

    // Enhanced background refresh for resolving games with user feedback
    if (
      gameState.roomId
      && gameState.gameStatus === 'resolving'
      && !isRpcCircuitOpen()
      && !userWantsToLeaveRef.current
    ) {
      console.log(
        '🔄 Starting intelligent background refresh for resolving game:',
        gameState.roomId,
      );

      let refreshAttempts = 0;
      const maxRefreshAttempts = 12; // 6 minutes of attempts

      // Progressive refresh intervals: more frequent initially, then slower
      const getRefreshInterval = (attempt: number) => {
        if (attempt < 3) return 15000;  // First 3 attempts every 15 seconds
        if (attempt < 6) return 30000;  // Next 3 attempts every 30 seconds
        return 60000;                   // After that, every minute
      };

      const doBackgroundRefresh = async () => {
        if (userWantsToLeaveRef.current || !gameState.roomId) {
          console.log('🚫 Stopping background refresh - user wants to leave or no active game');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        // Only refresh if data isn't too fresh
        const timeSinceUpdate = Date.now() - gameState.lastUpdated;
        if (timeSinceUpdate > 10000) { // Only if 10+ seconds since last update
          try {
            console.log(`🔄 Background refresh attempt ${refreshAttempts + 1}/${maxRefreshAttempts}`);
            await updateGameState(gameState.roomId, false);
            
            // Check if game has progressed to completed state
            const room = await fetchGameRoom(gameState.roomId, false);
            if (room && room.status && 'completed' in room.status) {
              console.log('🎉 Game completed - stopping background refresh');
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              return;
            }
            
          } catch (err) {
            console.warn(`⚠️ Background refresh attempt ${refreshAttempts + 1} failed:`, err);
            
            // After several failed attempts, provide user guidance
            if (refreshAttempts > 6) {
              setError('Game resolution is taking longer than expected. You may need to manually resolve the game or handle timeout.');
            }
          }
        }

        refreshAttempts++;
        
        // Stop background refresh after max attempts and provide clear guidance
        if (refreshAttempts >= maxRefreshAttempts) {
          console.log('⏰ Background refresh timeout - providing user guidance');
          setError('Game has been stuck in resolving state. Please try: 1) "Resolve Game Manually", 2) "Handle Timeout", or 3) "Force Abandon" in emergency controls.');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        // Schedule next refresh with progressive interval
        if (pollingIntervalRef.current) {
          clearTimeout(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setTimeout(doBackgroundRefresh, getRefreshInterval(refreshAttempts));
      };

      // Start the first refresh
      pollingIntervalRef.current = setTimeout(doBackgroundRefresh, 15000); // First check after 15 seconds
    }

    // Cleanup on unmount or when game ends
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [
    gameState.roomId,
    gameState.gameStatus,
    gameState.lastUpdated,
    updateGameState,
    isRpcCircuitOpen,
  ]);

  // Backward compatibility alias for checkGameStatus
  const checkGameStatus = updateGameState;

  // Create a new game room
  const handleCreateRoom = useCallback(async (betAmountSol: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    if (loading) {
      return undefined;
    }

    // Reset leave intent when creating new game (but keep abandoned room memory)
    userWantsToLeaveRef.current = false;
    // Don't reset abandonedRoomRef - we want to remember stuck games permanently

    setLoading(true);
    setError(null);

    try {
      // Generate random room ID
      const roomId = Math.floor(Math.random() * 1000000);

      // Add a small delay to prevent rapid-fire requests
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });

      const { tx, gameRoomPda } = await createRoom(roomId, betAmountSol);

      setGameState({
        roomId,
        isCreator: true,
        betAmount: betAmountSol,
        playerSelection: null,
        opponentSelection: false,
        gameStatus: 'waiting',
        winner: null,
        txSignature: tx,
        selectionDeadline: null, // Will be set when room transitions to selecting
        lastUpdated: Date.now(),
        isStale: false,
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room created:', {
          roomId,
          pda: gameRoomPda.toString(),
          tx: getExplorerUrl(tx),
        });
      }

      return { roomId, tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to create room';

      if (errorObj.message?.includes('Insufficient SOL balance')) {
        // Pass through the detailed balance error message
        errorMessage = errorObj.message;
      } else if (errorObj.message?.includes('insufficient lamports')) {
        // Handle the blockchain-level error
        errorMessage = 'Insufficient SOL balance to cover the bet amount and '
          + 'transaction fees. Please add more SOL to your wallet.';
      } else if (
        errorObj.message?.includes('429')
        || errorObj.message?.includes('Too many requests')
      ) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (errorObj.message?.includes('CORS')) {
        errorMessage = 'Network connection issue. Please check your internet connection.';
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, createRoom, loading]);

  // Rejoin an existing game room that the player is already part of
  const handleRejoinRoom = useCallback(async (roomId: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    // IMPROVED: Check if this is a legitimate rejoin case
    // Allow rejoining abandoned rooms if:
    // 1. User is actually a participant in the room
    // 2. Game is still in progress (not completed/cancelled)
    // 3. Timeout hasn't exceeded reasonable limits
    if (abandonedRoomRef.current === roomId) {
      console.log('🔍 Checking if abandoned room can be legitimately rejoined:', roomId);
      try {
        // Fetch current room state to validate rejoin eligibility
        const room = await fetchGameRoom(roomId, true);
        if (!room) {
          throw new Error(`Room ${roomId} not found or has been deleted`);
        }

        // Check if user is actually a participant
        const isPlayer1 = room.player1.toString() === publicKey.toString();
        const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
        
        if (!isPlayer1 && !isPlayer2) {
          throw new Error(`Cannot rejoin room ${roomId}: You are not a participant in this game`);
        }

        // Check if game is still in progress
        const isGameInProgress = room.status && (
          'selectionsPending' in room.status
          || 'resolving' in room.status
        );
        
        if (!isGameInProgress) {
          let statusName = 'Unknown';
          if (room.status) {
            if ((room.status as any).waitingForPlayer) {
              statusName = 'WaitingForPlayer';
            } else if ((room.status as any).completed) {
              statusName = 'Completed';
            } else if ((room.status as any).cancelled) {
              statusName = 'Cancelled';
            }
          }
          throw new Error(`Cannot rejoin room ${roomId}: Game is not in progress (status: ${statusName})`);
        }

        // Check timeout status
        if (room.selectionDeadline) {
          const now = Math.floor(Date.now() / 1000);
        const deadline = room.selectionDeadline.toNumber
          ? room.selectionDeadline.toNumber()
          : room.selectionDeadline;
          const timeoutThreshold = 300; // 5 minutes grace period after deadline
          
          if (now > deadline + timeoutThreshold) {
            throw new Error(`Cannot rejoin room ${roomId}: Game has been timed out for too long. Use "Handle Timeout" to claim refunds`);
          }
        }

        // All checks passed - allow rejoin
        console.log('✅ Abandoned room rejoin approved - user is a legitimate participant');
        // Clear the abandoned flag since we're allowing the rejoin
        abandonedRoomRef.current = null;
      } catch (err) {
        console.log('❌ Abandoned room rejoin denied:', err instanceof Error ? err.message : err);
        throw err;
      }
    }

    // Reset leave intent when rejoining game
    userWantsToLeaveRef.current = false;

    setLoading(true);
    setError(null);

    try {
      // Fetch room details to restore game state
      const room = await fetchGameRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Check if the current wallet is one of the players
      const isPlayer1 = room.player1.toString() === publicKey.toString();
      const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
      if (!isPlayer1 && !isPlayer2) {
        throw new Error('You are not a player in this room');
      }

      // Determine game status based on room state
      let gameStatus: 'waiting' | 'selecting' | 'resolving' | 'completed' = 'waiting';
      let playerSelection: 'heads' | 'tails' | null = null;
      let opponentSelection = false;
      let winner: string | null = null;
      let selectionDeadline: number | null = null;
      // Extract selection deadline if available
      if (room.selectionDeadline) {
        selectionDeadline = room.selectionDeadline.toNumber
          ? room.selectionDeadline.toNumber()
          : room.selectionDeadline;
      }

      if (room.status && 'selectionsPending' in room.status) {
        gameStatus = 'selecting';
        // Check if current player has already made selection
        if (isPlayer1 && room.player1Selection) {
          playerSelection = 'heads' in room.player1Selection ? 'heads' : 'tails';
        } else if (isPlayer2 && room.player2Selection) {
          playerSelection = 'heads' in room.player2Selection ? 'heads' : 'tails';
        }
        // Check if opponent has made selection
        if (isPlayer1 && room.player2Selection) {
          opponentSelection = true;
        } else if (isPlayer2 && room.player1Selection) {
          opponentSelection = true;
        }
      } else if (room.status && 'resolving' in room.status) {
        gameStatus = 'resolving';
      } else if (room.status && 'completed' in room.status) {
        gameStatus = 'completed';
      } else if (room.status && 'cancelled' in room.status) {
        gameStatus = 'completed';
        winner = 'Game was cancelled - funds refunded';
      }

      setGameState({
        roomId,
        isCreator: isPlayer1, // Player1 is the creator
        betAmount: Number(room.betAmount) / 1e9,
        playerSelection,
        opponentSelection,
        gameStatus,
        winner: winner || (room.winner ? 'Game completed' : null),
        txSignature: null, // No new transaction for rejoining
        selectionDeadline,
        lastUpdated: Date.now(),
        isStale: false,
      });

      console.log('Rejoined room:', {
        roomId,
        gameStatus,
        playerSelection,
        opponentSelection,
      });

      return { roomId };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to rejoin room';
      if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, fetchGameRoom]);

  // Join an existing game room
  const handleJoinRoom = useCallback(async (roomId: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    // Reset leave intent when joining game (but keep abandoned room memory)
    userWantsToLeaveRef.current = false;
    // Don't reset abandonedRoomRef - we want to remember stuck games permanently

    setLoading(true);
    setError(null);

    try {
      const { tx } = await joinRoom(roomId, 0); // betAmountSol is retrieved internally

      // Fetch room details to get bet amount
      const room = await fetchGameRoom(roomId);

      setGameState({
        roomId,
        isCreator: false,
        betAmount: room ? Number(room.betAmount) / 1e9 : 0,
        playerSelection: null,
        opponentSelection: false,
        gameStatus: 'selecting',
        winner: null,
        txSignature: tx,
        selectionDeadline: (() => {
          if (!room || !room.selectionDeadline) return null;
          return room.selectionDeadline.toNumber
            ? room.selectionDeadline.toNumber()
            : room.selectionDeadline;
        })(),
        lastUpdated: Date.now(),
        isStale: false,
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room joined:', { roomId, tx: getExplorerUrl(tx) });
      }

      return { roomId, tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to join room';

      if (errorObj.message?.includes('Insufficient SOL balance')) {
        // Pass through the detailed balance error message
        errorMessage = errorObj.message;
      } else if (errorObj.message?.includes('insufficient lamports')) {
        // Handle the blockchain-level error
        errorMessage = 'Insufficient SOL balance to cover the bet amount and '
          + 'transaction fees. Please add more SOL to your wallet.';
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, joinRoom, fetchGameRoom]);

  // Make heads or tails selection
  const handleMakeSelection = useCallback(async (selection: 'heads' | 'tails') => {
    if (!program || !publicKey || !gameState.roomId) {
      setError('Invalid game state');
      return undefined;
    }

    console.log(`🎲 Making selection: ${selection} for room ${gameState.roomId}`);
    setLoading(true);
    setError(null);

    try {
      const { tx } = await makeSelection(gameState.roomId, selection);

      setGameState((prev) => ({
        ...prev,
        playerSelection: selection,
        gameStatus: 'resolving',
        txSignature: tx,
      }));

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Selection made:', {
          roomId: gameState.roomId,
          selection,
          tx: getExplorerUrl(tx),
        });
      }

      // Enhanced post-selection state management
      setTimeout(async () => {
        if (gameState.roomId) {
          try {
            console.log('🔄 Post-selection state refresh for room:', gameState.roomId);
            await updateGameState(gameState.roomId, true); // User-initiated after their action
            
            // Check if both players have now selected
            const room = await fetchGameRoom(gameState.roomId, true);
            if (room && room.player1Selection && room.player2Selection) {
              console.log('🎯 Both players have selected - game ready for resolution');
              
              // Update local state to reflect readiness for resolution
              setGameState(prev => ({
                ...prev,
                gameStatus: 'resolving',
                opponentSelection: true,
                lastUpdated: Date.now(),
                isStale: false
              }));
              
              // Clear any existing errors since game is progressing normally
              setError(null);
            }
          } catch (err) {
            console.warn('⚠️ Failed to refresh game state after selection:', err);
            // Set a helpful error but don't break the selection flow
            setError('Your selection was made successfully, but we\'re having trouble refreshing the game state. Try clicking "Refresh Game State" if needed.');
          }
        }
      }, 2000); // Reduced delay for faster feedback

      return { tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      setError(errorObj.message || 'Failed to make selection');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, gameState.roomId, makeSelection, gameState.gameStatus, updateGameState]);

  // Leave/Cancel game - reset local state without blockchain transaction
  const leaveGame = useCallback((options: { isTimeout?: boolean; isStuck?: boolean } = {}) => {
    console.log('🚪 User initiated leave game - disabling automatic actions');

    // Only mark as abandoned if this is a stuck/problematic game
    // Don't abandon games that are working normally or can be rejoined
    if (gameState.roomId) {
      // Check if this is truly a stuck game that should be abandoned
      const isStuckGame = options.isStuck || (
        (gameState.gameStatus === 'resolving' && error && error.includes('VRF'))
        || (gameState.gameStatus === 'selecting' && options.isTimeout)
        || (gameState.gameStatus === 'waiting' && error)
      );
      
      if (isStuckGame) {
        abandonedRoomRef.current = gameState.roomId;
        console.log('🚫 Marking room as abandoned due to stuck state:', gameState.roomId);
      } else {
        console.log('ℹ️ Leaving room normally without abandoning:', gameState.roomId);
      }
    }

    // Set flag to prevent any automatic VRF resolution
    userWantsToLeaveRef.current = true;

    // Clear polling immediately
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Reset game state
    setGameState({
      roomId: null,
      isCreator: false,
      betAmount: 0,
      playerSelection: null,
      opponentSelection: false,
      gameStatus: 'idle',
      winner: null,
      txSignature: null,
      selectionDeadline: null,
      lastUpdated: Date.now(),
      isStale: false,
    });
    setError(null);

    console.log('✅ Game left successfully - all automatic actions disabled');
  }, [gameState.roomId, gameState.gameStatus, error]);

  // Reset game state (alias for backward compatibility)
  const resetGame = useCallback(() => {
    leaveGame();
  }, [leaveGame]);

  // Check if a room is timed out based on selectionDeadline
  const isRoomTimedOut = useCallback(async (roomId: number) => {
    if (!program || !publicKey) return false;
    try {
      const room = await fetchGameRoom(roomId);
      if (!room || !room.selectionDeadline) return false;
      const now = Math.floor(Date.now() / 1000);
      const deadline = room.selectionDeadline.toNumber
        ? room.selectionDeadline.toNumber()
        : room.selectionDeadline;
      console.log('Timeout check:', {
        now,
        deadline,
        isTimedOut: now > deadline,
        roomId,
      });

      return now > deadline;
    } catch (err) {
      console.error('Error checking timeout:', err);
      return false;
    }
  }, [program, publicKey, fetchGameRoom]);

  // Handle timeout for a specific room
  const handleGameTimeout = useCallback(async (roomId: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    setLoading(true);
    setError(null);

    // Set user wants to leave flag to prevent background interference
    const wasLeavingBefore = userWantsToLeaveRef.current;
    userWantsToLeaveRef.current = true;

    try {
      console.log('🔄 Handling timeout for room:', roomId);
      const { tx } = await handleTimeout(roomId);
      
      // Clear abandoned room since timeout was successful
      if (abandonedRoomRef.current === roomId) {
        abandonedRoomRef.current = null;
        console.log('✅ Cleared abandoned room after successful timeout');
      }
      
      // Reset game state after timeout handling
      setGameState((prev) => ({
        ...prev,
        gameStatus: 'completed',
        winner: 'Game timed out - funds refunded',
        txSignature: tx,
      }));

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Game timeout handled:', {
          roomId,
          tx: getExplorerUrl(tx),
        });
      }

      return { tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to handle timeout';
      if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      // Check for specific errors
      if (errorMessage.includes('ConstraintMut') && errorMessage.includes('player_2')) {
        errorMessage = 'Cannot handle timeout: Game has no second player. Try "Leave Game" instead.';
      } else if (errorMessage.includes('AccountDidNotSerialize')) {
        errorMessage = 'Game account is corrupted. Use "Leave Game" to abandon this room.';
      } else if (errorMessage.includes('no second player')) {
        errorMessage = 'This game never had a second player. Use "Leave Game" to exit.';
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
      // Only restore leave state if we weren't leaving before AND timeout succeeded
      if (!wasLeavingBefore && !error) {
        userWantsToLeaveRef.current = false;
      }
    }
  }, [program, publicKey, handleTimeout, error]);

  // Check for existing games that the player is part of - MANUAL ONLY, NO AUTO-REJOIN
  const checkForExistingGame = useCallback(async () => {
    if (!program || !publicKey) {
      return;
    }

    // CRITICAL FIX: Never automatically rejoin games to prevent stuck states
    // Users should have full control over which games they want to participate in
    console.log('🔍 Checking for existing games (manual detection only - no auto-rejoin)');
    
    try {
      // Only scan for existing games to warn the user, but don't auto-rejoin
      const allRooms = await fetchAllGameRooms({ userInitiated: false, priority: 'low' });
      const playerRooms = allRooms.filter((room) => {
        const roomIdNumber = room.roomId.toNumber();
        const isPlayer1 = room.player1.toString() === publicKey.toString();
        const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
        
        // Skip abandoned rooms
        if (abandonedRoomRef.current === roomIdNumber) {
          return false;
        }
        
        return (isPlayer1 || isPlayer2)
          && (room.status && ('selectionsPending' in room.status || 'resolving' in room.status))
          && !(room.status && 'cancelled' in room.status);
      });

      if (playerRooms.length > 0) {
        console.log(`⚠️ Found ${playerRooms.length} active game(s) but NOT auto-rejoining. User has control.`);
        // Store the information for UI to display, but don't auto-rejoin
        // UI can show "You have X pending games" with manual rejoin options
      }
    } catch (err) {
      console.error('Error checking for existing games:', err);
    }
  }, [program, publicKey, fetchAllGameRooms]);

  // Check current room timeout status
  const checkCurrentRoomTimeout = useCallback(async () => {
    if (!gameState.roomId) return false;
    return isRoomTimedOut(gameState.roomId);
  }, [gameState.roomId, isRoomTimedOut]);

  // User-controlled refresh methods
  const refreshGameState = useCallback(async () => {
    if (gameState.roomId) {
      await updateGameState(gameState.roomId, true); // User-initiated refresh
    }
  }, [gameState.roomId, updateGameState]);

  const forceRefreshGameState = useCallback(async () => {
    if (gameState.roomId) {
      await forceRefreshGameRoom(gameState.roomId);
      await updateGameState(gameState.roomId, true);
    }
  }, [gameState.roomId, forceRefreshGameRoom, updateGameState]);

  const refreshAllRooms = useCallback(
    () => forceRefreshAllRooms(),
    [forceRefreshAllRooms],
  );

  // Get the abandoned room ID (for UI display)
  const getAbandonedRoomId = useCallback(() => {
    return abandonedRoomRef.current;
  }, []);

  // Clear abandoned room memory (allow handling timeout for stuck games)
  const clearAbandonedRoom = useCallback(() => {
    const roomId = abandonedRoomRef.current;
    if (roomId) {
      console.log('♾️ Clearing abandoned room memory for:', roomId);
      abandonedRoomRef.current = null;
      return roomId;
    }
    return null;
  }, []);

  // EMERGENCY: Force abandon current game and reset to idle state
  const forceAbandonGame = useCallback(() => {
    console.log('🆘 EMERGENCY: Force abandoning current game');
    
    // Mark current room as abandoned
    if (gameState.roomId) {
      abandonedRoomRef.current = gameState.roomId;
      console.log('🚨 Marked room as abandoned:', gameState.roomId);
    }
    
    // Set user wants to leave to prevent any auto-rejoins
    userWantsToLeaveRef.current = true;
    
    // Clear all intervals/polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Reset game state to completely idle
    setGameState({
      roomId: null,
      isCreator: false,
      betAmount: 0,
      playerSelection: null,
      opponentSelection: false,
      gameStatus: 'idle',
      winner: null,
      txSignature: null,
      selectionDeadline: null,
      lastUpdated: Date.now(),
      isStale: false,
    });
    
    // Clear any errors
    setError(null);
    setLoading(false);
    
    console.log('✅ Game state forcefully reset to idle. User can now create new games.');
  }, [gameState.roomId]);
  
  // Start fresh - completely reset everything and enable new game creation
  const startFresh = useCallback(() => {
    console.log('🌱 Starting completely fresh - resetting all game state');
    
    // Clear all references
    abandonedRoomRef.current = null;
    userWantsToLeaveRef.current = false;
    
    // Clear intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Reset to clean idle state
    setGameState({
      roomId: null,
      isCreator: false,
      betAmount: 0,
      playerSelection: null,
      opponentSelection: false,
      gameStatus: 'idle',
      winner: null,
      txSignature: null,
      selectionDeadline: null,
      lastUpdated: Date.now(),
      isStale: false,
    });
    
    setError(null);
    setLoading(false);
    
    console.log('✅ Complete fresh start - ready for new games');
  }, []);

  // Handle timeout for abandoned room (special case)
  const handleAbandonedRoomTimeout = useCallback(async () => {
    const roomId = abandonedRoomRef.current;
    if (!roomId) {
      setError('No abandoned room to handle timeout for');
      return undefined;
    }

    console.log('⏰ Handling timeout for abandoned room:', roomId);
    
    // Temporarily clear the abandoned flag to allow the timeout operation
    const tempAbandonedRoom = abandonedRoomRef.current;
    abandonedRoomRef.current = null;
    
    try {
      const result = await handleGameTimeout(roomId);
      console.log('✅ Successfully handled timeout for abandoned room:', roomId);
      return result;
    } catch (err) {
      console.error('❌ Failed to handle timeout for abandoned room:', roomId, err);
      // Restore the abandoned flag on failure
      abandonedRoomRef.current = tempAbandonedRoom;
      throw err;
    }
  }, [handleGameTimeout]);

  // Manual VRF resolution (user-initiated only)
  const resolveGameManually = useCallback(async (roomId: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    setLoading(true);
    setError(null);

    // Set user wants to leave flag to prevent background interference
    const wasLeavingBefore = userWantsToLeaveRef.current;
    userWantsToLeaveRef.current = true;

    try {
      console.log('🎲 User-initiated VRF resolution for room:', roomId);
      
      // Check if room is timed out first
      const isTimedOut = await isRoomTimedOut(roomId);
      if (isTimedOut) {
        setError('⏰ Game has timed out. Use "Handle Timeout" to claim refunds instead.');
        return undefined;
      }

      const { tx } = await resolveGame(roomId);
      console.log('✅ VRF resolution successful:', getExplorerUrl(tx));
      
      // Clear abandoned room since resolution was successful
      if (abandonedRoomRef.current === roomId) {
        abandonedRoomRef.current = null;
        console.log('✅ Cleared abandoned room after successful resolution');
      }

      // Update game state
      setGameState((prev) => ({
        ...prev,
        txSignature: tx,
        gameStatus: 'completed',
        lastUpdated: Date.now(),
      }));

      // Force refresh to get the winner
      setTimeout(() => {
        if (gameState.roomId) {
          updateGameState(gameState.roomId, true);
        }
      }, 2000);

      return { tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to resolve game';
      if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      // Check for specific errors
      if (errorMessage.includes('AccountDidNotSerialize')) {
        errorMessage = 'Game account is corrupted. Use "Handle Timeout" or "Leave Game".';
      } else if (errorMessage.includes('insufficient lamports')) {
        errorMessage = 'Insufficient SOL for transaction fees.';
      } else if (errorMessage.includes('InvalidGameState')) {
        errorMessage = 'Game state is invalid for resolution. Try refreshing the game state or use "Handle Timeout" if the game is stuck.';
      } else if (errorMessage.includes('Waiting for player selections')) {
        errorMessage = 'Cannot resolve: Not all players have made their selections yet. Wait for both players to choose heads or tails.';
      } else if (errorMessage.includes('Invalid room state') && errorMessage.includes('SelectionsPending')) {
        errorMessage = 'Game is ready for resolution but in wrong state. Try refreshing the page or use "Force Recovery".';
      } else if (errorMessage.includes('MissingSelections')) {
        errorMessage = 'Cannot resolve: Both players must make selections before the game can be resolved.';
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
      // Only restore leave state if we weren't leaving before
      if (!wasLeavingBefore) {
        userWantsToLeaveRef.current = false;
      }
    }
  }, [program, publicKey, resolveGame, isRoomTimedOut, gameState.roomId, updateGameState]);

  // Force recovery from stuck game states
  const forceRecoverGameState = useCallback(async () => {
    if (!gameState.roomId) {
      setError('No active game to recover');
      return false;
    }

    console.log('🚑 Attempting to recover stuck game state for room:', gameState.roomId);
    setLoading(true);
    setError(null);

    try {
      // Clear all caches to get fresh data
      clearRpcCache();
      
      // Force refresh the room data
      const room = await forceRefreshGameRoom(gameState.roomId);
      if (!room) {
        throw new Error('Room not found - it may have been deleted');
      }

      // Update game state with fresh data
      await updateGameState(gameState.roomId, true);
      
      // Clear abandoned status if recovery successful
      if (abandonedRoomRef.current === gameState.roomId) {
        abandonedRoomRef.current = null;
        console.log('✅ Cleared abandoned status after successful recovery');
      }
      
      console.log('✅ Game state recovery completed');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during recovery';
      setError(`Recovery failed: ${errorMessage}`);
      console.error('❌ Game state recovery failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [gameState.roomId, clearRpcCache, forceRefreshGameRoom, updateGameState]);

  // Diagnose current game state issues
  const diagnoseGameState = useCallback(async () => {
    if (!gameState.roomId) {
      return { status: 'No active game', issues: [], recommendations: [] };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const room = await fetchGameRoom(gameState.roomId, true);
      if (!room) {
        issues.push('Room not found on blockchain');
        recommendations.push('Try refreshing or check if room was deleted');
        return { status: 'Room Missing', issues, recommendations };
      }

      // Check for timeout issues
      if (room.selectionDeadline) {
        const now = Math.floor(Date.now() / 1000);
        const deadline = room.selectionDeadline.toNumber 
          ? room.selectionDeadline.toNumber() 
          : room.selectionDeadline;
        
        if (now > deadline) {
          issues.push(`Game timed out ${Math.floor((now - deadline) / 60)} minutes ago`);
          recommendations.push('Use "Handle Timeout" to claim refunds');
        }
      }

      // Check for stuck VRF resolution
      if (room.status && 'resolving' in room.status) {
        if (room.vrfStatus && 'pending' in room.vrfStatus) {
          issues.push('VRF resolution is pending');
          recommendations.push('Try manual resolution or wait for VRF callback');
        } else if (room.vrfStatus && 'failed' in room.vrfStatus) {
          issues.push('VRF resolution failed');
          recommendations.push('Use "Handle Timeout" to recover funds');
        }
      }

      // Check player participation
      if (publicKey) {
        const isPlayer1 = room.player1.toString() === publicKey.toString();
        const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
        
        if (!isPlayer1 && !isPlayer2) {
          issues.push('You are not a participant in this room');
          recommendations.push('Leave this game and join a different one');
        }
      }

      const statusName = room.status 
        ? Object.keys(room.status)[0] 
        : 'unknown';
      
      return {
        status: statusName,
        issues,
        recommendations,
        room: {
          id: room.roomId?.toNumber(),
          status: statusName,
          player1: room.player1.toString(),
          player2: room.player2?.toString(),
          betAmount: room.betAmount?.toNumber(),
          createdAt: room.createdAt?.toNumber(),
          selectionDeadline: room.selectionDeadline?.toNumber(),
        },
      };
    } catch (err) {
      issues.push(`Diagnosis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      recommendations.push('Try refreshing the page or reconnecting wallet');
      
      return { status: 'Diagnosis Error', issues, recommendations };
    }
  }, [gameState.roomId, fetchGameRoom, publicKey]);

  return {
    gameState,
    loading,
    error,
    setError,
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    rejoinRoom: handleRejoinRoom,
    makeSelection: handleMakeSelection,
    resolveGame, // VRF resolution function (internal use)
    resolveGameManually, // User-initiated VRF resolution
    checkGameStatus: updateGameState, // Alias for backward compatibility
    checkForExistingGame,
    resetGame,
    leaveGame,
    handleGameTimeout,
    cancelRoom,
    isRoomTimedOut,
    checkCurrentRoomTimeout,
    // New user-controlled methods
    refreshGameState,
    forceRefreshGameState,
    refreshAllRooms,
    clearRpcCache,
    getRpcStats,
    isRpcCircuitOpen,
    // Abandoned room management
    getAbandonedRoomId,
    clearAbandonedRoom,
    handleAbandonedRoomTimeout,
    // State recovery and diagnosis
    forceRecoverGameState,
    diagnoseGameState,
    // Emergency functions
    forceAbandonGame,
    startFresh,
    // State inspection
    abandonedRoomId: abandonedRoomRef.current,
  };
};
