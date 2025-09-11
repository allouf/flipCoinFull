import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useCoinFlipper } from '../hooks/useCoinFlipper';
import RoomBrowser from './RoomBrowser';
import RefundManager from './RefundManager';
import AboutGame from './AboutGame';
import CountdownTimer from './CountdownTimer';

const getJoinButtonTitle = (connected: boolean, roomId: string): string => {
  if (!connected) return 'Please connect your wallet first';
  if (!roomId) return 'Please enter a room ID';
  return '';
};

const getCreateButtonTitle = (
  connected: boolean,
  betAmount: string,
  walletBalance: number | null,
): string => {
  if (!connected) return 'Please connect your wallet first';
  if (betAmount && walletBalance !== null && (parseFloat(betAmount) + 0.01) > walletBalance) {
    return 'Insufficient balance for this bet amount';
  }
  return '';
};

const getStatusClassName = (status: string): string => {
  switch (status) {
    case 'waiting': return 'bg-yellow-100 text-yellow-800';
    case 'selecting': return 'bg-blue-100 text-blue-800';
    case 'resolving': return 'bg-purple-100 text-purple-800';
    case 'completed': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'waiting': return 'Waiting for Player';
    case 'selecting': return 'Making Selections';
    case 'resolving': return 'Resolving Game';
    case 'completed': return 'Game Completed';
    default: return status;
  }
};

export const BlockchainGame: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const {
    gameState,
    loading,
    error,
    createRoom,
    joinRoom,
    rejoinRoom,
    makeSelection,
    checkForExistingGame,
    resetGame,
    leaveGame,
    handleGameTimeout,
    checkCurrentRoomTimeout,
  } = useCoinFlipper();

  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [roomIdToJoin, setRoomIdToJoin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'browse' | 'refund' | 'about'>('create');
  const [isCurrentRoomTimedOut, setIsCurrentRoomTimedOut] = useState(false);

  // Fetch wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey && connection) {
        try {
          const balance = await connection.getBalance(publicKey);
          setWalletBalance(balance / 1_000_000_000); // Convert to SOL
        } catch (err) {
          console.error('Failed to fetch balance:', err);
          setWalletBalance(null);
        }
      } else {
        setWalletBalance(null);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds when connected
    const interval = connected ? setInterval(fetchBalance, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected, publicKey, connection]);

  // Check for existing games when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkForExistingGame();
    }
  }, [connected, publicKey, checkForExistingGame]);

  // Check for timeout periodically during selection phase
  useEffect(() => {
    if (gameState.gameStatus === 'selecting' && gameState.roomId && !isCurrentRoomTimedOut) {
      const checkTimeout = async () => {
        const isTimedOut = await checkCurrentRoomTimeout();
        if (isTimedOut) {
          setIsCurrentRoomTimedOut(true);
        }
      };

      // Check immediately
      checkTimeout();
      
      // Check every 10 seconds during selection phase
      const timeoutInterval = setInterval(checkTimeout, 10000);
      
      return () => clearInterval(timeoutInterval);
    }
  }, [gameState.gameStatus, gameState.roomId, isCurrentRoomTimedOut, checkCurrentRoomTimeout]);

  const handleCreateRoom = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(betAmount);
    if (amount < 0.01) {
      alert('Minimum bet is 0.01 SOL');
      return;
    }

    const result = await createRoom(amount);
    if (result) {
      console.log('Room created with ID:', result.roomId);
    }
  };

  const handleJoinRoom = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    const roomId = parseInt(roomIdToJoin, 10);
    if (Number.isNaN(roomId)) {
      alert('Please enter a valid room ID');
      return;
    }

    await joinRoom(roomId);
  };

  const handleSelection = async (selection: 'heads' | 'tails') => {
    try {
      // Check if the room is timed out before making a selection
      const isTimedOut = await checkCurrentRoomTimeout();
      if (isTimedOut) {
        setIsCurrentRoomTimedOut(true);
        return;
      }
      
      await makeSelection(selection);
    } catch (err) {
      // If we get a timeout error, mark the room as timed out
      if (err instanceof Error && err.message.includes('Selection timeout exceeded')) {
        setIsCurrentRoomTimedOut(true);
      }
    }
  };

  const handleTimeoutResolution = async () => {
    if (gameState.roomId) {
      await handleGameTimeout(gameState.roomId);
    }
  };

  const handleLeaveGame = () => {
    setIsCurrentRoomTimedOut(false);
    leaveGame();
  };

  const handleJoinRoomFromBrowser = async (roomId: number) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    await joinRoom(roomId);
  };

  const handleRejoinRoomFromBrowser = async (roomId: number) => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    await rejoinRoom(roomId);
  };

  if (!connected) {
    return (
      <div className="glass-card p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">On-Chain Coin Flip</h2>
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-warning/20 text-warning rounded-full text-sm">
            <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            Wallet Not Connected
          </div>
        </div>
        <p className="text-base-content/70">Please connect your wallet to play with real SOL</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h2 className="text-2xl font-bold mb-6">On-Chain Coin Flip</h2>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Game Status Display */}
      {gameState.roomId && (
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <p className="text-sm text-base-content/70">
            Room ID:
            {gameState.roomId}
          </p>
          <p className="text-sm text-base-content/70">
            Status:
            <span className={`ml-1 px-2 py-1 rounded text-xs font-semibold ${
              getStatusClassName(gameState.gameStatus)
            }`}>
              {getStatusText(gameState.gameStatus)}
            </span>
          </p>
          <p className="text-sm text-base-content/70">
            Bet Amount:
            {gameState.betAmount}
            {' '}
            SOL
          </p>
          {gameState.playerSelection && (
            <p className="text-sm text-base-content/70">
              Your Selection:
              {gameState.playerSelection}
            </p>
          )}
          {gameState.winner && (
            <p className="text-lg font-bold text-primary mt-2">{gameState.winner}</p>
          )}
        </div>
      )}

      {/* Idle State - Create or Join */}
      {gameState.gameStatus === 'idle' && (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="tabs tabs-boxed w-fit mx-auto">
            <button
              type="button"
              className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create Room
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'join' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('join')}
            >
              Join by ID
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'browse' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse Rooms
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'refund' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('refund')}
            >
              💰 Refund
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'about' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              ℹ️ About
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'create' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Create New Room</h3>
              {/* Balance Display */}
              {connected && (
                <div className="mb-3 p-3 bg-base-200 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-base-content/70">Your Balance:</span>
                    <span className="font-mono font-semibold">
                      {walletBalance !== null
                        ? walletBalance.toFixed(3)
                        : '-.---'}
                      {' '}
                      SOL
                    </span>
                  </div>
                  {betAmount && parseFloat(betAmount) > 0 && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-base-content/70">Estimated Cost:</span>
                      <span className={`font-mono ${
                        walletBalance !== null && (parseFloat(betAmount) + 0.01) > walletBalance
                          ? 'text-error font-semibold'
                          : ''
                      }`}
                      >
                        ~
                        {(parseFloat(betAmount) + 0.01).toFixed(3)}
                        {' '}
                        SOL
                        <span className="text-xs text-base-content/50 ml-1">
                          (bet + fees)
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Insufficient balance warning */}
                  {betAmount && parseFloat(betAmount) > 0 && walletBalance !== null
                    && (parseFloat(betAmount) + 0.01) > walletBalance && (
                    <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-xs text-error">
                      ⚠️ Insufficient balance! You need
                      {' '}
                      {((parseFloat(betAmount) + 0.01) - walletBalance).toFixed(3)}
                      {' '}
                      more SOL.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Bet amount (SOL)"
                  className="input input-bordered flex-1"
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={
                    loading
                    || !connected
                    || Boolean(betAmount && walletBalance !== null
                      && (parseFloat(betAmount) + 0.01) > walletBalance)
                  }
                  className={`btn btn-primary ${
                    !connected ? 'btn-disabled' : ''
                  } ${
                    betAmount && walletBalance !== null
                      && (parseFloat(betAmount) + 0.01) > walletBalance
                      ? 'btn-disabled'
                      : ''
                  }`}
                  title={getCreateButtonTitle(connected, betAmount, walletBalance)}
                >
                  {loading ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    'Create Room'
                  )}
                </button>
              </div>
              <div className="mt-2 text-xs text-base-content/60">
                💡 Minimum bet: 0.01 SOL • Transaction fees: ~0.01 SOL
              </div>
            </div>
          )}

          {activeTab === 'join' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Join Existing Room</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomIdToJoin}
                  onChange={(e) => setRoomIdToJoin(e.target.value)}
                  placeholder="Room ID"
                  className="input input-bordered flex-1"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={loading || !roomIdToJoin || !connected}
                  className={`btn btn-secondary ${!connected ? 'btn-disabled' : ''}`}
                  title={getJoinButtonTitle(connected, roomIdToJoin)}
                >
                  {loading ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'browse' && (
            <RoomBrowser 
              onJoinRoom={handleJoinRoomFromBrowser} 
              onRejoinRoom={handleRejoinRoomFromBrowser}
            />
          )}

          {activeTab === 'refund' && (
            <RefundManager />
          )}

          {activeTab === 'about' && (
            <AboutGame />
          )}
        </div>
      )}

      {/* Waiting for Player */}
      {gameState.gameStatus === 'waiting' && (
        <div className="text-center py-8">
          <div className="loading loading-spinner loading-lg text-primary mb-4" />
          <p className="text-lg">Waiting for another player to join...</p>
          <p className="text-sm text-base-content/70 mt-2">
            Share Room ID:
            {' '}
            <span className="font-mono font-bold bg-base-200 px-2 py-1 rounded select-all">{gameState.roomId}</span>
          </p>
          <div className="mt-4 text-xs text-base-content/60">
            <p>🔄 Checking for players automatically...</p>
            <p>The game will start when someone joins!</p>
            <p className="mt-2 text-warning">⏰ Rooms expire after 5 minutes if no one joins</p>
          </div>
          
          {/* Cancel Room Option */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleLeaveGame}
              className="btn btn-outline btn-error btn-sm"
              disabled={loading}
            >
              Cancel Room
            </button>
            <p className="text-xs text-base-content/60 mt-1">
              Close this room and return to lobby (bet will be refunded)
            </p>
          </div>
        </div>
      )}

      {/* Selection Phase */}
      {gameState.gameStatus === 'selecting' && !gameState.playerSelection && (
        <div>
          {!isCurrentRoomTimedOut ? (
            // Normal selection phase
            <>
              <h3 className="text-lg font-semibold mb-4">Make Your Selection</h3>
              
              {/* Selection Countdown Timer */}
              {gameState.selectionDeadline && (
                <div className="mb-4">
                  <CountdownTimer
                    deadline={gameState.selectionDeadline * 1000} // Convert seconds to milliseconds
                    onTimeout={() => setIsCurrentRoomTimedOut(true)}
                    showWarningColors={true}
                    className=""
                  />
                </div>
              )}
              
              {/* Timeout Warning */}
              {isCurrentRoomTimedOut && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-warning text-sm">
                    ⏰ This game has timed out. Selection buttons are disabled.
                  </p>
                </div>
              )}
              
              {gameState.opponentSelection && (
                <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <p className="text-info text-sm">
                    ✅ Your opponent has made their selection. Make yours to continue!
                  </p>
                </div>
              )}
              <div className="flex gap-4 justify-center mb-4">
                <button
                  type="button"
                  onClick={() => handleSelection('heads')}
                  disabled={loading || isCurrentRoomTimedOut}
                  className="btn btn-lg btn-outline btn-primary"
                >
                  <span className="text-2xl mr-2">👑</span>
                  Heads
                </button>
                <button
                  type="button"
                  onClick={() => handleSelection('tails')}
                  disabled={loading || isCurrentRoomTimedOut}
                  className="btn btn-lg btn-outline btn-secondary"
                >
                  <span className="text-2xl mr-2">🪙</span>
                  Tails
                </button>
              </div>
              {/* Leave Game Option */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleLeaveGame}
                  className="btn btn-outline btn-error btn-sm"
                  disabled={loading}
                >
                  Leave Game
                </button>
                <p className="text-xs text-base-content/60 mt-1">
                  ⚠️ Warning: Leaving an active game will count as a loss
                </p>
              </div>
            </>
          ) : (
            // Timeout recovery options
            <>
              <h3 className="text-lg font-semibold mb-4 text-warning">
                ⏰ Game Timeout Detected
              </h3>
              <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-warning text-sm mb-3">
                  ⚠️ This game has exceeded its selection deadline.
                  {' '}
                  The game cannot continue normally.
                </p>
                <p className="text-base-content/70 text-sm">
                  You have two options:
                </p>
                <ul className="text-base-content/70 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>
                    <strong>Handle Timeout:</strong>
                    {' '}
                    Execute a blockchain transaction to resolve the timeout and get your bet refunded
                  </li>
                  <li>
                    <strong>Leave Game:</strong>
                    {' '}
                    Exit locally without blockchain interaction (your bet may remain locked)
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleTimeoutResolution}
                  disabled={loading}
                  className="btn btn-warning"
                >
                  {loading ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    <>
                      <span className="mr-2">⚡</span>
                      Handle Timeout
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleLeaveGame}
                  className="btn btn-outline btn-error"
                  disabled={loading}
                >
                  <span className="mr-2">🚪</span>
                  Leave Game
                </button>
              </div>

              <div className="mt-4 text-xs text-base-content/60 text-center">
                <p>
                  💡 Tip:
                  {' '}
                  &quot;Handle Timeout&quot; is recommended to recover your funds
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Resolving */}
      {gameState.gameStatus === 'resolving' && (
        <div className="text-center py-8">
          <div className="loading loading-spinner loading-lg text-primary mb-4" />
          <p className="text-lg">Waiting for blockchain confirmation...</p>
          {gameState.opponentSelection && (
            <p className="text-sm text-base-content/70 mt-2">Both players have made their selections</p>
          )}
        </div>
      )}

      {/* Game Completed */}
      {gameState.gameStatus === 'completed' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">
            {gameState.winner?.includes('won') ? '🎉' : '😔'}
          </div>
          <p className="text-2xl font-bold mb-4">{gameState.winner}</p>
          <button
            type="button"
            onClick={resetGame}
            className="btn btn-primary"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Transaction Link */}
      {gameState.txSignature && (
        <div className="mt-4 text-center">
          <a
            href={`https://explorer.solana.com/tx/${gameState.txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm link link-primary"
          >
            View Transaction on Explorer →
          </a>
        </div>
      )}
    </div>
  );
};
