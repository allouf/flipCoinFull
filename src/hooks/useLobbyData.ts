import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import type { GameRoom } from './useAnchorProgram';

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
  if ('selectionsPending' in status) return 'active';
  if ('resolving' in status) return 'active';
  if ('completed' in status) return 'completed';
  if ('cancelled' in status) return 'cancelled';
  return 'unknown';
};

const getSelectionString = (selection: GameRoom['player1Selection'] | GameRoom['player2Selection']): string => {
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
    if (!isProgramReady) return;

    setLoading(true);
    setError(null);

    try {
      const rooms = await fetchAllGameRooms({ userInitiated, priority: userInitiated ? 'high' : 'normal' });
      setAllRooms(rooms);
      setLastRefresh(new Date());

      if (userInitiated) {
        console.log(`🔄 Lobby data refreshed: ${rooms.length} rooms found`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game data';
      setError(errorMessage);
      console.error('Error refreshing lobby data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchAllGameRooms, isProgramReady]);

  // Auto-refresh on component mount and program ready
  useEffect(() => {
    if (isProgramReady) {
      refreshData(false);
    }
  }, [isProgramReady, refreshData]);

  // Auto-refresh every 30 seconds for background updates
  useEffect(() => {
    if (!isProgramReady) return;

    const interval = setInterval(() => {
      refreshData(false);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isProgramReady, refreshData]);

  // Transform data into different views
  const availableGames = useMemo((): AvailableGameData[] => {
    return allRooms
      .filter(room =>
        room.status && 'waitingForPlayer' in room.status &&
        (!publicKey || room.player1.toString() !== publicKey.toString()) // Don't show user's own games
      )
      .map(room => ({
        id: room.roomId.toNumber().toString(),
        creatorId: room.player1.toString(),
        betAmount: room.betAmount.toNumber() / 1e9, // Convert lamports to SOL
        createdAt: new Date(room.createdAt.toNumber() * 1000).toISOString(),
      }));
  }, [allRooms, publicKey]);

  const myGames = useMemo((): MyGameData[] => {
    if (!connected || !publicKey) return [];

    const userPublicKey = publicKey.toString();

    return allRooms
      .filter(room => {
        const isPlayer1 = room.player1.toString() === userPublicKey;
        const isPlayer2 = room.player2?.toString() === userPublicKey;
        return isPlayer1 || isPlayer2;
      })
      .map(room => {
        const isCreator = room.player1.toString() === userPublicKey;
        const status = mapRoomStatusToString(room.status);

        let winner: string | undefined;
        let phase: string | undefined;

        if (status === 'completed' && room.winner) {
          const isWinner = room.winner.toString() === userPublicKey;
          winner = isWinner ? 'you' : 'opponent';
        }

        if (status === 'active') {
          if (room.status && 'selectionsPending' in room.status) {
            phase = 'selection';
          } else if (room.status && 'resolving' in room.status) {
            phase = 'revealing';
          }
        }

        return {
          id: room.roomId.toNumber().toString(),
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
          'selectionsPending' in room.status ||
          'resolving' in room.status
        ) &&
        room.player2 // Must have both players
      )
      .map(room => {
        let phase = 'making selections';
        if (room.status && 'resolving' in room.status) {
          phase = 'revealing choices';
        }

        return {
          id: room.roomId.toNumber().toString(),
          player1: room.player1.toString(),
          player2: room.player2!.toString(),
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
        const isPlayer1 = room.player1.toString() === userPublicKey;
        const isPlayer2 = room.player2?.toString() === userPublicKey;
        const isCompleted = room.status && 'completed' in room.status;
        return (isPlayer1 || isPlayer2) && isCompleted;
      })
      .map(room => {
        const isPlayer1 = room.player1.toString() === userPublicKey;
        const isWinner = room.winner?.toString() === userPublicKey;
        const result: 'win' | 'loss' = isWinner ? 'win' : 'loss';

        const yourChoice = isPlayer1
          ? getSelectionString(room.player1Selection)
          : getSelectionString(room.player2Selection);

        const opponentChoice = isPlayer1
          ? getSelectionString(room.player2Selection)
          : getSelectionString(room.player1Selection);

        const opponentId = isPlayer1
          ? room.player2?.toString() || ''
          : room.player1.toString();

        const betAmount = room.betAmount.toNumber() / 1e9;
        const netAmount = result === 'win' ? betAmount * 0.86 : -betAmount; // 7% house fee for wins

        // For coin result, we'd need to decode the VRF result or check the winner logic
        const coinResult = isWinner ? yourChoice : (yourChoice === 'heads' ? 'tails' : 'heads');

        return {
          id: room.roomId.toNumber().toString(),
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
        'selectionsPending' in room.status ||
        'resolving' in room.status
      )
    ).length;
    const waitingGames = allRooms.filter(room =>
      room.status && 'waitingForPlayer' in room.status
    ).length;
    const completedGames = allRooms.filter(room =>
      room.status && 'completed' in room.status
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