import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import type { GameRoom } from './useAnchorProgram';
import { WebSocketManager } from '../services/WebSocketManager';

export interface AvailableGameData {
  id: string;
  creatorId: string;
  betAmount: number;
  createdAt: string;
}

export interface MyGameData {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  role: 'creator' | 'joiner';
  createdAt: string;
  betAmount: number;
  winner?: string;
  phase?: string;
}

export interface RunningGameData {
  id: string;
  player1: string;
  player2: string;
  totalPot: number;
  status: string;
  phase: string;
}

export interface HistoryGameData {
  id: string;
  betAmount: number;
  result: 'win' | 'loss';
  opponentId: string;
  completedAt: string;
  netAmount: number;
  yourChoice: string;
  opponentChoice: string;
  coinResult: string;
}

export interface LobbyStats {
  totalGames: number;
  activeGames: number;
  waitingGames: number;
  completedGames: number;
  totalVolume: number;
}

const mapRoomStatusToString = (status: GameRoom['status']): string => {
  if (!status) return 'unknown';
  if ('waitingForPlayer' in status) return 'waiting';
  if ('playersReady' in status) return 'active';
  if ('commitmentsReady' in status) return 'active';
  if ('revealingPhase' in status) return 'active';
  if ('resolved' in status) return 'completed';
  if ('cancelled' in status) return 'cancelled';
  return 'unknown';
};

const getSelectionString = (selection: GameRoom['choiceA'] | GameRoom['choiceB']): string => {
  if (!selection) return '';
  if ('heads' in selection) return 'heads';
  if ('tails' in selection) return 'tails';
  return '';
};

export const useLobbyData = () => {
  const { publicKey, connected } = useWallet();
  const { fetchAllGameRooms, isProgramReady } = useAnchorProgram();

  const [allRooms, setAllRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch all game rooms
  const refreshData = useCallback(async (userInitiated = false) => {
    console.log('🔍 useLobbyData: refreshData called', { isProgramReady, userInitiated });
    if (!isProgramReady) {
      console.log('⚠️ useLobbyData: Program not ready, skipping fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📡 useLobbyData: Fetching rooms from blockchain...');
      const rooms = await fetchAllGameRooms({ userInitiated, priority: userInitiated ? 'high' : 'normal' });
      console.log('✅ useLobbyData: Fetched rooms:', rooms?.length || 0, rooms);
      setAllRooms(rooms);
      setLastRefresh(new Date());

      if (userInitiated) {
        console.log(`🔄 Lobby data refreshed: ${rooms.length} rooms found`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game data';
      setError(errorMessage);
      console.error('❌ useLobbyData: Error refreshing lobby data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchAllGameRooms, isProgramReady]);

  // Auto-refresh on component mount and program ready
  useEffect(() => {
    console.log('🚀 useLobbyData: useEffect triggered', { isProgramReady });
    if (isProgramReady) {
      console.log('🎯 useLobbyData: Program ready, starting initial fetch');
      refreshData(false);
    } else {
      console.log('⏳ useLobbyData: Waiting for program to be ready...');
    }
  }, [isProgramReady, refreshData]);

  // Listen for WebSocket events instead of polling
  useEffect(() => {
    if (!isProgramReady) return;

    const wsManager = WebSocketManager.getInstance();

    // Check connection and attempt to connect if needed
    const connectionStatus = wsManager.getConnectionStatus();
    if (!connectionStatus.connected && !connectionStatus.reconnecting) {
      console.log('🔌 WebSocket not connected, attempting to connect for lobby updates...');
      wsManager.connect().catch(err => {
        console.warn('WebSocket connection failed, falling back to manual refresh:', err);
      });
    }

    // Event handler for when a player joins a game
    const handlePlayerJoined = (event: any) => {
      console.log('🎮 Player joined event received:', event);
      // Refresh game data when a player joins
      refreshData(false);
    };

    // Event handler for game state changes
    const handleGameStateChange = (event: any) => {
      console.log('🔄 Game state changed:', event);
      refreshData(false);
    };

    // Subscribe to relevant events
    wsManager.on('player_joined', handlePlayerJoined);
    wsManager.on('game_state_changed', handleGameStateChange);
    wsManager.on('room_created', handleGameStateChange);
    wsManager.on('game_resolved', handleGameStateChange);
    wsManager.on('commitment_made', handleGameStateChange);
    wsManager.on('choice_revealed', handleGameStateChange);

    return () => {
      // Cleanup event listeners
      wsManager.off('player_joined', handlePlayerJoined);
      wsManager.off('game_state_changed', handleGameStateChange);
      wsManager.off('room_created', handleGameStateChange);
      wsManager.off('game_resolved', handleGameStateChange);
      wsManager.off('commitment_made', handleGameStateChange);
      wsManager.off('choice_revealed', handleGameStateChange);
    };
  }, [isProgramReady, refreshData]);

  // Transform data into different views
  const availableGames = useMemo((): AvailableGameData[] => {
    return allRooms
      .filter(room =>
        room.status && 'waitingForPlayer' in room.status &&
        (!publicKey || room.playerA.toString() !== publicKey.toString()) // Don't show user's own games
      )
      .map(room => ({
        id: room.gameId.toNumber().toString(),
        creatorId: room.playerA.toString(),
        betAmount: room.betAmount.toNumber() / 1e9, // Convert lamports to SOL
        createdAt: new Date(room.createdAt.toNumber() * 1000).toISOString(),
      }));
  }, [allRooms, publicKey]);

  const myGames = useMemo((): MyGameData[] => {
    if (!connected || !publicKey) return [];

    const userPublicKey = publicKey.toString();

    return allRooms
      .filter(room => {
        const isPlayer1 = room.playerA.toString() === userPublicKey;
        const isPlayer2 = room.playerB?.toString() === userPublicKey;
        return isPlayer1 || isPlayer2;
      })
      .map(room => {
        const isCreator = room.playerA.toString() === userPublicKey;
        const status = mapRoomStatusToString(room.status);

        let winner: string | undefined;
        let phase: string | undefined;

        if (status === 'completed' && room.winner) {
          const isWinner = room.winner.toString() === userPublicKey;
          winner = isWinner ? 'you' : 'opponent';
        }

        if (status === 'active') {
          if (room.status && 'playersReady' in room.status) {
            phase = 'selection';
          } else if (room.status && 'revealingPhase' in room.status) {
            phase = 'revealing';
          }
        }

        return {
          id: room.gameId.toNumber().toString(),
          status: status as 'waiting' | 'active' | 'completed' | 'cancelled',
          role: isCreator ? 'creator' as const : 'joiner' as const,
          createdAt: new Date(room.createdAt.toNumber() * 1000).toISOString(),
          betAmount: room.betAmount.toNumber() / 1e9,
          winner,
          phase,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Most recent first
  }, [allRooms, connected, publicKey]);

  const runningGames = useMemo((): RunningGameData[] => {
    return allRooms
      .filter(room =>
        room.status && (
          'playersReady' in room.status ||
          'revealingPhase' in room.status
        ) &&
        room.playerB // Must have both players
      )
      .map(room => {
        let phase = 'making selections';
        if (room.status && 'revealingPhase' in room.status) {
          phase = 'revealing choices';
        }

        return {
          id: room.gameId.toNumber().toString(),
          player1: room.playerA.toString(),
          player2: room.playerB!.toString(),
          totalPot: (room.betAmount.toNumber() * 2) / 1e9, // Both players' bets in SOL
          status: mapRoomStatusToString(room.status),
          phase,
        };
      });
  }, [allRooms]);

  const gameHistory = useMemo((): HistoryGameData[] => {
    if (!connected || !publicKey) return [];

    const userPublicKey = publicKey.toString();

    return allRooms
      .filter(room => {
        const isPlayer1 = room.playerA.toString() === userPublicKey;
        const isPlayer2 = room.playerB?.toString() === userPublicKey;
        const isCompleted = room.status && 'resolved' in room.status;
        return (isPlayer1 || isPlayer2) && isCompleted;
      })
      .map(room => {
        const isPlayer1 = room.playerA.toString() === userPublicKey;
        const isWinner = room.winner?.toString() === userPublicKey;
        const result: 'win' | 'loss' = isWinner ? 'win' : 'loss';

        const yourChoice = isPlayer1
          ? getSelectionString(room.player1Selection)
          : getSelectionString(room.player2Selection);

        const opponentChoice = isPlayer1
          ? getSelectionString(room.player2Selection)
          : getSelectionString(room.player1Selection);

        const opponentId = isPlayer1
          ? room.playerB?.toString() || ''
          : room.playerA.toString();

        const betAmount = room.betAmount.toNumber() / 1e9;
        const netAmount = result === 'win' ? betAmount * 0.86 : -betAmount; // 7% house fee for wins

        // For coin result, we'd need to decode the VRF result or check the winner logic
        const coinResult = isWinner ? yourChoice : (yourChoice === 'heads' ? 'tails' : 'heads');

        return {
          id: room.gameId.toNumber().toString(),
          betAmount,
          result,
          opponentId: opponentId.slice(-8), // Show last 8 chars
          completedAt: new Date(room.createdAt.toNumber() * 1000).toISOString(), // Using createdAt as approximation
          netAmount,
          yourChoice: yourChoice || 'unknown',
          opponentChoice: opponentChoice || 'unknown',
          coinResult,
        };
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()); // Most recent first
  }, [allRooms, connected, publicKey]);

  const stats = useMemo((): LobbyStats => {
    const totalGames = allRooms.length;
    const activeGames = allRooms.filter(room =>
      room.status && (
        'playersReady' in room.status ||
        'revealingPhase' in room.status
      )
    ).length;
    const waitingGames = allRooms.filter(room =>
      room.status && 'waitingForPlayer' in room.status
    ).length;
    const completedGames = allRooms.filter(room =>
      room.status && 'resolved' in room.status
    ).length;

    const totalVolume = allRooms.reduce((sum, room) =>
      sum + (room.betAmount.toNumber() / 1e9), 0
    );

    return {
      totalGames,
      activeGames,
      waitingGames,
      completedGames,
      totalVolume,
    };
  }, [allRooms]);

  return {
    // Raw data
    allRooms,

    // Data
    availableGames,
    myGames,
    runningGames,
    gameHistory,
    stats,

    // State
    loading,
    error,
    lastRefresh,

    // Actions
    refreshData: () => refreshData(true),
  };
};