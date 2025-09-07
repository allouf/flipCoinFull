import { useState, useCallback } from 'react';
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check game status
  const checkGameStatus = useCallback(async (roomId: number) => {
    if (!program) return;

    try {
      const room = await fetchGameRoom(roomId);

      if (room) {
        // Check if game is resolved
        if (room.winner) {
          const isWinner = room.winner.toString() === publicKey?.toString();
          setGameState((prev) => ({
            ...prev,
            gameStatus: 'completed',
            winner: isWinner ? 'You won!' : 'You lost!',
          }));
        } else if (room.player2Selection) {
          setGameState((prev) => ({
            ...prev,
            opponentSelection: true,
          }));
        }
      }
    } catch (err) {
      // Silent error handling for status checks
    }
  }, [program, publicKey, fetchGameRoom]);

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
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room created:', { roomId, pda: gameRoomPda.toString(), tx: getExplorerUrl(tx) });
      }

      return { roomId, tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      let errorMessage = 'Failed to create room';

      if (errorObj.message?.includes('429') || errorObj.message?.includes('Too many requests')) {
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

  // Join an existing game room
  const handleJoinRoom = useCallback(async (roomId: number) => {
    if (!program || !publicKey) {
      setError('Wallet not connected');
      return undefined;
    }

    setLoading(true);
    setError(null);

    try {
      const { tx } = await joinRoom(roomId);

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
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room joined:', { roomId, tx: getExplorerUrl(tx) });
      }

      return { roomId, tx };
    } catch (err) {
      const errorObj = err as ErrorType;
      setError(errorObj.message || 'Failed to join room');
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

  // Reset game state
  const resetGame = useCallback(() => {
    setGameState({
      roomId: null,
      isCreator: false,
      betAmount: 0,
      playerSelection: null,
      opponentSelection: false,
      gameStatus: 'idle',
      winner: null,
      txSignature: null,
    });
    setError(null);
  }, []);

  return {
    gameState,
    loading,
    error,
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    makeSelection: handleMakeSelection,
    checkGameStatus,
    resetGame,
  };
};
