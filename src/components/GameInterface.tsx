import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { useFairCoinFlipper, CoinSide, GamePhase } from '../hooks/useFairCoinFlipper';
import { useLobbyData } from '../hooks/useLobbyData';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from './WalletConnectButton';
import CoinFlipAnimation from './CoinFlipAnimation';
import { WebSocketManager } from '../services/WebSocketManager';
import { PROGRAM_ID } from '../config/constants';
import '../styles/CoinFlipAnimation.css';

// Helper functions
const truncateAddress = (address: string, startChars: number = 4, endChars: number = 4): string => {
  if (!address || address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Sub-components
const PhaseIndicator: React.FC<{ phase: GamePhase }> = ({ phase }) => {
  const getPhaseInfo = (phase: GamePhase) => {
    switch (phase) {
      case 'idle':
        return { text: 'Ready to Play', color: 'bg-gray-500', icon: '🎯' };
      case 'creating':
        return { text: 'Creating Game...', color: 'bg-blue-500', icon: '⚡' };
      case 'waiting':
        return { text: 'Waiting for Opponent', color: 'bg-yellow-500', icon: '⏳' };
      case 'committing':
        return { text: 'Making Commitments', color: 'bg-purple-500', icon: '🤝' };
      case 'revealing':
        return { text: 'Revealing Choices', color: 'bg-orange-500', icon: '🎭' };
      case 'resolved':
        return { text: 'Game Complete', color: 'bg-green-500', icon: '🏁' };
      default:
        return { text: 'Unknown', color: 'bg-gray-500', icon: '❓' };
    }
  };

  const phaseInfo = getPhaseInfo(phase);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-medium ${phaseInfo.color}`}>
      <span className="mr-2">{phaseInfo.icon}</span>
      {phaseInfo.text}
    </div>
  );
};

const CoinChoice: React.FC<{
  side: CoinSide;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ side, selected, disabled, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-24 h-24 rounded-full border-4 transition-all duration-200 
        ${selected
          ? 'border-blue-500 bg-blue-100 shadow-lg scale-110'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:scale-105'
        }
      `}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-2xl mb-1">
          {side === 'heads' ? '👑' : '⚡'}
        </span>
        <span className="text-sm font-medium text-gray-700 capitalize">
          {side}
        </span>
      </div>
      {selected && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </button>
  );
};

const BetAmountSelector: React.FC<{
  amount: number;
  onChange: (amount: number) => void;
  disabled: boolean;
}> = ({ amount, onChange, disabled }) => {
  const presetAmounts = [0.01, 0.1, 0.5, 1, 5];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Bet Amount (SOL)
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          min="0.01"
          max="100"
          step="0.01"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-gray-500">SOL</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {presetAmounts.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={`
              px-3 py-1 text-xs rounded border transition-colors
              ${amount === preset
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {preset} SOL
          </button>
        ))}
      </div>
    </div>
  );
};

const GameStats: React.FC<{
  gameId: number | null;
  betAmount: number;
  timeRemaining: number;
  createdAt: number | null;
}> = ({ gameId, betAmount, timeRemaining, createdAt }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Game ID:</span>
        <span className="font-mono">{gameId ? `#${gameId}` : 'N/A'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Bet Amount:</span>
        <span className="font-semibold">{betAmount} SOL</span>
      </div>
      {timeRemaining > 0 && (
        <div className="flex justify-between">
          <span className="text-gray-600">Time Remaining:</span>
          <span className={`font-mono ${timeRemaining < 30 ? 'text-red-500' : 'text-blue-500'}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      )}
      {createdAt && (
        <div className="flex justify-between">
          <span className="text-gray-600">Created:</span>
          <span className="font-mono text-xs">{formatDate(createdAt)}</span>
        </div>
      )}
    </div>
  );
};

const GameResult: React.FC<{
  coinResult: CoinSide | null;
  winner: string | null;
  winnerPayout: number | null;
  houseFee: number | null;
  playerChoice: CoinSide | null;
  opponentChoice: CoinSide | null;
  currentPlayerAddress: string | null;
}> = ({ coinResult, winner, winnerPayout, houseFee, playerChoice, opponentChoice, currentPlayerAddress }) => {
  if (!coinResult || !winner) return null;

  // Check if current player is the winner by comparing wallet addresses
  const isWinner = currentPlayerAddress && winner === currentPlayerAddress;

  // Check if it was a tie (both chose same or both chose different from coin)
  const bothChoseSame = playerChoice === opponentChoice;
  const isTieScenario = bothChoseSame;

  // Truncate long wallet addresses for display
  const displayWinner = winner.length > 20
    ? `${winner.slice(0, 8)}...${winner.slice(-8)}`
    : winner;

  return (
    <div className="relative overflow-hidden">
      {/* Celebration/Hard Luck Animation */}
      {isWinner && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 text-4xl animate-bounce">🎉</div>
          <div className="absolute top-0 right-1/4 text-4xl animate-bounce delay-100">🎊</div>
          <div className="absolute bottom-0 left-1/3 text-4xl animate-bounce delay-200">✨</div>
          <div className="absolute bottom-0 right-1/3 text-4xl animate-bounce delay-300">🏆</div>
        </div>
      )}

      <div className={`
        p-8 rounded-xl border-2 text-center relative
        ${isWinner
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg'
          : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'}
      `}>
        {/* Result Icon */}
        <div className={`text-7xl mb-4 ${isWinner ? 'animate-bounce' : ''}`}>
          {isWinner ? '🏆' : '😔'}
        </div>

        {/* Main Result */}
        <div className={`text-3xl font-bold mb-4 ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
          {isWinner ? '🎉 YOU WON! 🎉' : '😢 Hard Luck!'}
          {isTieScenario && (
            <p className="text-sm text-orange-600 mt-2">
              (Both players chose the same - Random tiebreaker determined winner)
            </p>
          )}
        </div>

        {/* Coin Result */}
        <div className="bg-white/50 rounded-lg p-4 mb-4">
          <div className="flex flex-col gap-3">
            {/* Coin Result */}
            <div className="text-center pb-3 border-b border-gray-300">
              <p className="text-sm text-gray-600 mb-1">Coin Landed On</p>
              <p className="text-3xl font-bold text-gray-800">
                {coinResult === 'heads' ? '👑 HEADS' : '🪙 TAILS'}
              </p>
            </div>

            {/* Choices Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your Choice</p>
                <p className="text-xl font-bold text-blue-600">
                  {playerChoice === 'heads' ? '👑 HEADS' : '🪙 TAILS'}
                </p>
                {playerChoice === coinResult && (
                  <span className="text-xs text-green-600">✓ Correct</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Opponent's Choice</p>
                <p className="text-xl font-bold text-purple-600">
                  {opponentChoice === 'heads' ? '👑 HEADS' : opponentChoice === 'tails' ? '🪙 TAILS' : '???'}
                </p>
                {opponentChoice === coinResult && (
                  <span className="text-xs text-green-600">✓ Correct</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Winner Details */}
        <div className="space-y-2">
          {winner !== 'You won!' && winner !== 'You lost!' && (
            <div className="bg-white/70 rounded-lg p-3">
              <p className="text-sm text-gray-600">Winner</p>
              <p className="font-mono text-sm font-semibold text-gray-800 break-all">
                {displayWinner}
              </p>
            </div>
          )}

          {/* Payout Info */}
          {winnerPayout && isWinner && (
            <div className="bg-green-100 rounded-lg p-4 border-2 border-green-300">
              <p className="text-green-800 font-bold text-2xl mb-2">
                +{winnerPayout.toFixed(4)} SOL
              </p>
              {houseFee && (
                <p className="text-gray-600 text-xs">
                  (House Fee: {houseFee.toFixed(4)} SOL)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationList: React.FC<{
  notifications: Array<{ id: string; type: string; title: string; message: string }>;
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg border-l-4 bg-white animate-slide-in
            ${notification.type === 'success' ? 'border-green-400' :
              notification.type === 'error' ? 'border-red-400' :
              notification.type === 'warning' ? 'border-yellow-400' :
              'border-blue-400'
            }
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="ml-3 text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Component
interface GameInterfaceProps {
  gameId?: string;
  isGameRoom?: boolean; // When true, hides create/join sections
  isSpectator?: boolean; // When true, user is spectating (read-only mode)
}

export const GameInterface: React.FC<GameInterfaceProps> = ({ gameId, isGameRoom = false, isSpectator = false }) => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const fairCoinFlipperResult = useFairCoinFlipper();
  const { allRooms } = useLobbyData();

  // Handle when wallet is not connected
  if (!fairCoinFlipperResult) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Please connect your wallet to access the game interface.</p>
      </div>
    );
  }

  const {
    gameState,
    notifications,
    createGame,
    joinExistingGame,
    revealChoice,
    resetGame,
    generateGameId,
    dismissNotification,
    addNotification,
    fetchGameData,
    loadGameByPda,
    rejoinExistingGame,
    makeChoice,
  } = fairCoinFlipperResult;

  // DEBUG: Log current game state
  console.log('🎮 GameInterface - Current game state:', {
    phase: gameState.phase,
    gameId: gameState.gameId,
    playerChoice: gameState.playerChoice,
    blockchainStatus: gameState.blockchainStatus,
    isLoading: gameState.isLoading,
    error: gameState.error,
  });

  // Local UI state
  const [selectedChoice, setSelectedChoice] = useState<CoinSide>('heads');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [joinGameId, setJoinGameId] = useState<string>('');

  // State for viewing specific game
  const [specificGameData, setSpecificGameData] = useState<any>(null);
  const [loadingGameData, setLoadingGameData] = useState(false);

  // State for coin flip animation
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealResult, setRevealResult] = useState<CoinSide | null>(null);

  // Track if we've already loaded this game
  const [hasLoadedThisGame, setHasLoadedThisGame] = useState(false);
  const [currentLoadedGameId, setCurrentLoadedGameId] = useState<string | null>(null);

  // Load specific game data when gameId is provided
  useEffect(() => {
    // Reset if game ID changed
    if (gameId !== currentLoadedGameId) {
      setHasLoadedThisGame(false);
      setCurrentLoadedGameId(gameId || null);
    }

    // Check if we should load/refresh the game data
    // Always refresh if we're waiting for a player or if we haven't loaded yet
    const shouldRefresh = gameId && allRooms && allRooms.length > 0 &&
                         (!hasLoadedThisGame ||
                          (specificGameData?.status === 'waitingForPlayer' ||
                           specificGameData?.status === 'WaitingForPlayer'));

    if (shouldRefresh) {
      console.log('🔍 Looking for game in allRooms with ID:', gameId, 'Available rooms:', allRooms.length);
      setLoadingGameData(true);

      // Find the game in allRooms by gameId (comparing as numbers)
      const foundGame = allRooms.find((room: any) => {
        const roomGameId = room.gameId?.toString() || '';
        // Compare as strings (both should be decimal representations)
        return roomGameId === gameId;
      });

      if (foundGame) {
        console.log('📊 Found game data:', foundGame);
        // Convert blockchain data to displayable format
        const betAmountSol = foundGame.betAmount ? (foundGame.betAmount.toNumber() / 1e9) : 0;
        const houseFeeSOL = foundGame.houseFee ? (foundGame.houseFee.toNumber() / 1e9) : 0;

        const currentStatus = foundGame.status ? Object.keys(foundGame.status)[0] : 'unknown';
        const formattedGameData = {
          gameId: foundGame.gameId?.toString() || '',
          status: currentStatus,
          betAmount: betAmountSol, // Convert lamports to SOL
          playerA: foundGame.playerA?.toString() || '',
          playerB: foundGame.playerB?.toString() || '',
          coinResult: foundGame.coinResult ? Object.keys(foundGame.coinResult)[0] : null,
          winner: foundGame.winner?.toString() || null,
          // Calculate winner payout: 2x bet minus house fee
          winnerPayout: foundGame.winner ? (betAmountSol * 2 - houseFeeSOL) : null,
        };

        // Check if status changed from waiting to ready
        const wasWaiting = specificGameData?.status === 'waitingForPlayer' ||
                          specificGameData?.status === 'WaitingForPlayer';
        const isNowReady = currentStatus === 'playersReady' || currentStatus === 'PlayersReady';

        if (wasWaiting && isNowReady) {
          console.log('🎮 Game status changed! Both players are now ready!');
          // Reset to allow rejoin logic to trigger
          setHasLoadedThisGame(false);
        }

        setSpecificGameData(formattedGameData);

        // Only mark as loaded if we're not waiting for players
        if (currentStatus !== 'waitingForPlayer' && currentStatus !== 'WaitingForPlayer') {
          setHasLoadedThisGame(true);
        }

        // Only rejoin game once, not on every render
        if (foundGame.status && gameState.gameId !== parseInt(gameId)) {
          if ('playersReady' in foundGame.status || 'PlayersReady' in foundGame.status) {
            console.log('🎯 Both players ready - rejoining game');
            const numericGameId = parseInt(gameId, 10);
            rejoinExistingGame(numericGameId);
          } else if ('commitmentsReady' in foundGame.status) {
            console.log('🎯 Game has commitments ready - need to rejoin');
            const numericGameId = parseInt(gameId, 10);
            rejoinExistingGame(numericGameId);
          } else if ('waitingForPlayer' in foundGame.status) {
            console.log('🎯 Game is waiting for player - need to rejoin');
            const numericGameId = parseInt(gameId, 10);
            rejoinExistingGame(numericGameId);
          }
        }

        // Subscribe to room updates for this game (with connection check)
        const wsManager = WebSocketManager.getInstance();
        const connectionStatus = wsManager.getConnectionStatus();

        if (connectionStatus.connected) {
          wsManager.subscribeToRoom(gameId);
        } else {
          console.log('⏳ WebSocket not connected yet, will subscribe when connected');
          // Will be handled by the useEffect that listens for connection status
        }
      } else {
        console.log('❌ Game not found in allRooms');
        setSpecificGameData(null);
      }

      setLoadingGameData(false);
    }
  }, [gameId, allRooms, hasLoadedThisGame, currentLoadedGameId, gameState.gameId, specificGameData?.status]);

  // Clean up WebSocket subscription when component unmounts or gameId changes
  useEffect(() => {
    if (!gameId) return;

    const wsManager = WebSocketManager.getInstance();
    let isSubscribed = false;

    // Function to handle subscription
    const handleSubscribe = () => {
      const status = wsManager.getConnectionStatus();
      if (status.connected && !isSubscribed) {
        wsManager.subscribeToRoom(gameId);
        isSubscribed = true;
        console.log('✅ Subscribed to room after connection:', gameId);
      }
    };

    // Check if WebSocket is connected, if not try to connect
    const connectionStatus = wsManager.getConnectionStatus();
    if (!connectionStatus.connected && !connectionStatus.reconnecting) {
      console.log('🔌 WebSocket not connected, attempting to connect...');
      wsManager.connect().then(() => {
        handleSubscribe();
      }).catch(err => {
        console.warn('WebSocket connection failed:', err);
        // Continue without WebSocket - game still works through blockchain polling
      });
    } else if (connectionStatus.connected) {
      // Already connected, subscribe immediately
      handleSubscribe();
    }

    // Listen for connection status changes to re-subscribe after reconnection
    const handleConnectionStatus = (status: any) => {
      if (status.connected && !isSubscribed) {
        console.log('🔄 WebSocket reconnected, re-subscribing to room:', gameId);
        handleSubscribe();
      } else if (!status.connected && isSubscribed) {
        console.log('🔌 WebSocket disconnected, will re-subscribe when reconnected');
        isSubscribed = false;
      }
    };

    wsManager.on('connectionStatus', handleConnectionStatus);

    // Listen for room updates (e.g., when a player joins)
    const handleRoomUpdate = async (data: any) => {
      console.log('🔔 Room update received:', data);
      // Refresh game state from blockchain when room is updated
      if (data?.roomId === gameId || data?.id === gameId) {
        console.log('🔄 Reloading game state due to room update...');
        const numericGameId = parseInt(gameId);
        if (!isNaN(numericGameId)) {
          // Derive the PDA for this game
          const seeds = [
            Buffer.from('game'),
            new Uint8Array(new BigUint64Array([BigInt(numericGameId)]).buffer)
          ];
          const [gamePda] = await PublicKey.findProgramAddress(
            seeds,
            PROGRAM_ID
          );
          loadGameByPda(numericGameId, gamePda.toString());
        }
      }
    };

    wsManager.on('roomUpdate', handleRoomUpdate);
    wsManager.on('room_state', handleRoomUpdate);
    wsManager.on('game_update', handleRoomUpdate); // Listen for game events (commitment, reveal, etc.)

    // Cleanup function
    return () => {
      if (isSubscribed) {
        wsManager.unsubscribeFromRoom(gameId);
      }
      wsManager.off('connectionStatus', handleConnectionStatus);
      wsManager.off('roomUpdate', handleRoomUpdate);
      wsManager.off('room_state', handleRoomUpdate);
      wsManager.off('game_update', handleRoomUpdate);
    };
  }, [gameId, loadGameByPda]);

  // Reset local state when game resets
  useEffect(() => {
    if (gameState.phase === 'idle') {
      setSelectedChoice('heads');
      setBetAmount(0.1);
      setJoinGameId('');
    }
  }, [gameState.phase]);

  const handleCreateGame = async () => {
    const success = await createGame(betAmount);
    if (success) {
      console.log('Game created successfully');
    }
  };

  const handleJoinGame = async () => {
    const gameId = parseInt(joinGameId);
    if (isNaN(gameId)) {
      alert('Please enter a valid game ID');
      return;
    }
    const success = await joinExistingGame(gameId);
    if (success) {
      console.log('Joined game successfully');
    }
  };

  const handleMakeCommitment = async () => {
    if (!selectedChoice) return;
    console.log('🔐 Making commitment with choice:', selectedChoice);
    const success = await makeChoice(selectedChoice);
    if (success) {
      console.log('✅ Commitment successful!');
    }
  };

  const handleRevealChoice = async () => {
    console.log('🔥 REVEAL BUTTON CLICKED!', {
      phase: gameState.phase,
      gameId: gameState.gameId,
      playerChoice: gameState.playerChoice,
      isLoading: gameState.isLoading
    });

    // Start the reveal process
    setIsRevealing(true);

    // Call the actual reveal function
    const success = await revealChoice();
    if (success) {
      console.log('✅ Choice revealed successfully, starting coin flip animation');

      // Get the coin result from the game state (from blockchain)
      const coinResult: CoinSide = gameState.coinResult || (Math.random() > 0.5 ? 'heads' : 'tails');
      setRevealResult(coinResult);
      setShowCoinFlip(true);
    } else {
      console.error('❌ Failed to reveal choice');
      setIsRevealing(false);
    }
  };

  const handleAnimationComplete = () => {
    console.log('🎬 Coin flip animation completed');
    setShowCoinFlip(false);
    setIsRevealing(false);
    // Results will be shown by the GameResult component
  };

  const generateNewGameId = () => {
    const newId = generateGameId();
    setJoinGameId(newId.toString());
  };

  if (!connected) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          🪙 Fair Coin Flipper
        </h2>
        <p className="text-gray-600 mb-6">
          Connect your wallet to start playing the fairest coin flip game on Solana!
        </p>
        <div className="flex justify-center">
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Notifications */}
      <NotificationList 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          🪙 Fair Coin Flipper
        </h1>
        <p className="text-gray-600">
          Secure • Transparent • Decentralized
        </p>
        <div className="mt-4">
          <PhaseIndicator phase={gameState.phase} />
        </div>
      </div>

      {/* Specific Game Data Display - Hide when game is resolved (we show GameResult instead) */}
      {gameId && gameState.phase !== 'resolved' && (
        <div className="mb-8">
          {loadingGameData && (
            <div className="text-center p-4">
              <div className="loading loading-spinner loading-md mb-2"></div>
              <p className="text-gray-600">Loading game #{gameId}...</p>
            </div>
          )}

          {specificGameData && (
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">Game #{gameId}</h2>
                  <p className="text-gray-600">Status: {specificGameData.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{specificGameData.betAmount} SOL</p>
                  <p className="text-sm text-gray-600">Bet Amount</p>
                </div>
              </div>

              {/* Dynamic status banner based on game phase */}
              {specificGameData.status === 'waitingForPlayer' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">⏳ This game is waiting for a second player to join.</p>
                </div>
              )}

              {specificGameData.status === 'playersReady' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800">🤝 Commitment Phase - Both players must lock in their choices</p>
                </div>
              )}

              {(specificGameData.status === 'commitmentsReady' || specificGameData.status === 'revealingPhase') && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-orange-800">🎭 Reveal Phase</h3>
                  <p className="text-sm text-orange-700">
                    Time to reveal choices and determine the winner!
                  </p>
                </div>
              )}

              {specificGameData.status === 'resolved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">🏁 Game Complete</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-600">Coin Result:</span>
                      <span className="font-medium">
                        {specificGameData.coinResult ? specificGameData.coinResult.toUpperCase() : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-600">Winner:</span>
                      <span className="font-medium font-mono text-xs sm:text-sm break-all sm:break-normal">
                        {specificGameData.winner ? truncateAddress(specificGameData.winner, 6, 6) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  {specificGameData.winnerPayout && (
                    <div className="mt-3 pt-3 border-t border-green-200 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payout:</span>
                        <span className="font-medium text-green-600">
                          {specificGameData.winnerPayout.toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loadingGameData && !specificGameData && gameId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800">❌ Game #{gameId} not found or failed to load.</p>
            </div>
          )}
        </div>
      )}

      {/* Game Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Game Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Choice Selection - Only show during idle phase AND not in a game room */}
          {gameState.phase === 'idle' && !gameId && (
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Choose Your Side
              </h3>
              <div className="flex justify-center space-x-8">
                <CoinChoice
                  side="heads"
                  selected={selectedChoice === 'heads'}
                  disabled={isSpectator}
                  onClick={() => setSelectedChoice('heads')}
                />
                <CoinChoice
                  side="tails"
                  selected={selectedChoice === 'tails'}
                  disabled={isSpectator}
                  onClick={() => setSelectedChoice('tails')}
                />
              </div>
            </div>
          )}

          {/* Show committed choice during revealing phase */}
          {gameState.phase === 'revealing' && gameState.playerChoice && (
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Your Committed Choice
              </h3>
              <div className="flex justify-center space-x-8">
                <CoinChoice
                  side="heads"
                  selected={gameState.playerChoice === 'heads'}
                  disabled={true}
                  onClick={() => {}}
                />
                <CoinChoice
                  side="tails"
                  selected={gameState.playerChoice === 'tails'}
                  disabled={true}
                  onClick={() => {}}
                />
              </div>
              <div className="mt-4 text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Your choice is locked: {gameState.playerChoice?.toUpperCase()}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Ready to reveal and see who wins!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Game Actions - Only show when there's actual content to display */}
          {((gameState.phase === 'idle' && !isGameRoom) ||
           gameState.phase === 'waiting' ||
           gameState.phase === 'committing' ||
           gameState.phase === 'revealing') && (
            <div className="bg-white rounded-lg p-6 shadow-md space-y-6">
              {gameState.phase === 'idle' && !isGameRoom && (
              <>
                {/* Create Game */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Create New Game
                  </h3>
                  <BetAmountSelector
                    amount={betAmount}
                    onChange={setBetAmount}
                    disabled={gameState.isLoading}
                  />
                  <button
                    onClick={handleCreateGame}
                    disabled={gameState.isLoading}
                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {gameState.isLoading ? 'Creating...' : 'Create Game'}
                  </button>
                </div>

                <div className="border-t border-gray-200 my-6"></div>

                {/* Join Game */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Join Existing Game
                  </h3>
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={joinGameId}
                        onChange={(e) => setJoinGameId(e.target.value)}
                        placeholder="Enter Game ID"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={gameState.isLoading}
                      />
                      <button
                        onClick={generateNewGameId}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                        disabled={gameState.isLoading}
                      >
                        🎲
                      </button>
                    </div>
                    <button
                      onClick={handleJoinGame}
                      disabled={gameState.isLoading || !joinGameId}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {gameState.isLoading ? 'Joining...' : 'Join Game'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {gameState.phase === 'waiting' && (
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Waiting for opponent...
                </h3>
                <p className="text-gray-600 mt-2">
                  Share your game ID: <span className="font-mono text-blue-600">#{gameState.gameId}</span>
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Copy the Game ID above and share it with a friend, or they can find your game in the lobby above!
                  </p>
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/game/${gameState.gameId}`;
                    navigator.clipboard.writeText(url);
                    addNotification({
                      type: 'success',
                      title: 'Link Copied!',
                      message: 'Game link copied to clipboard. Share it with your opponent!',
                    });
                  }}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  📋 Copy Game Link
                </button>
              </div>
            )}

            {gameState.phase === 'committing' && (
              <div className="space-y-6">
                {/* Countdown Timer */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">⏰ Make Your Commitment!</h3>
                    <div className="text-4xl font-mono font-bold mb-2">
                      {gameState.timeRemaining ? Math.floor(gameState.timeRemaining / 60) : '5'}:{gameState.timeRemaining ? String(gameState.timeRemaining % 60).padStart(2, '0') : '00'}
                    </div>
                    <p className="text-sm opacity-90">Time remaining to commit your choice</p>
                  </div>
                </div>

                {/* Critical Error Warning */}
                {gameState.error && (
                  <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-red-800 text-lg mb-2">Critical Error</h4>
                        <p className="text-red-700">{gameState.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Status */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-purple-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center flex-1">
                      <p className="text-sm text-gray-600 mb-1">Player 1</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${gameState.playerRole === 'creator' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="font-medium">{gameState.playerRole === 'creator' ? 'You' : 'Opponent'}</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-500">
                        {gameState.playerChoice && gameState.playerRole === 'creator' ? '✅ Committed' : '⏳ Waiting'}
                      </p>
                    </div>
                    <div className="text-2xl">⚔️</div>
                    <div className="text-center flex-1">
                      <p className="text-sm text-gray-600 mb-1">Player 2</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${gameState.playerRole === 'joiner' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="font-medium">{gameState.playerRole === 'joiner' ? 'You' : 'Opponent'}</span>
                      </div>
                      <p className="text-xs mt-1 text-gray-500">
                        {gameState.playerChoice && gameState.playerRole === 'joiner' ? '✅ Committed' : '⏳ Waiting'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Commitments</span>
                      <span>{gameState.playerChoice ? '1/2' : '0/2'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                        style={{ width: gameState.playerChoice ? '50%' : '0%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Choice Selection */}
                <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                  <h3 className="text-xl font-bold text-center mb-6 text-gray-800">
                    {gameState.playerChoice ? '✅ Your Choice is Locked!' : '🎯 Choose Your Side'}
                  </h3>

                  {!gameState.playerChoice ? (
                    <>
                      <div className="flex justify-center gap-8 mb-6">
                        <button
                          onClick={() => !isSpectator && setSelectedChoice('heads')}
                          disabled={isSpectator}
                          className={`group relative p-6 rounded-xl transition-all transform hover:scale-105 ${
                            selectedChoice === 'heads'
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg scale-105'
                              : 'bg-gray-100 hover:bg-gray-200'
                          } ${isSpectator ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="text-5xl mb-2">👑</div>
                          <p className={`font-bold ${selectedChoice === 'heads' ? 'text-white' : 'text-gray-700'}`}>HEADS</p>
                        </button>

                        <button
                          onClick={() => !isSpectator && setSelectedChoice('tails')}
                          disabled={isSpectator}
                          className={`group relative p-6 rounded-xl transition-all transform hover:scale-105 ${
                            selectedChoice === 'tails'
                              ? 'bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg scale-105'
                              : 'bg-gray-100 hover:bg-gray-200'
                          } ${isSpectator ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="text-5xl mb-2">🪙</div>
                          <p className={`font-bold ${selectedChoice === 'tails' ? 'text-white' : 'text-gray-700'}`}>TAILS</p>
                        </button>
                      </div>

                      <button
                        onClick={handleMakeCommitment}
                        disabled={gameState.isLoading || !selectedChoice || !!gameState.error || isSpectator}
                        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        {gameState.isLoading ? (
                          <span className="flex items-center justify-center">
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></span>
                            Committing...
                          </span>
                        ) : gameState.error ? (
                          '❌ Cannot Commit (See Error Below)'
                        ) : (
                          '🔐 Lock In My Choice'
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="inline-block p-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white mb-4">
                        <div className="text-6xl">
                          {gameState.playerChoice === 'heads' ? '👑' : '🪙'}
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-800 mb-2">
                        {gameState.playerChoice?.toUpperCase()} Locked!
                      </p>
                      <p className="text-gray-600">
                        Your choice has been cryptographically secured. Waiting for opponent...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

{gameState.phase === 'revealing' && (
              <div className="space-y-6">
                {!showCoinFlip ? (
                  <>
                    {/* Reveal Phase Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
                      <h3 className="text-2xl font-bold mb-2 text-center">
                        🎲 {gameState.isPlayerRevealed ? 'Waiting for Opponent' : 'Time to Reveal!'}
                      </h3>
                      <p className="text-center opacity-90">
                        {gameState.isPlayerRevealed
                          ? "You've revealed! Waiting for your opponent..."
                          : "Both players have committed. Time to see who wins!"}
                      </p>
                    </div>

                    {/* Player Status */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-purple-200">
                      <div className="flex justify-between items-center">
                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">You</p>
                          <div className={`inline-block p-4 rounded-full mb-2 ${
                            gameState.playerChoice === 'heads'
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                              : 'bg-gradient-to-br from-blue-400 to-purple-500'
                          }`}>
                            <div className="text-3xl text-white">
                              {gameState.playerChoice === 'heads' ? '👑' : '🪙'}
                            </div>
                          </div>
                          <p className="font-bold text-lg">{gameState.playerChoice?.toUpperCase() || 'Loading...'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {gameState.isPlayerRevealed ? '✅ Revealed' : '🔐 Committed'}
                          </p>
                        </div>

                        <div className="text-3xl">⚔️</div>

                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">Opponent</p>
                          <div className="inline-block p-4 rounded-full mb-2 bg-gray-200">
                            <div className="text-3xl">❓</div>
                          </div>
                          <p className="font-bold text-lg">HIDDEN</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {gameState.opponentRevealed ? '✅ Revealed' : '🔐 Committed'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="text-center">
                      {!gameState.isPlayerRevealed ? (
                        <>
                          <button
                            onClick={handleRevealChoice}
                            disabled={gameState.isLoading || isRevealing || isSpectator}
                            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                          >
                            {gameState.isLoading || isRevealing ? (
                              <span className="flex items-center justify-center">
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></span>
                                Revealing...
                              </span>
                            ) : (
                              '🎯 Reveal My Choice'
                            )}
                          </button>
                          <p className="text-sm text-gray-600 mt-2">
                            This will send your choice to the blockchain for final resolution
                          </p>
                        </>
                      ) : (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                          <div className="animate-pulse text-4xl mb-3">⏳</div>
                          <p className="text-lg font-semibold text-green-800">You've Revealed!</p>
                          <p className="text-sm text-green-700 mt-1">
                            Waiting for your opponent to reveal their choice...
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Show the coin flip animation */
                  <div className="coin-flip-container">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      🎲 Flipping the Coin!
                    </h3>
                    <div className="bg-white rounded-xl p-6 shadow-lg">
                      {revealResult && (
                        <CoinFlipAnimation
                          result={revealResult}
                          onAnimationComplete={handleAnimationComplete}
                          duration={3000}
                          autoStart={true}
                          showResult={true}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Resolved Phase - Show game results */}
          {gameState.phase === 'resolved' && (
            <div className="bg-white rounded-lg p-6 shadow-md">
              <GameResult
                coinResult={gameState.coinResult}
                winner={gameState.winner}
                winnerPayout={gameState.winnerPayout}
                houseFee={gameState.houseFee}
                playerChoice={gameState.playerChoice}
                opponentChoice={gameState.opponentChoice}
                currentPlayerAddress={publicKey?.toString() || null}
              />
              <div className="flex gap-3 mt-6">
                {isGameRoom && (
                  <button
                    onClick={() => navigate('/lobby')}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                  >
                    ← Back to Lobby
                  </button>
                )}
                <button
                  onClick={resetGame}
                  className={`${isGameRoom ? 'flex-1' : 'w-full'} px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200`}
                >
                  🎮 Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Game Info */}
        <div className="space-y-6">
          {/* Game Stats */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Game Info
            </h3>
            <GameStats
              gameId={gameId ? (typeof gameId === 'string' ? parseInt(gameId) : gameId) : gameState.gameId}
              betAmount={specificGameData?.betAmount || gameState.betAmount}
              timeRemaining={gameState.timeRemaining}
              createdAt={gameState.createdAt}
            />
          </div>

          {/* Status & Error */}
          {gameState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Error</h4>
              <p className="text-sm text-red-600">{gameState.error}</p>
            </div>
          )}

          {gameState.txSignature && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Transaction</h4>
              <a
                href={`https://explorer.solana.com/tx/${gameState.txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {gameState.txSignature}
              </a>
            </div>
          )}

          {/* Game-specific info based on phase */}
          {gameState.phase === 'idle' ? (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                How to Play
              </h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. Choose heads or tails</li>
                <li>2. Create a game or join existing one</li>
                <li>3. Wait for opponent to join</li>
                <li>4. Reveal your choice when ready</li>
                <li>5. See the results and collect winnings!</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Game Details */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Game #{gameState.gameId}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bet Amount:</span>
                    <span className="font-bold text-lg">{gameState.betAmount} SOL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Pot:</span>
                    <span className="font-bold text-lg text-green-600">
                      {(gameState.betAmount * 2).toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Winner Gets:</span>
                    <span className="font-bold text-purple-600">
                      {(gameState.betAmount * 2 * 0.93).toFixed(3)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">House Fee:</span>
                    <span className="text-sm">7%</span>
                  </div>
                </div>
              </div>

              {/* Phase-specific status */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2">Current Status</h4>
                <div className="text-sm text-gray-600">
                  {gameState.phase === 'waiting' && (
                    <div>
                      <p className="text-yellow-600 font-medium">⏳ Waiting for opponent to join</p>
                      <p className="mt-1">Share your game ID to invite players</p>
                    </div>
                  )}
                  {gameState.phase === 'committing' && (
                    <div>
                      <p className="text-purple-600 font-medium">🔐 Commitment Phase</p>
                      <p className="mt-1">Both players must lock in their choices</p>
                      {gameState.playerChoice && (
                        <p className="text-green-600 mt-1">✅ Your choice is locked</p>
                      )}
                    </div>
                  )}
                  {gameState.phase === 'revealing' && (
                    <div>
                      <p className="text-orange-600 font-medium">🎲 Reveal Phase</p>
                      <p className="mt-1">Time to reveal choices and determine winner</p>
                      {gameState.isPlayerRevealed && (
                        <p className="text-green-600 mt-1">✅ You have revealed</p>
                      )}
                    </div>
                  )}
                  {gameState.phase === 'resolved' && (
                    <div>
                      <p className="text-blue-600 font-medium">🏆 Game Complete</p>
                      <p className="mt-1">
                        {gameState.winner === 'you' ? '🎉 Congratulations! You won!' : '😔 Better luck next time!'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
