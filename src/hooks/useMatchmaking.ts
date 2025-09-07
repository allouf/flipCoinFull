import {
  useState, useEffect, useCallback, useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { PublicKey } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';

// Types
interface QueueEntry {
  playerId: string;
  socketId: string;
  betAmount: number;
  tokenMint: string;
  joinedAt: Date;
}

interface MatchData {
  roomId: string;
  opponent: string;
  betAmount: number;
  tokenMint: string;
  autoAcceptTimeout: number;
}

interface QueueStats {
  queueKey: string;
  playersWaiting: number;
  estimatedWaitTime: number;
}

interface QueueStatus {
  isInQueue: boolean;
  queuePosition?: number;
  estimatedWaitTime?: number;
  playersWaiting?: number;
  queueKey?: string;
}

interface UseMatchmakingReturn {
  // Queue state
  queueStatus: QueueStatus;
  isLoading: boolean;
  error: string | null;

  // Match state
  matchFound: MatchData | null;
  showMatchNotification: boolean;

  // Queue stats
  popularQueues: Array<{
    tokenMint: string;
    betAmount: number;
    playersWaiting: number;
    averageWaitTime: number;
  }>;

  // Actions
  joinQueue: (betAmount: number, tokenMint: string) => Promise<void>;
  leaveQueue: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  declineMatch: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Socket connection state
  isConnected: boolean;
}

export const useMatchmaking = (
  socketUrl: string = process.env.REACT_APP_MATCHMAKING_URL || 'ws://localhost:8080',
): UseMatchmakingReturn => {
  const wallet = useAnchorWallet();
  const { program } = useAnchorProgram();

  // State
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ isInQueue: false });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState<MatchData | null>(null);
  const [showMatchNotification, setShowMatchNotification] = useState<boolean>(false);
  const [popularQueues, setPopularQueues] = useState<Array<{
    tokenMint: string;
    betAmount: number;
    playersWaiting: number;
    averageWaitTime: number;
  }>>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!wallet?.publicKey) return;

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to matchmaking server');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from matchmaking server');
      setIsConnected(false);
      setQueueStatus({ isInQueue: false });
      setMatchFound(null);
      setShowMatchNotification(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setError('Failed to connect to matchmaking server');
    });

    // Queue event handlers
    socket.on('queue-joined', (data: {
      queueKey: string;
      position: number;
      estimatedWaitTime: number;
      playersWaiting: number;
    }) => {
      setQueueStatus({
        isInQueue: true,
        queuePosition: data.position,
        estimatedWaitTime: data.estimatedWaitTime,
        playersWaiting: data.playersWaiting,
        queueKey: data.queueKey,
      });
      setIsLoading(false);
    });

    socket.on('queue-left', () => {
      setQueueStatus({ isInQueue: false });
      setIsLoading(false);
    });

    socket.on('queue-error', (data: { message: string; error?: string }) => {
      setError(data.message);
      setIsLoading(false);
      setQueueStatus({ isInQueue: false });
    });

    socket.on('queue-stats-update', (data: QueueStats) => {
      setQueueStatus((prev) => ({
        ...prev,
        playersWaiting: data.playersWaiting,
        estimatedWaitTime: data.estimatedWaitTime,
      }));
    });

    // Match event handlers
    socket.on('match-found', (data: MatchData) => {
      console.log('Match found:', data);
      setMatchFound(data);
      setShowMatchNotification(true);
      setQueueStatus({ isInQueue: false });

      // Request notification permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    socket.on('match-confirmed', (data: {
      roomId: string;
      opponent: string;
      betAmount: number;
      tokenMint: string;
    }) => {
      console.log('Match confirmed:', data);
      setShowMatchNotification(false);
      // TODO: Navigate to game room or update game state
    });

    socket.on('match-error', (data: { message: string }) => {
      setError(data.message);
      setMatchFound(null);
      setShowMatchNotification(false);
    });

    // Start heartbeat
    const startHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected && wallet.publicKey) {
          socket.emit('heartbeat', { playerId: wallet.publicKey.toString() });
        }
      }, 15000); // Send heartbeat every 15 seconds
    };

    startHeartbeat();

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      socket.close();
    };
  }, [wallet?.publicKey, socketUrl]);

  // Join queue function
  const joinQueue = useCallback(async (betAmount: number, tokenMint: string) => {
    if (!wallet?.publicKey || !program || !socketRef.current) {
      throw new Error('Wallet or program not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Call smart contract join_matchmaking_queue instruction
      // const queuePositionPda = await findQueuePositionPda(wallet.publicKey, program.programId);
      // const tx = await program.methods
      //   .joinMatchmakingQueue(new anchor.BN(betAmount), new PublicKey(tokenMint))
      //   .accounts({
      //     queuePosition: queuePositionPda,
      //     player: wallet.publicKey,
      //     systemProgram: anchor.web3.SystemProgram.programId,
      //   })
      //   .rpc();

      // Emit to socket server
      socketRef.current.emit('join-queue', {
        playerId: wallet.publicKey.toString(),
        betAmount,
        tokenMint,
      });
    } catch (error) {
      console.error('Failed to join queue:', error);
      setError(error instanceof Error ? error.message : 'Failed to join queue');
      setIsLoading(false);
      throw error;
    }
  }, [wallet, program]);

  // Leave queue function
  const leaveQueue = useCallback(async () => {
    if (!wallet?.publicKey || !socketRef.current) {
      throw new Error('Wallet not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Call smart contract cancel_queue_position instruction
      // const queuePositionPda = await findQueuePositionPda(wallet.publicKey, program.programId);
      // const tx = await program.methods
      //   .cancelQueuePosition()
      //   .accounts({
      //     queuePosition: queuePositionPda,
      //     player: wallet.publicKey,
      //   })
      //   .rpc();

      // Emit to socket server
      socketRef.current.emit('leave-queue', {
        playerId: wallet.publicKey.toString(),
      });
    } catch (error) {
      console.error('Failed to leave queue:', error);
      setError(error instanceof Error ? error.message : 'Failed to leave queue');
      setIsLoading(false);
      throw error;
    }
  }, [wallet, program]);

  // Accept match function
  const acceptMatch = useCallback(async () => {
    if (!matchFound || !wallet?.publicKey || !socketRef.current) {
      throw new Error('No match found or wallet not available');
    }

    try {
      // TODO: Call smart contract create_matched_room instruction
      // This would typically be done by the matchmaking server, not the client

      // Emit acceptance to socket server
      socketRef.current.emit('accept-match', {
        roomId: matchFound.roomId,
        playerId: wallet.publicKey.toString(),
      });

      setShowMatchNotification(false);
    } catch (error) {
      console.error('Failed to accept match:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept match');
      throw error;
    }
  }, [matchFound, wallet]);

  // Decline match function
  const declineMatch = useCallback(async () => {
    if (!matchFound) return;

    setMatchFound(null);
    setShowMatchNotification(false);

    // TODO: Notify server of decline and potentially return to queue
  }, [matchFound]);

  // Refresh stats function
  const refreshStats = useCallback(async () => {
    // TODO: Fetch queue statistics from server API
    try {
      const response = await fetch(`${socketUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/api/queue-stats`);
      if (response.ok) {
        const stats = await response.json();
        setPopularQueues(stats);
      }
    } catch (error) {
      console.error('Failed to fetch queue stats:', error);
    }
  }, [socketUrl]);

  // Auto-refresh stats periodically
  useEffect(() => {
    if (!queueStatus.isInQueue) {
      refreshStats();
      const interval = setInterval(refreshStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [queueStatus.isInQueue, refreshStats]);

  return {
    // State
    queueStatus,
    isLoading,
    error,
    matchFound,
    showMatchNotification,
    popularQueues,
    isConnected,

    // Actions
    joinQueue,
    leaveQueue,
    acceptMatch,
    declineMatch,
    refreshStats,
  };
};

// Helper function to find queue position PDA
export const findQueuePositionPda = async (
  player: PublicKey,
  programId: PublicKey,
): Promise<PublicKey> => {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('queue_position'), player.toBuffer()],
    programId,
  );
  return pda;
};

export default useMatchmaking;
