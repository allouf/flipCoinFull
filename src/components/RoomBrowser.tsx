import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram, GameRoom } from '../hooks/useAnchorProgram';
import { LoadingSpinner } from './LoadingSpinner';

interface RoomBrowserProps {
  onJoinRoom: (roomId: number) => void;
  onRejoinRoom?: (roomId: number) => void;
}

type TabType = 'available' | 'my-rooms' | 'active' | 'history';
type SortBy = 'newest' | 'oldest' | 'bet-high' | 'bet-low';

interface FilterOptions {
  minBet: string;
  maxBet: string;
  sortBy: SortBy;
}

const RoomBrowser: React.FC<RoomBrowserProps> = ({ onJoinRoom, onRejoinRoom }) => {
  const { publicKey } = useWallet();
  const { fetchAllGameRooms, handleTimeout, cancelRoom, isProgramReady } = useAnchorProgram();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRoomId, setManualRoomId] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // Circuit breaker for failed requests
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const [lastFailureTime, setLastFailureTime] = useState<number>(0);
  const MAX_FAILURES = 3;
  const CIRCUIT_RESET_TIME = 60000; // 1 minute

  // New state for enhanced UI
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [filters, setFilters] = useState<FilterOptions>({
    minBet: '',
    maxBet: '',
    sortBy: 'newest',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const ROOMS_PER_PAGE = 10;

  const loadRooms = useCallback(async (forceRefresh = false, isManual = false) => {
    console.log('=== loadRooms called ===');
    console.log('isProgramReady:', isProgramReady);
    console.log('forceRefresh:', forceRefresh);

    if (!isProgramReady) {
      console.log('Program not ready yet, skipping room fetch');
      return;
    }

    // Circuit breaker logic - skip automatic requests if circuit is open
    const now = Date.now();
    if (isCircuitOpen && !isManual) {
      if (now - lastFailureTime < CIRCUIT_RESET_TIME) {
        console.log('Circuit breaker is open, skipping automatic refresh');
        return;
      }
      // Reset circuit breaker after timeout
      console.log('Resetting circuit breaker after timeout');
      setIsCircuitOpen(false);
      setConsecutiveFailures(0);
    }

    // Add a timeout wrapper to prevent hanging
    const loadWithTimeout = async () => {
      const timeout = new Promise<never>(
        (_, reject) => setTimeout(
          () => reject(new Error('Load rooms timeout after 30 seconds')),
          30000,
        ),
      );

      const loadOperation = async () => {
        console.log('Starting to load rooms...');
        if (isManual) {
          setManualLoading(true);
        }
        setLoading(true);
        setError(null);

        console.log('Calling fetchAllGameRooms...');
        const startTime = Date.now();
        const allRooms = await fetchAllGameRooms();
        const endTime = Date.now();

        console.log(`fetchAllGameRooms completed in ${endTime - startTime}ms`);
        console.log('Fetched rooms:', allRooms);
        console.log('Number of rooms:', allRooms.length);

        setRooms(allRooms);
        setHasLoadedOnce(true);

        // Reset circuit breaker on success
        if (consecutiveFailures > 0) {
          console.log('Resetting circuit breaker after successful request');
          setConsecutiveFailures(0);
          setIsCircuitOpen(false);
        }

        console.log('Successfully updated rooms state');
      };

      return Promise.race([loadOperation(), timeout]);
    };

    try {
      await loadWithTimeout();
    } catch (err) {
      console.error('Error loading rooms:', err);
      if (err instanceof Error) {
        console.error('Error stack:', err.stack);
      }

      // Update circuit breaker state
      const newFailureCount = consecutiveFailures + 1;
      setConsecutiveFailures(newFailureCount);
      setLastFailureTime(Date.now());
      
      if (newFailureCount >= MAX_FAILURES) {
        console.log('Circuit breaker opened due to consecutive failures');
        setIsCircuitOpen(true);
      }

      // Set appropriate error messages
      let errorMessage = 'Failed to load rooms';
      if (err instanceof Error) {
        if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
          errorMessage = 'Network is busy. Automatic refreshing paused. You can manually refresh in a moment.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Network connection is slow. Please check your connection.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setHasLoadedOnce(true); // Set this to true so we don't keep retrying
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
      if (isManual) {
        setManualLoading(false);
      }
    }
  }, [fetchAllGameRooms, isProgramReady, consecutiveFailures, isCircuitOpen, lastFailureTime]);

  useEffect(() => {
    // Only load rooms once when the program becomes ready
    if (isProgramReady && !hasLoadedOnce) {
      loadRooms();
      // Start polling for room updates every 45 seconds (much less aggressive)
      const interval = setInterval(async () => {
        // Skip auto-refresh if circuit is open
        if (isCircuitOpen) {
          console.log('Skipping auto-refresh due to circuit breaker');
          return;
        }

        console.log('Auto-refreshing rooms for real-time updates...');
        setIsAutoRefreshing(true);
        try {
          await loadRooms(false, false); // Don't use forceRefresh flag for auto-updates
          setLastRefreshTime(Date.now());
        } finally {
          setIsAutoRefreshing(false);
        }
      }, 45000); // Changed to 45 seconds to prevent rate limiting
      setPollingInterval(interval);
    }
  }, [isProgramReady, hasLoadedOnce, loadRooms, isCircuitOpen]);
  // Cleanup polling on unmount
  useEffect(() => () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      console.log('Cleared room polling interval');
    }
  }, [pollingInterval]);

  const canRejoinRoom = (room: GameRoom) => {
    if (!publicKey || !room.status || !('selectionsPending' in room.status)) {
      return false;
    }
    // Check if current wallet is one of the players
    const isPlayer1 = room.player1.toString() === publicKey.toString();
    const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
    return isPlayer1 || isPlayer2;
  };

  // Helper functions for room categorization
  const isMyRoom = (room: GameRoom) => {
    if (!publicKey) return false;
    const isPlayer1 = room.player1.toString() === publicKey.toString();
    const isPlayer2 = room.player2 && room.player2.toString() === publicKey.toString();
    return isPlayer1 || isPlayer2;
  };

  const isAvailableRoom = (room: GameRoom) => {
    return room.status && 'waitingForPlayer' in room.status && !isMyRoom(room);
  };

  const isActiveRoom = (room: GameRoom) => {
    return room.status && ('selectionsPending' in room.status || 'resolving' in room.status);
  };

  const isHistoryRoom = (room: GameRoom) => {
    return room.status && ('completed' in room.status || 'cancelled' in room.status);
  };

  // Filter and sort rooms based on current tab and filters
  const filteredAndSortedRooms = useMemo(() => {
    let filteredRooms = [...rooms];

    // Filter by tab
    switch (activeTab) {
      case 'available':
        filteredRooms = filteredRooms.filter(isAvailableRoom);
        break;
      case 'my-rooms':
        filteredRooms = filteredRooms.filter(isMyRoom);
        break;
      case 'active':
        filteredRooms = filteredRooms.filter(isActiveRoom);
        break;
      case 'history':
        filteredRooms = filteredRooms.filter(isHistoryRoom);
        break;
      default:
        break;
    }

    // Filter by bet amount
    if (filters.minBet) {
      const minBetLamports = parseFloat(filters.minBet) * 1_000_000_000;
      filteredRooms = filteredRooms.filter(
        (room) => (room.betAmount?.toNumber() || 0) >= minBetLamports,
      );
    }

    if (filters.maxBet) {
      const maxBetLamports = parseFloat(filters.maxBet) * 1_000_000_000;
      filteredRooms = filteredRooms.filter(
        (room) => (room.betAmount?.toNumber() || 0) <= maxBetLamports,
      );
    }

    // Sort rooms
    filteredRooms.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return (b.createdAt?.toNumber() || 0) - (a.createdAt?.toNumber() || 0);
        case 'oldest':
          return (a.createdAt?.toNumber() || 0) - (b.createdAt?.toNumber() || 0);
        case 'bet-high':
          return (b.betAmount?.toNumber() || 0) - (a.betAmount?.toNumber() || 0);
        case 'bet-low':
          return (a.betAmount?.toNumber() || 0) - (b.betAmount?.toNumber() || 0);
        default:
          return 0;
      }
    });

    return filteredRooms;
  }, [rooms, activeTab, filters, publicKey, isAvailableRoom, isMyRoom, isActiveRoom, isHistoryRoom]);

  // Paginated rooms
  const paginatedRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * ROOMS_PER_PAGE;
    const endIndex = startIndex + ROOMS_PER_PAGE;
    return filteredAndSortedRooms.slice(startIndex, endIndex);
  }, [filteredAndSortedRooms, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRooms.length / ROOMS_PER_PAGE);

  // Reset pagination when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  const handleJoinByRoomId = () => {
    const roomId = parseInt(manualRoomId, 10);
    if (Number.isNaN(roomId)) {
      setError('Please enter a valid room ID');
      return;
    }

    // Check if this is a room that the user can rejoin
    const targetRoom = rooms.find((room) => room.roomId?.toNumber() === roomId);
    if (targetRoom && canRejoinRoom(targetRoom) && onRejoinRoom) {
      onRejoinRoom(roomId);
    } else {
      onJoinRoom(roomId);
    }

    setManualRoomId('');
  };

  const getStatusDisplay = (room: GameRoom) => {
    if (room.status && 'waitingForPlayer' in room.status) return 'Waiting for Player';
    if (room.status && 'selectionsPending' in room.status) return 'Selections Pending';
    if (room.status && 'resolving' in room.status) return 'Resolving';
    if (room.status && 'completed' in room.status) return 'Completed';
    if (room.status && 'cancelled' in room.status) return 'Cancelled';
    return 'Unknown';
  };

  const getStatusColor = (room: GameRoom) => {
    if (room.status && 'waitingForPlayer' in room.status) return 'text-green-600';
    if (room.status && 'selectionsPending' in room.status) return 'text-yellow-600';
    if (room.status && 'resolving' in room.status) return 'text-blue-600';
    if (room.status && 'completed' in room.status) return 'text-gray-600';
    if (room.status && 'cancelled' in room.status) return 'text-red-600';
    return 'text-gray-600';
  };

  const canJoinRoom = (room: GameRoom) => room.status && 'waitingForPlayer' in room.status;

  const getActionButton = (room: GameRoom) => {
    if (canJoinRoom(room)) {
      return (
        <button
          type="button"
          onClick={() => onJoinRoom(room.roomId?.toNumber() || 0)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Join
        </button>
      );
    }

    if (canRejoinRoom(room) && onRejoinRoom) {
      return (
        <button
          type="button"
          onClick={() => onRejoinRoom(room.roomId?.toNumber() || 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Rejoin
        </button>
      );
    }

    return <span className="text-gray-400">Not Available</span>;
  };

  const canClaimRefund = (room: GameRoom) => (
    // Can claim refund if room is waiting for player or selections pending
    // and the current time is past some timeout threshold
    (room.status && 'waitingForPlayer' in room.status)
    || (room.status && 'selectionsPending' in room.status)
  );

  const handleClaimRefund = async (roomId: number) => {
    try {
      setError(null);
      
      // Find the room to determine the appropriate refund method
      const room = rooms.find(r => r.roomId?.toNumber() === roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Check if this is a single-player room (waiting for player) or two-player room
      const isWaitingForPlayer = room.status && 'waitingForPlayer' in room.status;
      const isSelectionsPending = room.status && 'selectionsPending' in room.status;
      
      if (isWaitingForPlayer) {
        // Single-player room - try cancelRoom with improved error handling
        console.log(`Attempting to cancel single-player room ${roomId}`);
        try {
          await cancelRoom(roomId);
          // If successful, show success message
          setError(null);
        } catch (cancelError) {
          // Show the error message from cancelRoom which now includes helpful information
          throw cancelError;
        }
      } else if (isSelectionsPending) {
        // Two-player room - use handleTimeout
        console.log(`Attempting to handle timeout for two-player room ${roomId}`);
        await handleTimeout(roomId);
      } else {
        throw new Error('Room is not in a refundable state. Only rooms waiting for players or with pending selections can be refunded.');
      }
      
      // Reload rooms after successful refund
      await loadRooms();
    } catch (err) {
      console.error('Refund error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim refund';
      
      // Check if this is the single-player room timeout message
      if (errorMessage.includes('Single-player room cancellation:') || 
          errorMessage.includes('automatically refunded after')) {
        // This is informational, not really an error - format it better
        setError(`ℹ️ ${errorMessage}`);
      } else {
        setError(`❌ ${errorMessage}`);
      }
    }
  };

  if ((loading && !hasLoadedOnce) || !isProgramReady) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse Game Rooms</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 text-center">
            {!isProgramReady
              ? 'Connecting to Solana blockchain...'
              : 'Searching for active game rooms...'}
          </p>
          <p className="mt-2 text-sm text-gray-500 text-center">
            {!isProgramReady
              ? 'This may take a few seconds on first load'
              : 'Scanning all program accounts for available games'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Browse Game Rooms</h2>
          {isAutoRefreshing && (
            <div className="flex items-center text-sm text-blue-600">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Auto-updating...
            </div>
          )}
          {lastRefreshTime > 0 && !isAutoRefreshing && (
            <div className="text-xs text-gray-500">
              Last updated:
              {' '}
              {new Date(lastRefreshTime).toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500">
            Auto-refresh every 45s{isCircuitOpen ? ' (paused)' : ''}
          </div>
          <button
            type="button"
            onClick={() => loadRooms(true, true)}
            disabled={!isProgramReady || manualLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {manualLoading ? 'Refreshing...' : 'Manual Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {error.includes('429') || error.includes('busy') || error.includes('Too Many Requests') ? (
                <span className="text-lg">🚦</span>
              ) : error.includes('timeout') || error.includes('slow') || error.includes('connection') ? (
                <span className="text-lg">🌐</span>
              ) : (
                <span className="text-lg">⚠️</span>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-800 mb-1">
                {error.includes('429') || error.includes('busy') ? 'Network Traffic High' :
                  error.includes('timeout') || error.includes('slow')
                    ? 'Connection Issue'
                    : 'Loading Error'}
              </div>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              
              {(error.includes('429') || error.includes('busy')) && (
                <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-3">
                  <strong>What&apos;s happening:</strong>
                  {' '}
                  The Solana network is experiencing high traffic.
                  <br />
                  <strong>What to do:</strong>
                  {' '}
                  Wait a moment and try again, or enter a room ID directly above.
                </div>
              )}
              
              {error.includes('Circuit breaker') && (
                <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-3">
                  <strong>Automatic updates paused</strong>
                  {' '}
                  due to network issues. You can still manually refresh or join rooms
                  directly.
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    loadRooms(true, true);
                  }}
                  disabled={manualLoading}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {manualLoading ? 'Trying...' : 'Try Again'}
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Room ID Entry - Only show if there are rooms or if there might be private rooms */}
      {(rooms.length > 0 || hasLoadedOnce) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {rooms.length > 0 ? 'Join by Room ID' : 'Join a Private Room'}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {rooms.length > 0
              ? 'Enter a specific Room ID to join directly:'
              : 'If you have a Room ID from another player, enter it here:'}
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={manualRoomId}
              onChange={(e) => setManualRoomId(e.target.value)}
              placeholder="Enter Room ID (e.g. 125186)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleJoinByRoomId}
              disabled={!manualRoomId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'available'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Available
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my-rooms')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'my-rooms'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Rooms
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Games
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="minBet"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Min Bet (SOL)
                </label>
                <input
                  id="minBet"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minBet}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minBet: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="maxBet"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Max Bet (SOL)
                </label>
                <input
                  id="maxBet"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxBet}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxBet: e.target.value }))}
                  placeholder="100.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="sortBy"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Sort By
                </label>
                <select
                  id="sortBy"
                  value={filters.sortBy}
                  onChange={(e) => setFilters(
                    (prev) => ({ ...prev, sortBy: e.target.value as SortBy }),
                  )}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="bet-high">Highest Bet</option>
                  <option value="bet-low">Lowest Bet</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFilters({ minBet: '', maxBet: '', sortBy: 'newest' })}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rooms List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'available' && 'Available Rooms'}
            {activeTab === 'my-rooms' && 'My Rooms'}
            {activeTab === 'active' && 'Active Games'}
            {activeTab === 'history' && 'Game History'}
            {' '}
            (
            {filteredAndSortedRooms.length}
            )
          </h3>
          {totalPages > 1 && (
            <div className="text-sm text-gray-600">
              Page
              {' '}
              {currentPage}
              {' '}
              of
              {' '}
              {totalPages}
            </div>
          )}
        </div>

        {filteredAndSortedRooms.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            {activeTab === 'available' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Rooms</h3>
                <p className="text-gray-600 mb-4">There are currently no public rooms waiting for players.</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">What you can do:</p>
                  <div className="text-sm text-gray-600">
                  <p>&bull; Create a new room and invite others to play</p>
                  <p>&bull; Ask a friend to share their Room ID with you</p>
                  <p>&bull; Check back later for new public rooms</p>
                  </div>
                </div>
              </>
            )}
            {activeTab === 'my-rooms' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Found</h3>
                <p className="text-gray-600 mb-4">You haven't created or joined any rooms yet.</p>
                <div className="text-sm text-gray-600">
                  <p>&bull; Create your first room to start playing</p>
                  <p>&bull; Join an available room or use a Room ID</p>
                </div>
              </>
            )}
            {activeTab === 'active' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Games</h3>
                <p className="text-gray-600 mb-4">You don't have any games currently in progress.</p>
                <div className="text-sm text-gray-600">
                  <p>&bull; Join an available room to start a new game</p>
                  <p>&bull; Create a room and wait for someone to join</p>
                </div>
              </>
            )}
            {activeTab === 'history' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Game History</h3>
                <p className="text-gray-600 mb-4">You haven't completed any games yet.</p>
                <div className="text-sm text-gray-600">
                  <p>&bull; Play some games to see your history here</p>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => loadRooms(true)}
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Rooms
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Room ID
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Bet Amount
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Creator
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Action
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                    Refund
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room, index) => (
                  <tr key={room.roomId?.toString() || index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-mono">
                      {room.roomId?.toString()}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 font-semibold ${getStatusColor(room)}`}>
                      {getStatusDisplay(room)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3">
                      {(room.betAmount?.toNumber() || 0) / 1_000_000_000}
                      {' '}
                      SOL
                    </td>
                    <td className="border border-gray-200 px-4 py-3 font-mono text-sm">
                      {room.creator?.toString().slice(0, 8)}
                      ...
                    </td>
                    <td className="border border-gray-200 px-4 py-3">
                      {getActionButton(room)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3">
                      {canClaimRefund(room) ? (
                        <button
                          type="button"
                          onClick={() => handleClaimRefund(room.roomId?.toNumber() || 0)}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Claim Refund
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing
                  {' '}
                  {(currentPage - 1) * ROOMS_PER_PAGE + 1}
                  {' '}
                  to
                  {' '}
                  {Math.min(currentPage * ROOMS_PER_PAGE, filteredAndSortedRooms.length)}
                  {' '}
                  of
                  {' '}
                  {filteredAndSortedRooms.length}
                  {' '}
                  rooms
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      return pageNum === 1 || pageNum === totalPages
                        || Math.abs(pageNum - currentPage) <= 1;
                    })
                    .map((pageNum, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsis = index > 0 && pageNum - array[index - 1] > 1;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsis && (
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium border ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomBrowser;
