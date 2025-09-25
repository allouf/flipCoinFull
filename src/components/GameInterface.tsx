import React, { useState, useEffect } from 'react';
import { useFairCoinFlipper, CoinSide, GamePhase } from '../hooks/useFairCoinFlipper';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from './WalletConnectButton';

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
}> = ({ coinResult, winner, winnerPayout, houseFee, playerChoice }) => {
  if (!coinResult || !winner) return null;

  const isWinner = winner === 'You won!';

  return (
    <div className={`
      p-6 rounded-lg border-2 text-center
      ${isWinner ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
    `}>
      <div className="text-4xl mb-4">
        {coinResult === 'heads' ? '👑' : '⚡'}
      </div>
      <h3 className="text-xl font-bold mb-2">
        Coin Result: {coinResult.toUpperCase()}
      </h3>
      <p className="text-lg mb-2">
        Your Choice: {playerChoice?.toUpperCase()}
      </p>
      <div className={`text-2xl font-bold mb-4 ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
        {winner}
      </div>
      {winnerPayout && isWinner && (
        <div className="space-y-1">
          <p className="text-green-600 font-semibold">
            Payout: {winnerPayout.toFixed(4)} SOL
          </p>
          {houseFee && (
            <p className="text-gray-500 text-sm">
              House Fee: {houseFee.toFixed(4)} SOL
            </p>
          )}
        </div>
      )}
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
export const GameInterface: React.FC = () => {
  const { connected } = useWallet();
  const {
    gameState,
    notifications,
    createGame,
    joinExistingGame,
    revealChoice,
    resetGame,
    generateGameId,
    dismissNotification,
  } = useFairCoinFlipper();

  // Local UI state
  const [selectedChoice, setSelectedChoice] = useState<CoinSide>('heads');
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [joinGameId, setJoinGameId] = useState<string>('');

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

  const handleRevealChoice = async () => {
    const success = await revealChoice();
    if (success) {
      console.log('Choice revealed successfully');
    }
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

      {/* Game Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Game Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Choice Selection */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Choose Your Side
            </h3>
            <div className="flex justify-center space-x-8">
              <CoinChoice
                side="heads"
                selected={selectedChoice === 'heads'}
                disabled={gameState.phase !== 'idle' && gameState.phase !== 'waiting'}
                onClick={() => setSelectedChoice('heads')}
              />
              <CoinChoice
                side="tails"
                selected={selectedChoice === 'tails'}
                disabled={gameState.phase !== 'idle' && gameState.phase !== 'waiting'}
                onClick={() => setSelectedChoice('tails')}
              />
            </div>
          </div>

          {/* Game Actions */}
          <div className="bg-white rounded-lg p-6 shadow-md space-y-6">
            {gameState.phase === 'idle' && (
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
                    const url = `${window.location.origin}?gameId=${gameState.gameId}`;
                    navigator.clipboard.writeText(url);
                    // Simple notification (can be improved with toast)
                    alert('Game link copied to clipboard!');
                  }}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  📋 Copy Game Link
                </button>
              </div>
            )}

            {gameState.phase === 'revealing' && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Time to Reveal!
                </h3>
                <p className="text-gray-600 mb-6">
                  Both players have committed. Reveal your choice to complete the game.
                </p>
                <button
                  onClick={handleRevealChoice}
                  disabled={gameState.isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {gameState.isLoading ? 'Revealing...' : 'Reveal Choice'}
                </button>
              </div>
            )}

            {gameState.phase === 'resolved' && (
              <div className="space-y-4">
                <GameResult
                  coinResult={gameState.coinResult}
                  winner={gameState.winner}
                  winnerPayout={gameState.winnerPayout}
                  houseFee={gameState.houseFee}
                  playerChoice={gameState.playerChoice}
                />
                <button
                  onClick={resetGame}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Game Info */}
        <div className="space-y-6">
          {/* Game Stats */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Game Info
            </h3>
            <GameStats
              gameId={gameState.gameId}
              betAmount={gameState.betAmount}
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

          {/* How to Play */}
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
        </div>
      </div>
    </div>
  );
};
