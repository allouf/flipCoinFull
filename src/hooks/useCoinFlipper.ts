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
    fetchGameRoom,
    fetchAllGameRooms,
    handleTimeout,
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced game status check that updates the full game state
  const updateGameState = useCallback(async (roomId: number) => {
    if (!program || !publicKey) return;

    try {
      const room = await fetchGameRoom(roomId);

      if (!room) {
        console.warn('Room not found during update, may have been closed');
        return;
      }

      // Check if the current wallet is one of the players
      const isPlayer1 = room.player1.toString() === publicKey.toString();
      const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();

      if (!isPlayer1 && !isPlayer2) {
        console.warn('Current player is not part of this room');
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
        selectionDeadline = room.selectionDeadline.toNumber ? room.selectionDeadline.toNumber() : room.selectionDeadline;
      }

      if (room.status && 'waitingForPlayer' in room.status) {
        gameStatus = 'waiting';
      } else if (room.status && 'selectionsPending' in room.status) {
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
        if (room.winner) {
          const isWinner = room.winner.toString() === publicKey.toString();
          winner = isWinner ? 'You won!' : 'You lost!';
        }
      } else if (room.status && 'cancelled' in room.status) {
        gameStatus = 'completed';
        winner = 'Game was cancelled - funds refunded';
      }

      setGameState((prev) => ({
        ...prev,
        roomId,
        isCreator: isPlayer1,
        betAmount: Number(room.betAmount) / 1e9,
        playerSelection,
        opponentSelection,
        gameStatus,
        winner,
        selectionDeadline,
      }));

      console.log('Game state updated:', {
        roomId,
        gameStatus,
        playerSelection,
        opponentSelection,
        winner,
      });

    } catch (err) {
      console.error('Error updating game state:', err);
    }
  }, [program, publicKey, fetchGameRoom]);

  // Start/stop polling based on game state
  useEffect(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Start polling if player is in an active game
    if (gameState.roomId && (gameState.gameStatus === 'waiting' || gameState.gameStatus === 'selecting' || gameState.gameStatus === 'resolving')) {
      console.log('Starting real-time polling for room:', gameState.roomId);
      pollingIntervalRef.current = setInterval(() => {
        updateGameState(gameState.roomId!);
      }, 5000); // Poll every 5 seconds for active games
    }

    // Cleanup on unmount or when game ends
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [gameState.roomId, gameState.gameStatus, updateGameState]);

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

    setLoading(true);
    setError(null);

    try {
      // Generate random room ID
      const roomId = Math.floor(Math.random() * 1000000);

      // Add a small delay to prevent rapid-fire requests
      await new Promise<void>((resolve) => { setTimeout(resolve, 500); });

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
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room created:', { roomId, pda: gameRoomPda.toString(), tx: getExplorerUrl(tx) });
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
        errorMessage = 'Insufficient SOL balance to cover the bet amount and transaction fees. Please add more SOL to your wallet.';
      } else if (errorObj.message?.includes('429') || errorObj.message?.includes('Too many requests')) {
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
        selectionDeadline = room.selectionDeadline.toNumber ? room.selectionDeadline.toNumber() : room.selectionDeadline;
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
      });

      console.log('Rejoined room:', { roomId, gameStatus, playerSelection, opponentSelection });

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
        selectionDeadline: room && room.selectionDeadline
          ? (room.selectionDeadline.toNumber ? room.selectionDeadline.toNumber() : room.selectionDeadline)
          : null,
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
        errorMessage = 'Insufficient SOL balance to cover the bet amount and transaction fees. Please add more SOL to your wallet.';
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
        console.log('Selection made:', { roomId: gameState.roomId, selection, tx: getExplorerUrl(tx) });
      }

      // Poll for game resolution
      setTimeout(() => {
        if (gameState.roomId) {
          checkGameStatus(gameState.roomId);
        }
      }, 2000);

      return { tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      setError(errorObj.message || 'Failed to make selection');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, gameState.roomId, makeSelection, checkGameStatus]);

  // Leave/Cancel game - reset local state without blockchain transaction
  const leaveGame = useCallback(() => {
    console.log('Leaving game, resetting local state');
    
    // Clear polling
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
    });
    setError(null);
  }, []);

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
      
      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      const deadline = room.selectionDeadline.toNumber ? room.selectionDeadline.toNumber() : room.selectionDeadline;
      
      console.log('Timeout check:', {
        now,
        deadline,
        isTimedOut: now > deadline,
        roomId,
      });
      
      return now > deadline;
    } catch (error) {
      console.error('Error checking timeout:', error);
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

    try {
      const { tx } = await handleTimeout(roomId);
      
      // Reset game state after timeout handling
      setGameState((prev) => ({
        ...prev,
        gameStatus: 'completed',
        winner: 'Game timed out - funds refunded',
        txSignature: tx,
      }));

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Game timeout handled:', { roomId, tx: getExplorerUrl(tx) });
      }

      return { tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to handle timeout';
      
      if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, handleTimeout]);

  // Check for existing games that the player is part of
  const checkForExistingGame = useCallback(async () => {
    if (!program || !publicKey) {
      return;
    }

    try {
      // Get all game rooms and find ones where current player is involved
      const allRooms = await fetchAllGameRooms();
      const playerRooms = allRooms.filter((room) => {
        const isPlayer1 = room.player1.toString() === publicKey.toString();
        const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
        return (isPlayer1 || isPlayer2)
               && (room.status && ('selectionsPending' in room.status || 'resolving' in room.status))
               && !(room.status && 'cancelled' in room.status);
      });

      if (playerRooms.length > 0) {
        // Check if the room is timed out before rejoining
        const mostRecentRoom = playerRooms[0];
        const roomIdNumber = mostRecentRoom.roomId.toNumber();
        console.log('Found existing active game, rejoining room:', mostRecentRoom.roomId.toString());

        const isTimedOut = await isRoomTimedOut(roomIdNumber);
        if (isTimedOut) {
          console.log(
            'Room is timed out, setting up for timeout handling instead of rejoining',
          );
          // Set up game state to show timeout options
          const deadline = mostRecentRoom.selectionDeadline
            ? (mostRecentRoom.selectionDeadline.toNumber ? mostRecentRoom.selectionDeadline.toNumber() : mostRecentRoom.selectionDeadline)
            : null;
          setGameState({
            roomId: roomIdNumber,
            isCreator: mostRecentRoom.player1.toString() === publicKey.toString(),
            betAmount: Number(mostRecentRoom.betAmount) / 1e9,
            playerSelection: null,
            opponentSelection: false,
            gameStatus: 'selecting', // Keep as selecting to show timeout options
            winner: null,
            txSignature: null,
            selectionDeadline: deadline,
          });
        } else {
          await handleRejoinRoom(roomIdNumber);
        }
      }
    } catch (err) {
      console.error('Error checking for existing games:', err);
    }
  }, [program, publicKey, fetchAllGameRooms, handleRejoinRoom, isRoomTimedOut]);

  // Check current room timeout status
  const checkCurrentRoomTimeout = useCallback(async () => {
    if (!gameState.roomId) return false;
    return isRoomTimedOut(gameState.roomId);
  }, [gameState.roomId, isRoomTimedOut]);

  return {
    gameState,
    loading,
    error,
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    rejoinRoom: handleRejoinRoom,
    makeSelection: handleMakeSelection,
    checkGameStatus,
    checkForExistingGame,
    resetGame,
    leaveGame,
    handleGameTimeout,
    isRoomTimedOut,
    checkCurrentRoomTimeout,
  };
};
