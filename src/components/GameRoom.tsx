import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCoinFlipper } from '../hooks/useCoinFlipper';

interface GameRoomProps {
  gameId: number;
}

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

export const GameRoom: React.FC<GameRoomProps> = ({ gameId }) => {
  const { connected } = useWallet();
  const {
    gameState,
    makeSelection,
    revealChoice,
    resolveGame,
    handleGameTimeout,
    rejoinRoom,
    loading,
    error,
    notifications,
    dismissNotification
  } = useCoinFlipper();

  const [isCurrentRoomTimedOut, setIsCurrentRoomTimedOut] = useState(false);
  const [localStorageDebug, setLocalStorageDebug] = useState<string[]>([]);

  // Auto-rejoin the specific game
  useEffect(() => {
    if (connected && gameId && gameState.roomId !== gameId) {
      console.log('🎯 Auto-rejoining game:', gameId);
      rejoinRoom(gameId);
    }
  }, [connected, gameId, gameState.roomId, rejoinRoom]);

  // Debug localStorage when game status changes
  useEffect(() => {
    if (gameState.gameStatus === 'resolving' && gameState.playerSelection === 'lost') {
      // Check what's in localStorage
      const allKeys = Object.keys(localStorage);
      const commitmentKeys = allKeys.filter(key => key.startsWith('commitment_'));
      const debugInfo = [
        `🔍 localStorage Debug for Room ${gameId}:`,
        `Total keys in localStorage: ${allKeys.length}`,
        `Commitment keys found: ${commitmentKeys.length}`,
        ...commitmentKeys.map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return `  - ${key}: Room ${data.roomId}, Choice: ${data.choice || data.choiceNum}`;
          } catch {
            return `  - ${key}: (invalid JSON)`;
          }
        }),
        `Looking for key: commitment_${gameId}`,
        `Key exists: ${localStorage.getItem(`commitment_${gameId}`) !== null}`
      ];
      setLocalStorageDebug(debugInfo);
      debugInfo.forEach(line => console.log(line));
    }
  }, [gameState.gameStatus, gameState.playerSelection, gameId]);

  const handleSelection = async (selection: 'heads' | 'tails') => {
    try {
      await makeSelection(selection);
    } catch (err) {
      console.error('Error making selection:', err);
    }
  };

  if (!connected) {
    return (
      <div className="glass-card p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Game Room #{gameId}</h2>
        <p className="text-base-content/70">Please connect your wallet to view this game</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <h2 className="text-2xl font-bold mb-6">Game Room #{gameId}</h2>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Game Status Display */}
      {gameState.roomId === gameId && (
        <div className="mb-6 p-4 bg-base-200 rounded-lg">
          <p className="text-sm text-base-content/70">
            Room ID: {gameState.roomId}
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
            Bet Amount: {gameState.betAmount} SOL
          </p>
          {gameState.playerSelection && (
            <p className="text-sm text-base-content/70">
              Your Selection: {
                gameState.playerSelection === 'pending' ? 'Made (awaiting reveal)' :
                gameState.playerSelection === 'lost' ? '⚠️ Commitment lost - cannot reveal' :
                gameState.playerSelection
              }
            </p>
          )}
          {gameState.winner && (
            <p className="text-lg font-bold text-primary mt-2">{gameState.winner}</p>
          )}
        </div>
      )}

      {/* Game Actions based on status */}
      {gameState.roomId === gameId && (
        <>
          {/* Waiting State */}
          {gameState.gameStatus === 'waiting' && (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">Waiting for Another Player</h3>
              <p className="text-base-content/60 mb-6">
                Share this game link with a friend to start playing!
              </p>
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Share this link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/game/${gameId}`}
                    readOnly
                    className="input input-bordered flex-1 text-sm"
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}`);
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selecting State */}
          {gameState.gameStatus === 'selecting' && !gameState.playerSelection && (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Make Your Selection</h3>
              <div className="flex justify-center gap-4 mb-6">
                <button
                  className="btn btn-outline btn-lg flex-col h-auto py-4 px-8 min-w-32"
                  onClick={() => handleSelection('heads')}
                  disabled={loading}
                >
                  <span className="text-3xl mb-2">👑</span>
                  <span>Heads</span>
                </button>
                <button
                  className="btn btn-outline btn-lg flex-col h-auto py-4 px-8 min-w-32"
                  onClick={() => handleSelection('tails')}
                  disabled={loading}
                >
                  <span className="text-3xl mb-2">🦅</span>
                  <span>Tails</span>
                </button>
              </div>
            </div>
          )}

          {/* Waiting for opponent after selection */}
          {gameState.gameStatus === 'selecting' && gameState.playerSelection && !gameState.opponentSelection && (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">Waiting for Opponent</h3>
              <p className="text-base-content/60 mb-4">
                You selected: <strong>{gameState.playerSelection}</strong>
              </p>
              <p className="text-base-content/60">
                Waiting for the other player to make their selection...
              </p>
            </div>
          )}

          {/* Resolving State - Need to reveal choices */}
          {gameState.gameStatus === 'resolving' && (
            <div className="text-center">
              {gameState.playerSelection === 'lost' ? (
                <>
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold mb-2 text-error">Commitment Lost</h3>
                  <p className="text-base-content/60 mb-6">
                    Your commitment data was not found locally. This can happen if you cleared your browser data
                    or are using a different browser/device. Unfortunately, you cannot reveal your choice without
                    the original secret.
                  </p>
                  <div className="alert alert-warning">
                    <span>You may need to wait for the timeout period to pass for the game to be cancelled.</span>
                  </div>

                  {/* Show localStorage debug info */}
                  {localStorageDebug.length > 0 && (
                    <div className="mt-4 p-4 bg-base-200 rounded-lg text-left">
                      <h4 className="font-bold mb-2">🔍 Debug Info:</h4>
                      <div className="text-xs font-mono">
                        {localStorageDebug.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-warning">
                        ⚠️ Your commitment was made in a previous session. The secret needed to reveal it is lost.
                      </div>
                    </div>
                  )}
                </>
              ) : gameState.playerSelection === 'pending' ? (
                <>
                  <div className="text-6xl mb-4">🎭</div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Reveal</h3>
                  <p className="text-base-content/60 mb-6">
                    Both players have made their commitments. Time to reveal your choice!
                  </p>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={async () => {
                      try {
                        // This will trigger the reveal transaction
                        await revealChoice(gameId);
                      } catch (error) {
                        console.error('Reveal failed:', error);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      '🎭 Reveal My Choice'
                    )}
                  </button>
                  <div className="mt-4">
                    <p className="text-sm text-base-content/60">
                      This transaction will reveal your choice and may resolve the game if you're the second player to reveal.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-xl font-semibold mb-2">Waiting for Reveal</h3>
                  <p className="text-base-content/60">
                    The game is in the reveal phase. If you haven't made a commitment yet, you may not be able to participate.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Completed State */}
          {gameState.gameStatus === 'completed' && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-2">Game Completed!</h3>
              {gameState.winner && (
                <p className="text-lg font-bold text-primary mb-4">{gameState.winner}</p>
              )}
            </div>
          )}

          {/* Emergency Actions */}
          {(gameState.gameStatus === 'resolving' || gameState.gameStatus === 'selecting') && (
            <div className="mt-6 pt-4 border-t border-base-300">
              <h4 className="text-sm font-semibold text-base-content/70 mb-2">Emergency Actions</h4>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => handleGameTimeout(gameId)}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  'Handle Timeout'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* If we're not in the right game */}
      {gameState.roomId !== gameId && (
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Loading Game #{gameId}</h3>
          <p className="text-base-content/60">
            Please wait while we load the game data...
          </p>
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