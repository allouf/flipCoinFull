import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import { getGameHistoryService, GameHistoryFilters } from '../services/GameHistoryService';
import { useAnchorProgram } from './useAnchorProgram';

interface UseTransactionHistoryOptions {
  filters: GameHistoryFilters;
  page: number;
  limit: number;
  enabled?: boolean;
}

interface UseTransactionHistoryResult {
  data: any; // TODO: Replace with proper type from GameHistoryService
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

/**
 * Hook for fetching paginated transaction history with caching and infinite scroll support
 */
export const useTransactionHistory = ({
  filters,
  page,
  limit,
  enabled = true,
}: UseTransactionHistoryOptions): UseTransactionHistoryResult => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAnchorProgram();

  // Initialize the game history service
  const gameHistoryService = useMemo(() => {
    const service = getGameHistoryService(connection, program?.program || undefined);
    service.setUserPublicKey(publicKey);
    return service;
  }, [connection, program, publicKey]);

  // Generate query key for caching
  const queryKey = useMemo(() => [
    'transaction-history',
    publicKey?.toString(),
    filters,
    page,
    limit,
  ], [publicKey, filters, page, limit]);

  // Use React Query for data fetching with caching
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }
      return gameHistoryService.getGameHistory(filters, page, limit);
    },
    enabled: enabled && !!publicKey,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Infinite query for load more functionality
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['transaction-history-infinite', publicKey?.toString(), filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }
      return gameHistoryService.getGameHistory(filters, pageParam as number, limit);
    },
    enabled: enabled && !!publicKey,
    getNextPageParam: (lastPage: any, pages: any) => (lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined),
    staleTime: 30000,
    gcTime: 300000,
    retry: 3,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    hasNextPage: infiniteQuery.hasNextPage || false,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  };
};

/**
 * Hook for getting transaction history statistics only
 */
export const useTransactionStats = (filters: GameHistoryFilters = {}) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAnchorProgram();

  const gameHistoryService = useMemo(() => {
    const service = getGameHistoryService(connection, program?.program || undefined);
    service.setUserPublicKey(publicKey);
    return service;
  }, [connection, program, publicKey]);

  return useQuery({
    queryKey: ['transaction-stats', publicKey?.toString(), filters],
    queryFn: async () => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }
      const result = await gameHistoryService.getGameHistory(filters, 1, 1000); // Get large batch for stats
      return result.stats;
    },
    enabled: !!publicKey,
    staleTime: 60000, // Stats can be stale for 1 minute
    gcTime: 600000, // Keep stats in cache for 10 minutes
    retry: 2,
  });
};

/**
 * Hook for prefetching next page of transaction history
 */
export const usePrefetchTransactionHistory = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAnchorProgram();
  // TODO: Implement prefetching logic using React Query's prefetchQuery

  return {
    prefetchNextPage: (filters: GameHistoryFilters, currentPage: number, limit: number) => {
      // TODO: Implement prefetching
      console.log('Prefetching next page:', { filters, currentPage, limit });
    },
  };
};

/**
 * Hook for real-time updates to transaction history
 * TODO: Integrate with WebSocket updates for live transaction updates
 */
export const useTransactionHistoryUpdates = () =>
// TODO: Implement WebSocket connection for real-time updates
// This should listen for new transactions and update the query cache

  ({
    isConnected: false,
    lastUpdate: null,
  });
