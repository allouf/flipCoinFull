import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { NetworkSelector } from '../components/NetworkSelector';
import { useFairCoinFlipper, CoinSide } from '../hooks/useFairCoinFlipper';
import { CoinFlip } from '../components/CoinFlip';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

export const GameRoomPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const toast = useToast();
  const gamePda = searchParams.get('pda'); // Get the gamePda from URL parameters
  const {
    gameState,
    makeChoice,
    joinExistingGame,
    rejoinExistingGame,
    loadGameByPda,
    fetchGameData,
    revealChoice,
    resetGame,
  } = useFairCoinFlipper();

  const [selectedChoice, setSelectedChoice] = useState<CoinSide>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [hasGivenUp, setHasGivenUp] = useState(false); // Track if we've given up loading
  const loadedGameRef = useRef<string | null>(null); // Track which game we've loaded
  const retryCountRef = useRef<number>(0); // Track retry attempts
  const [isSpectating, setIsSpectating] = useState(false); // Track if user is spectating (not joined yet)
  const [spectatorGameData, setSpectatorGameData] = useState<any>(null); // Store fetched game data for spectator view

  // Load game on component mount with error handling
  useEffect(() => {
    if (!gameId || !connected || hasGivenUp) return;

    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      console.error('Invalid game ID:', gameId);
      toast.error('Invalid Game ID', 'The game ID in the URL is not valid.');
      return;
    }

    // Create a unique key for this game load attempt
    const loadKey = `${gameId}-${gamePda || 'no-pda'}`;

    // Skip if we've already loaded this exact game (silent skip to reduce console noise)
    if (loadedGameRef.current === loadKey) {
      return;
    }

    // Skip if currently loading
    if (isGameLoading) {
      return;
    }

    // Check retry limit to prevent infinite loops
    if (retryCountRef.current >= 3) {
      setHasGivenUp(true);
      return;
    }

    // Log once when we first attempt to load
    if (retryCountRef.current === 0) {
      console.log(`📋 Loading game #${gameId}${gamePda ? ' with PDA' : ' from shared link'}`);
    }

    // Use efficient loading based on whether we have the PDA
    const loadGame = async () => {
      setIsGameLoading(true);
      retryCountRef.current += 1; // Increment retry counter
      loadedGameRef.current = loadKey; // Mark this game as loaded

      try {
        let success = false;

        if (gamePda) {
          // We have the PDA from the lobby - use direct loading (most efficient)
          success = await loadGameByPda(gameIdNum, gamePda);
        } else {
          // No PDA provided - user is visiting via shared link
          // Fetch game data first to check status
          const gameData = await fetchGameData(gameIdNum);

          if (gameData) {
            setSpectatorGameData(gameData);

            // Check if this wallet is already a player
            const walletAddress = publicKey?.toString();
            const isPlayerA = walletAddress === gameData.playerA;
            const isPlayerB = walletAddress === gameData.playerB;

            if (isPlayerA || isPlayerB) {
              // User is already in the game, rejoin
              console.log('👤 User is already a player, rejoining...');
              success = await rejoinExistingGame(gameIdNum);
              setIsSpectating(false);
            } else {
              // User is not in the game, show spectator view with join button
              console.log('👀 User is spectating, showing join option');
              setIsSpectating(true);
              success = true;
            }
          }
        }

        if (success) {
          return;
        }

        // Loading failed
        throw new Error('Unable to load game - game not found or not accessible');
      } catch (error) {
        console.error(`❌ Failed to load game ${gameIdNum}:`, error);
        toast.error('Game Not Found', 'Could not find or join this game. It may have expired, been completed, or you may not have permission to access it.');

        // Reset the loaded game ref on error so user can retry
        loadedGameRef.current = null;
      } finally {
        setIsGameLoading(false);
      }
    };

    // Add small delay to prevent race conditions
    const timer = setTimeout(loadGame, 500);
    return () => clearTimeout(timer);
  }, [gameId, gamePda, connected, publicKey, rejoinExistingGame, joinExistingGame, loadGameByPda, fetchGameData, toast, navigate]);

  // Reset loaded game ref, retry count, and given up state when gameId or gamePda changes
  useEffect(() => {
    loadedGameRef.current = null;
    retryCountRef.current = 0;
    setHasGivenUp(false);
  }, [gameId, gamePda]);

  // Handle game completion - navigate back to lobby
  useEffect(() => {
    if (gameState.phase === 'resolved') {
      // Show results for a few seconds, then navigate back
      const timer = setTimeout(() => {
        navigate('/lobby');
      }, 10000); // 10 seconds to view results
      
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, navigate]);

  const handleMakeChoice = async (choice: CoinSide) => {
    setSelectedChoice(choice);
    // Make the choice in the game state
    await makeChoice(choice);
  };

  const handleReveal = async () => {
    setIsFlipping(true);
    const success = await revealChoice();
    if (success) {
      // Keep flipping animation until we get the result
      setTimeout(() => {
        setIsFlipping(false);
      }, 3000);
    } else {
      setIsFlipping(false);
    }
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  const handlePlayAgain = () => {
    resetGame();
    navigate('/lobby');
  };

  const handleJoinGame = async () => {
    setIsSpectating(false);
    setIsGameLoading(true);
    try {
      const success = await joinExistingGame(parseInt(gameId!));
      if (success) {
        toast.success('Joined Game!', `Successfully joined game #${gameId}`);
      } else {
        toast.error('Join Failed', 'Could not join this game. It may be full or no longer available.');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      toast.error('Join Failed', 'An error occurred while joining the game.');
    } finally {
      setIsGameLoading(false);
    }
  };

  const renderGamePhase = () => {
    // If spectating and game is waiting for players, show join button
    if (isSpectating && gameState.phase === 'idle' && spectatorGameData) {
      const hasPlayerB = spectatorGameData.playerB && spectatorGameData.playerB !== '11111111111111111111111111111111';

      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-6 animate-pulse">🎮</div>
          <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Game #{spectatorGameData.gameId}
          </h3>
          <p className="text-lg text-base-content/70 mb-8">
            {spectatorGameData.status === 'waitingForPlayer'
              ? '🕐 Waiting for opponent to join'
              : '🎯 Game in progress'}
          </p>

          {/* Game Info Card */}
          <div className="card bg-base-200 shadow-xl max-w-md mx-auto mb-8">
            <div className="card-body">
              <h4 className="card-title justify-center mb-4">Game Details</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-base-300/50 rounded-lg">
                  <span className="flex items-center gap-2">
                    💰 <span className="font-medium">Bet Amount</span>
                  </span>
                  <span className="font-bold text-lg text-primary">{spectatorGameData.betAmount} SOL</span>
                </div>

                <div className="flex justify-between items-center p-2 bg-base-300/50 rounded-lg">
                  <span className="flex items-center gap-2">
                    👥 <span className="font-medium">Players</span>
                  </span>
                  <span className="font-bold text-lg">
                    {hasPlayerB ? (
                      <span className="text-success">2/2 ✅</span>
                    ) : (
                      <span className="text-warning">1/2 ⏳</span>
                    )}
                  </span>
                </div>

                {spectatorGameData.playerA && (
                  <div className="p-2 bg-base-300/50 rounded-lg">
                    <div className="text-sm text-base-content/60 mb-1">Player 1</div>
                    <div className="font-mono text-xs break-all">
                      {spectatorGameData.playerA.slice(0, 8)}...{spectatorGameData.playerA.slice(-8)}
                    </div>
                  </div>
                )}

                {hasPlayerB && (
                  <div className="p-2 bg-base-300/50 rounded-lg">
                    <div className="text-sm text-base-content/60 mb-1">Player 2</div>
                    <div className="font-mono text-xs break-all">
                      {spectatorGameData.playerB.slice(0, 8)}...{spectatorGameData.playerB.slice(-8)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {spectatorGameData.status === 'waitingForPlayer' && (
              <button
                onClick={handleJoinGame}
                disabled={isGameLoading}
                className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all"
              >
                {isGameLoading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Joining...
                  </>
                ) : (
                  <>🎯 Join Game for {spectatorGameData.betAmount} SOL</>
                )}
              </button>
            )}

            {spectatorGameData.status !== 'waitingForPlayer' && (
              <div className="alert alert-info max-w-md mx-auto">
                <span>🎲 This game is already in progress</span>
              </div>
            )}

            <div>
              <button onClick={handleBackToLobby} className="btn btn-ghost">
                ← Back to Lobby
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (gameState.phase) {
      case 'idle':
        return (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg mb-4"></div>
            <h3 className="text-xl font-semibold">Loading Game #{gameId}...</h3>
            <div className="space-y-2 mt-4">
              <p className="text-base-content/70">Searching for game on the blockchain...</p>
              <p className="text-sm text-base-content/50">This may take a few moments</p>
            </div>
            <div className="mt-6">
              <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm">
                ← Cancel and Return to Lobby
              </button>
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">⏳</div>
            <h3 className="text-2xl font-bold mb-4">Waiting for Opponent</h3>
            <p className="text-lg text-base-content/70 mb-6">
              Share the game ID with a friend to join: <span className="font-mono text-primary">#{gameState.gameId}</span>
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/game/${gameState.gameId}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link Copied!', 'Game link copied to clipboard');
                }}
                className="btn btn-primary"
              >
                📋 Copy Game Link
              </button>
              <div>
                <button onClick={handleBackToLobby} className="btn btn-ghost">
                  ← Back to Lobby
                </button>
              </div>
            </div>
          </div>
        );

      case 'committing':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🤝</div>
            <h3 className="text-2xl font-bold mb-4">Choose Your Side</h3>
            <p className="text-lg text-base-content/70 mb-8">
              Both players are making their selections. Choose heads or tails!
            </p>
            
            <div className="flex justify-center space-x-8 mb-8">
              <button
                onClick={() => handleMakeChoice('heads')}
                className={`btn btn-lg ${selectedChoice === 'heads' ? 'btn-primary' : 'btn-outline'}`}
              >
                👑 Heads
              </button>
              <button
                onClick={() => handleMakeChoice('tails')}
                className={`btn btn-lg ${selectedChoice === 'tails' ? 'btn-primary' : 'btn-outline'}`}
              >
                ⚡ Tails
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-base-content/60">
                Selected: <span className="font-bold capitalize">{selectedChoice}</span>
              </p>
              <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm">
                ← Back to Lobby
              </button>
            </div>
          </div>
        );

      case 'revealing':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🎭</div>
            <h3 className="text-2xl font-bold mb-4">Time to Reveal!</h3>
            <p className="text-lg text-base-content/70 mb-8">
              Both players have committed. Click reveal to see the results!
            </p>
            
            <div className="mb-8">
              <CoinFlip
                isFlipping={isFlipping}
                result={gameState.coinResult}
                onFlip={handleReveal}
                onReset={() => {}}
              />
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleReveal}
                disabled={gameState.isLoading || isFlipping}
                className="btn btn-primary btn-lg"
              >
                {gameState.isLoading || isFlipping ? 'Revealing...' : '🎲 Reveal Results'}
              </button>
              <div>
                <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm">
                  ← Back to Lobby
                </button>
              </div>
            </div>
          </div>
        );

      case 'resolved':
        const isWinner = gameState.winner === 'You won!';
        return (
          <div className="text-center py-12">
            <div className={`text-8xl mb-6 ${isWinner ? 'animate-bounce' : ''}`}>
              {isWinner ? '🎉' : '😔'}
            </div>
            <h3 className={`text-3xl font-bold mb-4 ${isWinner ? 'text-success' : 'text-error'}`}>
              {gameState.winner}
            </h3>
            
            <div className="bg-base-200 rounded-lg p-6 max-w-md mx-auto mb-8">
              <h4 className="text-lg font-semibold mb-4">Game Results</h4>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span>Coin Result:</span>
                  <span className="font-bold capitalize">{gameState.coinResult}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Choice:</span>
                  <span className="font-bold capitalize">{gameState.playerChoice}</span>
                </div>
                {gameState.winnerPayout && (
                  <div className="flex justify-between">
                    <span>Payout:</span>
                    <span className="font-bold text-success">{gameState.winnerPayout.toFixed(4)} SOL</span>
                  </div>
                )}
                {gameState.houseFee && (
                  <div className="flex justify-between text-sm text-base-content/60">
                    <span>House Fee:</span>
                    <span>{gameState.houseFee.toFixed(4)} SOL</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <button onClick={handlePlayAgain} className="btn btn-primary btn-lg">
                🎮 Play Again
              </button>
              <div>
                <button onClick={handleBackToLobby} className="btn btn-ghost">
                  ← Back to Lobby
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">❓</div>
            <h3 className="text-2xl font-bold mb-4">Unknown Game State</h3>
            <button onClick={handleBackToLobby} className="btn btn-primary">
              Back to Lobby
            </button>
          </div>
        );
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Connect Your Wallet</h2>
          <p className="text-xl text-base-content/70 mb-8">
            You need to connect your wallet to join this game.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      {/* Header */}
      <header className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20">
        <div className="navbar-start">
          <button onClick={handleBackToLobby} className="btn btn-ghost">
            ← Back
          </button>
          <h1 className="text-xl font-bold ml-4">
            Game Room {gameId ? `#${gameId}` : ''}
          </h1>
        </div>
        <div className="navbar-end gap-4">
          <NetworkSelector />
          <WalletConnectButton />
        </div>
      </header>

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Game Info */}
          <div className="bg-base-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Game #{gameState.gameId || gameId}</h3>
                <p className="text-base-content/70">Bet Amount: {gameState.betAmount} SOL</p>
              </div>
              <div className="text-right">
                <div className={`badge ${
                  gameState.phase === 'waiting' ? 'badge-warning' :
                  gameState.phase === 'committing' ? 'badge-info' :
                  gameState.phase === 'revealing' ? 'badge-secondary' :
                  gameState.phase === 'resolved' ? 'badge-success' :
                  'badge-ghost'
                }`}>
                  {gameState.phase}
                </div>
                {gameState.timeRemaining > 0 && (
                  <p className="text-sm text-base-content/60 mt-1">
                    Time left: {Math.floor(gameState.timeRemaining / 60)}:{String(gameState.timeRemaining % 60).padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Game Phase Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {renderGamePhase()}
          </div>
        </div>
      </main>
    </div>
  );
};
