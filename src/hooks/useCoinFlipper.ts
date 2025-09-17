import {
  useCallback, useState, useRef, useEffect,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorProgram } from './useAnchorProgram';
import { getExplorerUrl, PROGRAM_CONFIG } from '../config/program';
import { rpcManager } from '../utils/rpcManager';
import type { GameNotification } from '../components/GameNotifications';

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
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userWantsToLeaveRef = useRef(false); // Track user intent to leave
  const abandonedRoomRef = useRef<number | null>(null); // Track abandoned room ID
  const lastNotificationRef = useRef<{[key: string]: number}>({}); // Track last notification time by type
  const pageLoadTimeRef = useRef(Date.now()); // Track when page was loaded
  const stateBroadcastRef = useRef<number | null>(null); // Track state broadcast timestamp

  // Notification management with duplicate prevention
  const addNotification = useCallback((notification: Omit<GameNotification, 'id'>) => {
    const notificationKey = `${notification.type}_${notification.title}_${notification.message}`;
    const now = Date.now();
    const lastTime = lastNotificationRef.current[notificationKey] || 0;
    
    // Prevent duplicate notifications within 3 seconds
    if (now - lastTime < 3000) {
      console.log('🚫 Duplicate notification prevented:', notification.title);
      return;
    }
    
    lastNotificationRef.current[notificationKey] = now;
    
    const newNotification: GameNotification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Force refresh function will be defined later after updateGameState

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

      // Calculate selection deadline based on room creation time
      // Solana Clock.unix_timestamp returns i64 Unix timestamp in SECONDS (not milliseconds)
      if (room.createdAt) {
        // Convert BN to number if needed, but createdAt is already in seconds from Solana
        const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : Number(room.createdAt);
        selectionDeadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;
        
        const readableCreatedAt = new Date(createdAtSeconds * 1000).toLocaleString();
        const readableDeadline = selectionDeadline ? new Date(selectionDeadline * 1000).toLocaleString() : 'Not set';
        console.log(`⏰ Room created at: ${readableCreatedAt}, Selection deadline: ${readableDeadline}`);
      }

      // Conservative client-side timeout detection - only trigger if significantly past deadline
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const isTimedOut = selectionDeadline && currentTimeSeconds > (selectionDeadline + 60); // Add 60 second buffer

      if (isTimedOut && (room.status && 'selectionsPending' in room.status)) {
        // Game has timed out locally but blockchain hasn't updated yet
        // Only show timeout if we have at least one player who hasn't selected
        const hasUnselectedPlayers = !room.player1Selection || !room.player2Selection;
        
        if (hasUnselectedPlayers) {
          gameStatus = 'completed';
          winner = '⏰ Game timed out - use "Handle Timeout" to claim funds';
          console.log(`⏰ Local timeout detection: Game ${roomId} timed out ${Math.floor((currentTimeSeconds - selectionDeadline!) / 60)} minutes ago`);
        } else {
          // Both players selected but still in selectionsPending - this should resolve, not timeout
          gameStatus = 'resolving';
          console.log(`🎲 Both players selected past deadline - game should resolve, not timeout`);
        }
      } else if (room.status && 'waitingForPlayer' in room.status) {
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
          // Game has a winner - determine if current player won or lost
          const isWinner = room.winner.toString() === publicKey.toString();
          winner = isWinner ? 'You won!' : 'You lost!';
        } else {
          // No winner declared - this means it was a tie (both players chose same side)
          winner = 'Tie! Both players chose the same side - bets refunded';
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

        // Log state transitions and send notifications
        if (prev && prev.gameStatus !== gameStatus) {
          console.log(`🎯 Game State Transition: ${prev.gameStatus} → ${gameStatus} (Room: ${roomId})`);
          
          // Send notifications for important state changes
          if (prev.gameStatus === 'waiting' && gameStatus === 'selecting') {
            addNotification({
              type: 'info',
              title: 'Player Joined!',
              message: 'Another player has joined the game. Make your selection!',
              duration: 5000,
            });
          } else if (prev.gameStatus === 'selecting' && gameStatus === 'resolving') {
            addNotification({
              type: 'info',
              title: 'Both Players Selected!',
              message: 'Game is now resolving automatically...',
              duration: 4000,
            });
          } else if (prev.gameStatus !== 'completed' && gameStatus === 'completed') {
            // Special handling for timeout detection
            if (winner?.includes('timed out')) {
              addNotification({
                type: 'warning',
                title: 'Game Timed Out!',
                message: 'Selection time expired. Use "Handle Timeout" button to claim your refund.',
                duration: 10000, // Extra long for timeout
              });
            } else {
              const notificationType = winner?.includes('won') ? 'success' : winner?.includes('Tie') ? 'info' : 'warning';
              addNotification({
                type: notificationType,
                title: 'Game Complete!',
                message: winner || 'Game has ended',
                duration: 8000, // Longer for final result
              });
            }
          }
        }
        
        // Also notify on opponent selection change
        if (prev && prev.opponentSelection !== opponentSelection && opponentSelection) {
          addNotification({
            type: 'info',
            title: 'Opponent Selected!',
            message: 'Your opponent has made their choice. Waiting for auto-resolution...',
            duration: 4000,
          });
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
      
      // If this was a user-initiated update and failed, suggest a force refresh
      if (userInitiated) {
        setError('Failed to update game state. Try using the "Force Refresh" button.');
      }
    }
  }, [program, publicKey, fetchGameRoom, addNotification]);

  // Simple state synchronization via localStorage for same-device users
  const broadcastStateChange = useCallback((roomId: number, changeType: string, data?: any) => {
    try {
      const broadcastKey = `coinflip_state_${roomId}`;
      const broadcastData = {
        timestamp: Date.now(),
        changeType,
        roomId,
        data,
        source: publicKey?.toString(),
      };
      localStorage.setItem(broadcastKey, JSON.stringify(broadcastData));
      
      // Clean up old broadcasts after 5 minutes
      setTimeout(() => {
        try {
          const current = localStorage.getItem(broadcastKey);
          if (current && JSON.parse(current).timestamp === broadcastData.timestamp) {
            localStorage.removeItem(broadcastKey);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 300000);
      
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Failed to broadcast state change:', e);
    }
  }, [publicKey]);

  // Listen for state changes from other tabs/windows
  useEffect(() => {
    if (!gameState.roomId) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key?.startsWith(`coinflip_state_${gameState.roomId}`)) return;
      if (!e.newValue) return;

      try {
        const broadcastData = JSON.parse(e.newValue);
        
        // Ignore our own broadcasts
        if (broadcastData.source === publicKey?.toString()) return;
        
        // Only react to recent broadcasts
        if (Date.now() - broadcastData.timestamp > 10000) return;
        
        console.log(`📡 Received state broadcast from another user:`, broadcastData);
        
        // Refresh our state when we detect changes from other users
        if (broadcastData.changeType === 'timeout_handled' || 
            broadcastData.changeType === 'game_completed' ||
            broadcastData.changeType === 'selection_made' ||
            broadcastData.changeType === 'player_joined') {
          
          console.log(`🔄 Refreshing state due to: ${broadcastData.changeType}`);
          setTimeout(() => {
            if (gameState.roomId) {
              updateGameState(gameState.roomId, false);
            }
          }, 1000); // Small delay to allow blockchain to settle
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameState.roomId, publicKey, updateGameState]);

  // Smart background refresh - MUCH less aggressive, only for critical states
  useEffect(() => {
    // Clear existing interval FIRST to prevent duplicates
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

    // Enhanced background refresh for all active game states
    if (
      gameState.roomId
      && (gameState.gameStatus === 'resolving' || gameState.gameStatus === 'waiting' || gameState.gameStatus === 'selecting')
      && !isRpcCircuitOpen()
      && !userWantsToLeaveRef.current
    ) {
      console.log(
        `🔄 Starting intelligent background refresh for ${gameState.gameStatus} game:`,
        gameState.roomId,
      );

      let refreshAttempts = 0;
      const maxRefreshAttempts = 15; // Extended to 15 attempts
      const currentGameState = gameState.gameStatus; // Capture current state to avoid stale closures

        // Much more conservative refresh intervals to reduce race conditions and server load
        const getRefreshInterval = (attempt: number) => {
          if (currentGameState === 'waiting') {
            // Very conservative for waiting - detect when player joins
            if (attempt < 2) return 8000; // First 2 attempts every 8 seconds
            if (attempt < 6) return 15000; // Next 4 attempts every 15 seconds
            return 30000; // After that, every 30 seconds
          } else if (currentGameState === 'selecting') {
            // Conservative for selecting - detect opponent selections  
            if (attempt < 3) return 6000; // First 3 attempts every 6 seconds
            if (attempt < 8) return 12000; // Next 5 attempts every 12 seconds
            return 20000; // After that, every 20 seconds
          }
          // For resolving games - faster to catch quick resolution
          if (attempt < 4) return 5000; // First 4 attempts every 5 seconds
          if (attempt < 10) return 10000; // Next 6 attempts every 10 seconds
          return 15000; // After that, every 15 seconds
        };

      const doBackgroundRefresh = async () => {
        if (userWantsToLeaveRef.current || !gameState.roomId) {
          console.log('😫 Stopping background refresh - user wants to leave or no active game');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        // More conservative refresh timing to prevent race conditions
        const timeSinceUpdate = Date.now() - gameState.lastUpdated;
        const MIN_UPDATE_INTERVAL = 10000; // Increased to 10 seconds minimum
        
        if (timeSinceUpdate > MIN_UPDATE_INTERVAL) {
          try {
            console.log(`🔄 Background refresh attempt ${refreshAttempts + 1}/${maxRefreshAttempts}`);
            
            // Use RPC manager to prevent duplicate requests
            const roomCacheKey = `fetchGameRoom-${gameState.roomId}`;
            let room;
            
            try {
              room = await fetchGameRoom(gameState.roomId, false);
            } catch (fetchError) {
              console.warn(`⚠️ Failed to fetch room during background refresh:`, fetchError);
              return; // Skip this refresh attempt
            }
            
            if (!room) {
              console.warn(`⚠️ Room ${gameState.roomId} not found during background refresh`);
              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              return;
            }

            // Check if the room state has actually changed before updating
            const roomStatusChanged = 
              (currentGameState === 'waiting' && room.status && 'selectionsPending' in room.status) ||
              (currentGameState === 'selecting' && room.status && 'resolving' in room.status) ||
              (currentGameState === 'resolving' && room.status && 'completed' in room.status);

            if (roomStatusChanged) {
              console.log(`🎉 Game state progressed from ${currentGameState} - stopping background refresh`);
              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              // Update state one final time before stopping
              await updateGameState(gameState.roomId, false);
              return;
            }
            
            // Only update if significant changes detected (avoid unnecessary re-renders)
            if (roomStatusChanged || 
                (refreshAttempts % 3 === 0)) { // Periodic full refresh every 3rd attempt
              await updateGameState(gameState.roomId, false);
            } else {
              console.log(`📊 No significant changes detected, skipping state update`);
            }

          } catch (err) {
            console.warn(`⚠️ Background refresh attempt ${refreshAttempts + 1} failed:`, err);
            
            // Exponentially back off on errors to reduce server load
            const backoffDelay = Math.min(30000, 2000 * Math.pow(2, Math.min(refreshAttempts, 4)));
            console.log(`⏳ Backing off for ${backoffDelay}ms due to error`);
            
            // After several failed attempts, provide user guidance
            if (refreshAttempts > 6) {
              setError('Game state monitoring is experiencing issues. You may need to refresh the page or handle timeout manually.');
            }
            
            return;
          }
        } else {
          console.log(`⏭️ Skipping refresh - only ${Math.round((Date.now() - gameState.lastUpdated) / 1000)}s since last update`);
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
        
        // Add small random jitter to prevent multiple users from syncing requests
        const interval = getRefreshInterval(refreshAttempts);
        const jitter = Math.random() * 500; // Up to 500ms jitter
        pollingIntervalRef.current = setTimeout(doBackgroundRefresh, interval + jitter);
      };

      // Start the first refresh with conservative delays to prevent immediate flooding
      const initialDelay = gameState.gameStatus === 'selecting' ? 3000 : 
                          gameState.gameStatus === 'waiting' ? 5000 : 4000; // 3s for selecting, 5s for waiting, 4s for resolving
      
      console.log(`⏰ Scheduling first background refresh in ${initialDelay}ms for ${gameState.gameStatus} state`);
      pollingIntervalRef.current = setTimeout(doBackgroundRefresh, initialDelay);
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
    // Remove gameState.lastUpdated from dependencies to prevent constant re-creation
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

        // Check timeout status using creation time + timeout duration
        if (room.createdAt) {
          const now = Math.floor(Date.now() / 1000);
          const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : Number(room.createdAt);
          const deadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;
          const timeoutThreshold = 300; // 5 minutes grace period after deadline

          console.log(`⏰ Rejoin timeout check: Now=${now}, CreatedAt=${createdAtSeconds}, Deadline=${deadline}, Grace=${timeoutThreshold}`);
          
          // Re-enable timeout rejection with correct timestamp handling
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
      // Calculate selection deadline from creation time
      // Solana timestamps are already in Unix seconds format
      if (room.createdAt) {
        const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : Number(room.createdAt);
        selectionDeadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;
        console.log(`⏰ Rejoin: Room created at ${new Date(createdAtSeconds * 1000).toLocaleString()}, deadline at ${new Date(selectionDeadline! * 1000).toLocaleString()}`);
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
        if (room.winner) {
          // Game has a winner - determine if current player won or lost
          const isWinner = room.winner.toString() === publicKey.toString();
          winner = isWinner ? 'You won!' : 'You lost!';
        } else {
          // No winner declared - this means it was a tie (both players chose same side)
          winner = 'Tie! Both players chose the same side - bets refunded';
        }
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
        winner,
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
      
      // Force a state update after rejoining to ensure all users are synchronized
      setTimeout(() => {
        updateGameState(roomId, true); // User-initiated refresh to get latest state
      }, 1000); // Short delay to allow state to settle

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
          if (!room || !room.createdAt) return null;
          const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : Number(room.createdAt);
          const deadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;
          console.log(`⏰ Join: Room created at ${new Date(createdAtSeconds * 1000).toLocaleString()}, deadline at ${new Date(deadline * 1000).toLocaleString()}`);
          return deadline;
        })(),
        lastUpdated: Date.now(),
        isStale: false,
      });

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Room joined:', { roomId, tx: getExplorerUrl(tx) });
      }

      // Broadcast that a player joined
      broadcastStateChange(roomId, 'player_joined', { tx });

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
      
      // Broadcast selection to other users/tabs
      broadcastStateChange(gameState.roomId, 'selection_made', { selection, tx });

      // Enhanced post-selection state management with proper transaction confirmation waiting
      setTimeout(async () => {
        if (gameState.roomId) {
          try {
            console.log('🔄 Post-selection state refresh for room:', gameState.roomId);
            
            // Wait for transaction to be fully confirmed and blockchain state to update
            console.log('⏳ Waiting for blockchain state to update after selection...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            
            // FORCE clear the cache to ensure fresh data after selection
            rpcManager.clearCache();
            console.log('🗑️ Cache cleared after selection to ensure fresh game state');
            
            await updateGameState(gameState.roomId, true); // User-initiated after their action

            // Check if both players have now selected - with fresh data
            const room = await fetchGameRoom(gameState.roomId, true);
            if (room && room.player1Selection && room.player2Selection) {
              console.log('🎯 Both players have selected - game should auto-resolve');

              // Wait longer for the auto-resolution to complete on-chain
              setTimeout(async () => {
                console.log('🔄 Final state check after potential auto-resolution');
                
                // Additional confirmation delay before final check
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                rpcManager.clearCache(); // Clear cache again
                await updateGameState(gameState.roomId!, true);
              }, 5000); // Increased to 5 seconds for auto-resolution
            }
          } catch (err) {
            console.warn('⚠️ Failed to refresh game state after selection:', err);
            // Set a helpful error but don't break the selection flow
            setError('Your selection was made successfully, but we\'re having trouble refreshing the game state. Try clicking "Refresh Game State" if needed.');
          }
        }
      }, 2500); // Increased initial delay to allow transaction confirmation

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

  // Check if a room is timed out based on creation time + timeout duration
  const isRoomTimedOut = useCallback(async (roomId: number) => {
    if (!program || !publicKey) return false;
    try {
      const room = await fetchGameRoom(roomId);
      if (!room || !room.createdAt) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : room.createdAt;
      const deadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;
      
      console.log('Timeout check:', {
        now,
        createdAt: createdAtSeconds,
        deadline,
        isTimedOut: now > deadline,
        roomId,
      });

      // Check if timeout has been reached
      const isTimedOut = now > deadline;
      if (isTimedOut) {
        console.log('⏰ Local timeout detection: Game', roomId, 'timed out', Math.floor((now - deadline) / 60), 'minutes ago');
      }
      return isTimedOut;
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

    let timeoutResult: { tx: string } | undefined;

    try {
      console.log('🔄 Handling timeout for room:', roomId);
      timeoutResult = await handleTimeout(roomId);
      const { tx } = timeoutResult;

      console.log('✅ Timeout blockchain transaction successful:', tx);

      // Clear abandoned room since timeout was successful
      if (abandonedRoomRef.current === roomId) {
        abandonedRoomRef.current = null;
        console.log('✅ Cleared abandoned room after successful timeout');
      }

      // CRITICAL: Reset leave flag before state updates to allow refresh
      userWantsToLeaveRef.current = false;
      console.log('✅ Reset userWantsToLeave flag to allow state updates');

      // First, update local state immediately for responsive UI
      console.log('📱 Setting local game state to completed...');
      setGameState((prev) => {
        const newState = {
          ...prev,
          gameStatus: 'completed' as const,
          winner: 'Game timed out - funds refunded',
          txSignature: tx,
          lastUpdated: Date.now(),
          isStale: false,
        };
        console.log('📱 Local state updated:', newState);
        return newState;
      });

      // Then refresh from blockchain to ensure consistency
      console.log('🔄 Refreshing game state from blockchain...');
      setTimeout(async () => {
        try {
          await updateGameState(roomId, true);
          console.log('✅ Blockchain state refresh completed successfully');
          
          // Add notification for successful timeout handling
          addNotification({
            type: 'success',
            title: 'Timeout Handled!',
            message: 'Game timeout processed successfully. Funds have been refunded.',
            duration: 8000,
          });
          
          // Broadcast state change to other users/tabs
          broadcastStateChange(roomId, 'timeout_handled', { tx });
          
        } catch (refreshErr) {
          console.warn('⚠️ Blockchain refresh failed (but timeout transaction was successful):', refreshErr);
          // Don't throw error since timeout transaction was successful
        }
      }, 1000); // Small delay to allow blockchain state to settle

      // Log for debugging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Game timeout handled:', {
          roomId,
          tx: getExplorerUrl(tx),
        });
      }

      return timeoutResult;
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

      console.error('❌ Timeout handling failed:', err);
      setError(errorMessage);
      return undefined;
    } finally {
      setLoading(false);
      // Always restore leave state if we weren't leaving before AND timeout succeeded
      if (!wasLeavingBefore && timeoutResult) {
        userWantsToLeaveRef.current = false;
        console.log('✅ Restored userWantsToLeave flag after successful timeout');
      }
    }
  }, [program, publicKey, handleTimeout, updateGameState]);

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

  const forceRefreshGameState = useCallback(async (roomId?: number) => {
    const targetRoomId = roomId || gameState.roomId;
    if (!targetRoomId) {
      console.warn('⚠️ No room ID provided for force refresh');
      return;
    }
    
    console.log(`🔄 Force refreshing game state for room ${targetRoomId}`);
    
    try {
      // Clear all caches first for completely fresh data
      clearRpcCache();
      
      // Mark state as stale during refresh
      setGameState((prev) => ({ ...prev, isStale: true }));
      
      // Force refresh the specific room data
      const room = await forceRefreshGameRoom(targetRoomId);
      if (room) {
        await updateGameState(targetRoomId, true);
      } else {
        console.warn(`Room ${targetRoomId} not found during force refresh`);
        setError('Room not found. It may have been deleted or completed.');
      }
    } catch (err) {
      console.error('Error in force refresh:', err);
      setError('Failed to refresh game state. Please try again.');
      setGameState((prev) => ({ ...prev, isStale: false }));
    }
  }, [gameState.roomId, clearRpcCache, forceRefreshGameRoom, updateGameState]);

  const refreshAllRooms = useCallback(
    () => forceRefreshAllRooms(),
    [forceRefreshAllRooms],
  );

  // Get the abandoned room ID (for UI display)
  const getAbandonedRoomId = useCallback(() => abandonedRoomRef.current, []);

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

      // Check for timeout issues using creation time + timeout duration
      if (room.createdAt) {
        const now = Math.floor(Date.now() / 1000);
        const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : room.createdAt;
        const deadline = createdAtSeconds + PROGRAM_CONFIG.selectionTimeoutSeconds;

        // TEMPORARY: Disable timeout detection in diagnosis
        // if (now > deadline) {
        //   issues.push(`Game timed out ${Math.floor((now - deadline) / 60)} minutes ago`);
        //   recommendations.push('Use "Handle Timeout" to claim refunds');
        // }
        console.log('⚠️ Timeout detection in diagnosis temporarily disabled');
      }

      // Check for stuck resolution (VRF fields removed from current program version)
      if (room.status && 'resolving' in room.status) {
        // Simple check - if game has been in resolving state for too long
        if (room.createdAt) {
          const now = Math.floor(Date.now() / 1000);
          const createdAtSeconds = room.createdAt.toNumber ? room.createdAt.toNumber() : room.createdAt;
          const stuckThreshold = 10 * 60; // 10 minutes
          
          if (now > createdAtSeconds + stuckThreshold) {
            issues.push('Game has been resolving for too long');
            recommendations.push('Try "Handle Timeout" to recover funds');
          }
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
          // Note: selectionDeadline calculated client-side as createdAt + timeout
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
    // Notifications
    notifications,
    addNotification,
    dismissNotification,
    clearNotifications,
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
