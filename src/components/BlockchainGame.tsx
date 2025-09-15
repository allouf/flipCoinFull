import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useCoinFlipper } from '../hooks/useCoinFlipper';
import { RESOLUTION_FEE_PER_PLAYER } from '../config/constants';
import RoomBrowser from './RoomBrowser';
import RefundManager from './RefundManager';
import AboutGame from './AboutGame';
import CountdownTimer from './CountdownTimer';
import GameNotifications from './GameNotifications';

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
  if (betAmount && walletBalance !== null && (parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) > walletBalance) {
    return 'Insufficient balance for this bet amount + fees';
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
    setError,
    notifications,
    dismissNotification,
    createRoom,
    joinRoom,
    rejoinRoom,
    makeSelection,
    resolveGameManually,
    resetGame,
    leaveGame,
    handleGameTimeout,
    checkCurrentRoomTimeout,
    clearAbandonedRoom,
    handleAbandonedRoomTimeout,
    abandonedRoomId,
    forceRecoverGameState,
    diagnoseGameState,
    // Emergency functions
    forceAbandonGame,
    startFresh,
  } = useCoinFlipper();

  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [roomIdToJoin, setRoomIdToJoin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'browse' | 'refund' | 'about'>('create');
  const [isCurrentRoomTimedOut, setIsCurrentRoomTimedOut] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Track abandoned room for display (using the direct value from hook)
  // const abandonedRoomId = getAbandonedRoomId(); // Removed - using abandonedRoomId from hook

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

  // DISABLED: Check for existing games when wallet connects
  // This was causing users to be stuck in old games when trying to create new ones
  useEffect(() => {
    if (connected && publicKey) {
      // DISABLED: checkForExistingGame();
      console.log('🔍 User connected - NOT auto-checking for existing games to prevent stuck states');
    }
  }, [connected, publicKey]);

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
    return undefined;
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
    leaveGame({ isTimeout: isCurrentRoomTimedOut });
  };

  const handleAbandonedTimeout = async () => {
    try {
      await handleAbandonedRoomTimeout();
    } catch (err) {
      console.error('Failed to handle abandoned room timeout:', err);
    }
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

  const handleGameRecovery = async () => {
    setRecoveryLoading(true);
    try {
      const success = await forceRecoverGameState();
      if (success) {
        setShowDiagnostics(false);
        setDiagnosisResult(null);
      }
    } catch (err) {
      console.error('Recovery failed:', err);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleDiagnoseGame = async () => {
    try {
      const diagnosis = await diagnoseGameState();
      setDiagnosisResult(diagnosis);
      setShowDiagnostics(true);
    } catch (err) {
      console.error('Diagnosis failed:', err);
      setError(`Diagnosis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
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
    <>
      <GameNotifications 
        notifications={notifications} 
        onDismiss={dismissNotification}
      />
      <div className="glass-card p-8">
        <h2 className="text-2xl font-bold mb-6">On-Chain Coin Flip</h2>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Abandoned Room Notification */}
      {abandonedRoomId && gameState.gameStatus === 'idle' && (
        <div className="alert alert-warning mb-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="font-semibold">🚫 Abandoned Stuck Game</span>
              <br />
              <span className="text-sm">
                Room
                {' '}
                {abandonedRoomId}
                {' '}
                was abandoned to prevent wallet popups.
                {' '}
                You can still handle timeout if needed.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAbandonedTimeout}
                className="btn btn-warning btn-sm"
                disabled={loading}
                title="Handle timeout for the abandoned room to get refunds"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  '⏰ Handle Timeout'
                )}
              </button>
              <button
                type="button"
                onClick={() => clearAbandonedRoom()}
                className="btn btn-ghost btn-sm"
                title="Clear abandoned room memory (dismiss this notification)"
              >
                ✕
              </button>
            </div>
          </div>
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
            <span
              className={`ml-1 px-2 py-1 rounded text-xs font-semibold ${
                getStatusClassName(gameState.gameStatus)
              }`}
            >
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

          {/* Game Recovery Tools */}
          {(gameState.gameStatus === 'selecting' || gameState.gameStatus === 'resolving') && (
            <div className="mt-4 pt-3 border-t border-base-300">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGameRecovery}
                  disabled={loading || recoveryLoading}
                  className="btn btn-sm btn-outline btn-warning"
                  title="Force refresh game state from blockchain"
                >
                  {recoveryLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    '🔄'
                  )}
                  Refresh State
                </button>

                <button
                  type="button"
                  onClick={handleDiagnoseGame}
                  disabled={loading}
                  className="btn btn-sm btn-outline btn-info"
                  title="Diagnose game state issues"
                >
                  🔍 Diagnose
                </button>
              </div>

              {showDiagnostics && diagnosisResult && (
                <div className="mt-3 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-info">🔍 Game Diagnosis</h4>
                    <button
                      type="button"
                      onClick={() => setShowDiagnostics(false)}
                      className="btn btn-xs btn-ghost"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-sm mb-2">
                    <strong>Status:</strong>
                    {' '}
                    {diagnosisResult.status}
                  </p>

                  {diagnosisResult.issues.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-warning text-sm">Issues Found:</strong>
                      <ul className="text-xs mt-1 space-y-1">
                        {diagnosisResult.issues.map((issue: string, index: number) => (
                          <li key={`issue-${index}-${issue.slice(0, 10)}`} className="flex items-start gap-1">
                            <span className="text-warning">⚠️</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnosisResult.recommendations.length > 0 && (
                    <div>
                      <strong className="text-success text-sm">Recommendations:</strong>
                      <ul className="text-xs mt-1 space-y-1">
                        {diagnosisResult.recommendations.map((rec: string, index: number) => (
                          <li key={`rec-${index}-${rec.slice(0, 10)}`} className="flex items-start gap-1">
                            <span className="text-success">💡</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                        walletBalance !== null && (parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) > walletBalance
                          ? 'text-error font-semibold'
                          : ''
                      }`}
                      >
                        ~
                        {(parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER).toFixed(3)}
                        {' '}
                        SOL
                        <span className="text-xs text-base-content/50 ml-1">
                          (bet + tx + resolution fees)
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Insufficient balance warning */}
                  {betAmount && parseFloat(betAmount) > 0 && walletBalance !== null
                    && (parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) > walletBalance && (
                    <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-xs text-error">
                      ⚠️ Insufficient balance! You need
                      {' '}
                      {((parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) - walletBalance).toFixed(3)}
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
                      && (parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) > walletBalance)
                  }
                  className={`btn btn-primary ${
                    !connected ? 'btn-disabled' : ''
                  } ${
                    betAmount && walletBalance !== null
                      && (parseFloat(betAmount) + 0.01 + RESOLUTION_FEE_PER_PLAYER) > walletBalance
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
                💡 Minimum bet: 0.01 SOL • Tx fees: ~0.01 SOL • Resolution fee: 0.001 SOL
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
                    showWarningColors
                    className=""
                  />
                </div>
              )}

              {/* Timeout Warning */}
              {isCurrentRoomTimedOut && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-warning text-sm mb-2">
                    ⏰ This game has timed out. Selection buttons are disabled.
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleGameRecovery}
                      disabled={recoveryLoading}
                      className="btn btn-xs btn-outline btn-warning"
                    >
                      {recoveryLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        '🔄 Refresh State'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDiagnoseGame}
                      disabled={loading}
                      className="btn btn-xs btn-outline btn-info"
                    >
                      🔍 Diagnose
                    </button>
                  </div>
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
                    Execute a blockchain transaction to resolve the timeout and get your
                    bet refunded
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
        <div className="text-center py-6">
          <div className="mb-6">
            <div className="loading loading-spinner loading-lg text-primary mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">🎲 Game Resolution Phase</h3>
          </div>

          {gameState.opponentSelection ? (
            <div className="mb-6 p-4 bg-success/10 border-2 border-success/30 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <div className="w-3 h-3 bg-success rounded-full mr-2 animate-pulse" />
                <p className="text-success font-bold">⚡ Auto-Resolving Game!</p>
              </div>
              <p className="text-sm text-base-content/80 mb-3">
                Both players have made their selections. The game is resolving automatically.
              </p>

              {/* Auto-resolution explanation */}
              <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-left">
                <p className="text-info font-semibold text-sm mb-2">🎲 Auto-Resolution System:</p>
                <ul className="text-xs text-base-content/70 space-y-1">
                  <li>• Game resolves automatically when both players select</li>
                  <li>• Uses VRF (Verifiable Random Function) for provably fair randomness</li>
                  <li>• Small resolution fee (0.001 SOL per player) covers blockchain costs</li>
                  <li>• No manual intervention required - just wait for confirmation</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <div className="w-3 h-3 bg-warning rounded-full mr-2 animate-pulse" />
                <p className="text-warning font-bold">⏳ Waiting for Game State Update</p>
              </div>
              <p className="text-sm text-base-content/70">
                Game is in resolving state but we're confirming both players have selected.
                <br />
                This usually updates within 15-30 seconds automatically.
              </p>
            </div>
          )}

          {/* Show error message if game resolution failed */}
          {(error && (error.includes('VRF') || error.includes('resolution failed') || error.includes('resolving'))) && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-error text-sm mb-2">
                ⚠️ Game Resolution Issue Detected
              </p>
              <p className="text-base-content/70 text-xs mb-3">
                {error}
              </p>
              <div className="bg-warning/10 border border-warning/20 rounded p-3 text-left">
                <p className="text-warning text-xs font-semibold mb-2">⚡ Recovery Options:</p>
                <ul className="text-xs text-base-content/70 space-y-1">
                  <li>
                    •
                    {' '}
                    <strong>Refresh State:</strong>
                    {' '}
                    Use the &ldquo;Refresh State&rdquo; button above to reload from blockchain
                  </li>
                  <li>
                    •
                    {' '}
                    <strong>Auto-Resolution:</strong>
                    {' '}
                    Games resolve automatically - just wait for blockchain confirmation
                  </li>
                  <li>
                    •
                    {' '}
                    <strong>Handle Timeout:</strong>
                    {' '}
                    Use if deadline has passed to claim refunds
                  </li>
                  <li>
                    •
                    {' '}
                    <strong>Diagnose:</strong>
                    {' '}
                    Use the &ldquo;Diagnose&rdquo; button to get detailed issue analysis
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Auto-Resolution Status */}
          <div className="mt-6 space-y-3">
            {/* Auto-resolution status indicator */}
            <div className="flex items-center justify-center p-4 bg-info/10 border border-info/20 rounded-lg">
              <div className="loading loading-spinner loading-sm text-info mr-3"></div>
              <div>
                <p className="text-info font-semibold">⚡ Auto-Resolution in Progress</p>
                <p className="text-sm text-base-content/70">The game will complete automatically - no action needed!</p>
              </div>
            </div>

            {/* Timeout option - only show if we can check timeout */}
            <button
              type="button"
              onClick={async () => {
                if (gameState.roomId) {
                  const isTimedOut = await checkCurrentRoomTimeout();
                  if (isTimedOut) {
                    await handleGameTimeout(gameState.roomId);
                  } else {
                    setError('Game has not yet timed out. Please wait or try again later.');
                  }
                }
              }}
              className="btn btn-warning btn-sm mr-3"
              disabled={loading}
            >
              <span className="mr-2">⏰</span>
              {loading ? 'Checking...' : 'Handle Timeout'}
            </button>

            {/* Leave Game - with clear warning */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(
                  'WARNING: This will only reset your local UI. Your funds will remain locked on the blockchain until the game resolves or times out. Continue?',
                )) {
                  handleLeaveGame();
                }
              }}
              className="btn btn-outline btn-error btn-sm"
              disabled={loading}
            >
              <span className="mr-2">🚪</span>
              Leave Game (UI Only)
            </button>

            <div className="mt-4 text-xs text-base-content/60">
              <p className="font-semibold text-warning">💡 Important:</p>
              <p>
                &quot;Handle Timeout&quot; will refund both players if the game has exceeded
                its time limit.
              </p>
              <p>
                &quot;Leave Game&quot; only resets your UI - your SOL remains locked until
                resolved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Game Completed */}
      {gameState.gameStatus === 'completed' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">
            {gameState.winner?.includes('won') ? '🎉' : 
             gameState.winner?.includes('Tie') ? '🤝' : '😔'}
          </div>
          <p className="text-2xl font-bold mb-4">{gameState.winner}</p>
          
          {/* Explanation for ties/refunds */}
          {gameState.winner?.includes('Tie') && (
            <div className="mb-6 p-4 bg-info/10 border border-info/20 rounded-lg max-w-md mx-auto">
              <h4 className="font-semibold text-info mb-2">💰 Automatic Refunds Processed</h4>
              <p className="text-sm text-base-content/80">
                Since both players chose the same side, the smart contract automatically refunded:
              </p>
              <ul className="text-sm text-base-content/70 mt-2 space-y-1">
                <li>✅ Your bet: {gameState.betAmount} SOL</li>
                <li>✅ Your resolution fee: 0.001 SOL</li>
                <li>✅ Total refunded: {(gameState.betAmount + 0.001).toFixed(3)} SOL</li>
              </ul>
              <p className="text-xs text-base-content/60 mt-3">
                💡 No action needed - funds were returned to your wallet automatically!
              </p>
            </div>
          )}
          
          <button
            type="button"
            onClick={resetGame}
            className="btn btn-primary"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Emergency Controls - Always Available */}
      {gameState.gameStatus !== 'idle' && (
        <div className="mt-6 border-t border-base-300 pt-4">
          <div className="collapse collapse-arrow bg-error/5 border border-error/20">
            <input type="checkbox" />
            <div className="collapse-title text-error text-sm font-medium">
              🚨 Emergency Controls
            </div>
            <div className="collapse-content">
              <p className="text-xs text-base-content/70 mb-4">
                Use these controls if you're stuck in any game state and need to reset.
              </p>

              <div className="space-y-2">
                {/* Force Abandon - Immediately mark game as abandoned and reset UI */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(
                      'EMERGENCY: This will mark the current game as abandoned and reset your UI to idle state. Your SOL may remain locked on-chain until properly resolved. Continue?',
                    )) {
                      forceAbandonGame();
                    }
                  }}
                  className="btn btn-error btn-xs w-full"
                  disabled={loading}
                >
                  <span className="mr-2">🆘</span>
                  Force Abandon Current Game
                </button>

                {/* Start Fresh - Complete reset */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(
                      'FRESH START: This will completely reset all game state and clear all abandoned room memory. You can then create new games normally. Continue?',
                    )) {
                      startFresh();
                    }
                  }}
                  className="btn btn-warning btn-xs w-full"
                  disabled={loading}
                >
                  <span className="mr-2">🌱</span>
                  Complete Fresh Start
                </button>

                <div className="text-xs text-base-content/60 bg-base-200 p-2 rounded mt-2">
                  <p className="font-semibold text-warning">⚠️ Important:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>These are LOCAL UI resets only</li>
                    <li>Your SOL may remain locked on-chain</li>
                    <li>Use "Handle Timeout" in the game to recover funds</li>
                    <li>"Fresh Start" allows creating new games immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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
    </>
  );
};
