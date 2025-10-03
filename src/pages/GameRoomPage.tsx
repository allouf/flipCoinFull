import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { GameInterface } from '../components/GameInterface';
import { useFairCoinFlipper } from '../hooks/useFairCoinFlipper';
import { useAnchorProgram } from '../hooks/useAnchorProgram';
import { PublicKey } from '@solana/web3.js';
import { UserPlus, ArrowLeft, Coins } from 'lucide-react';

/**
 * GameRoomPage - Individual game room using the NEW fair coin flipper system
 *
 * This page handles direct game room access via URL (/game/:gameId)
 * Uses the NEW useFairCoinFlipper hook and GameInterface component
 */
export const GameRoomPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const fairCoinFlipperResult = useFairCoinFlipper();
  const { program } = useAnchorProgram();
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayer, setIsPlayer] = useState(false);
  const [canJoin, setCanJoin] = useState(false);
  const [joiningGame, setJoiningGame] = useState(false);
  const [hasLoadedGame, setHasLoadedGame] = useState(false);
  const [hasCheckedPlayer, setHasCheckedPlayer] = useState(false);

  // Reset hasLoadedGame when gameId changes
  useEffect(() => {
    setHasLoadedGame(false);
    setGameData(null);
    setIsPlayer(false);
    setCanJoin(false);
  }, [gameId]);

  // Check if user is a player in the game
  useEffect(() => {
    const checkGameStatus = async () => {
      // Prevent multiple simultaneous loads
      if (hasLoadedGame) {
        return;
      }

      if (!program || !gameId || !publicKey || !fairCoinFlipperResult) {
        if (!fairCoinFlipperResult) {
          console.log('⏳ Waiting for fairCoinFlipperResult...');
        }
        setLoading(false);
        return;
      }

      try {
        const numericGameId = parseInt(gameId);
        if (isNaN(numericGameId)) {
          console.error('Invalid game ID');
          setLoading(false);
          return;
        }

        console.log('🔍 Fetching game data for ID:', numericGameId);
        // Try to fetch game data
        const gameAccount = await fairCoinFlipperResult.fetchGameData(numericGameId);

        if (!gameAccount) {
          console.log('❌ Game not found on blockchain');
          setLoading(false);
          return;
        }

        console.log('📦 Game data received:', gameAccount);
        setGameData(gameAccount);
        setHasLoadedGame(true); // Mark as loaded to prevent re-fetching

        // Check if the current user is a player
        const playerA = gameAccount.playerA;
        const playerB = gameAccount.playerB;

        // Convert to PublicKey objects safely
        let isPlayerA = false;
        let isPlayerB = false;

        try {
          if (playerA) {
            const playerAPubkey = typeof playerA === 'string' ? new PublicKey(playerA) : playerA;
            isPlayerA = publicKey.equals(playerAPubkey);
          }

          if (playerB && playerB !== null) {
            const playerBPubkey = typeof playerB === 'string' ? new PublicKey(playerB) : playerB;
            // Check if playerB is not the default/empty public key
            const defaultPubkey = new PublicKey('11111111111111111111111111111111');
            if (!playerBPubkey.equals(defaultPubkey)) {
              isPlayerB = publicKey.equals(playerBPubkey);
            }
          }
        } catch (e) {
          console.error('Error comparing public keys:', e);
        }

        setIsPlayer(isPlayerA || isPlayerB);

        // Check if the game can be joined
        const status = gameAccount.status;
        const statusKey = typeof status === 'object' ? Object.keys(status)[0] : status;
        const canJoinGame = statusKey &&
          (statusKey === 'waitingForPlayer' ||
           statusKey === 'WaitingForPlayer' ||
           statusKey === 'waiting_for_player' ||
           statusKey === 'waiting');
        setCanJoin(canJoinGame && !isPlayerA && !isPlayerB);

        // Debug logging
        console.log('🎮 Game Status Check:', {
          gameId: numericGameId,
          currentUser: publicKey.toString(),
          playerA: playerA?.toString?.() || playerA,
          playerB: playerB?.toString?.() || playerB,
          isPlayerA,
          isPlayerB,
          isPlayer: isPlayerA || isPlayerB,
          canJoin: canJoinGame && !isPlayerA && !isPlayerB,
          status: status,
          statusKey: statusKey
        });

        // Don't rejoin here, let the GameInterface handle it
        if (isPlayerA || isPlayerB) {
          console.log('✅ User is a player in this game');
        } else if (canJoinGame) {
          console.log('🆕 Game is joinable by new player');
        } else {
          console.log('🔒 Game not available for this user');
        }

        // Mark that we've checked player status
        setHasCheckedPlayer(true);
      } catch (error) {
        console.error('Error checking game status:', error);
        setHasCheckedPlayer(true); // Even on error, mark as checked
      } finally {
        setLoading(false);
      }
    };

    checkGameStatus();
    // Only run when the core dependencies change, not on every render
  }, [program, gameId, publicKey?.toString(), hasLoadedGame]);

  const handleJoinGame = async () => {
    if (!fairCoinFlipperResult || !gameId) return;

    setJoiningGame(true);
    try {
      const numericGameId = parseInt(gameId);
      const success = await fairCoinFlipperResult.joinExistingGame(numericGameId);

      if (success) {
        setIsPlayer(true);
        setCanJoin(false);
        // Reload the page to show the game interface
        window.location.reload();
      }
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setJoiningGame(false);
    }
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto p-8 glass-card text-center">
          <h2 className="text-2xl font-bold mb-6">
            Connect Your Wallet to Join Game
          </h2>
          <p className="text-base-content/70 mb-6">
            You've been invited to join game #{gameId}. Connect your wallet to participate!
          </p>
          <div className="flex justify-center">
            <WalletMultiButton className="!btn !btn-primary !btn-lg" />
          </div>
          <div className="mt-4">
            <button onClick={handleBackToLobby} className="link link-primary text-sm">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking game data or player status
  if (loading || !hasCheckedPlayer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h3 className="text-xl font-semibold">Loading Game #{gameId}...</h3>
          <p className="text-base-content/70 mt-2">Fetching game data from blockchain...</p>
        </div>
      </div>
    );
  }

  if (!fairCoinFlipperResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h3 className="text-xl font-semibold">Initializing Game System...</h3>
          <p className="text-base-content/70 mt-2">Please wait while we connect to the blockchain</p>
        </div>
      </div>
    );
  }

  // Show Join Game interface for non-players
  if (canJoin && !isPlayer) {
    return (
      <div>
        <div className="mb-6">
          <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Lobby
          </button>
          <h1 className="text-3xl font-bold">
            Game Room #{gameId}
          </h1>
        </div>

        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="max-w-md mx-auto p-8 glass-card text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-2xl font-bold mb-4">
              You've Been Invited to Join!
            </h2>

            {gameData && (
              <div className="bg-base-200 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Game ID:</span>
                    <span className="font-mono">#{gameId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Bet Amount:</span>
                    <span className="font-semibold">
                      {gameData.betAmount ? gameData.betAmount.toFixed(3) : '0'} SOL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Potential Winnings:</span>
                    <span className="font-semibold text-success">
                      {gameData.betAmount ? (gameData.betAmount * 2 * 0.93).toFixed(3) : '0'} SOL
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-base-content/70 mb-6">
              Join this coin flip game to compete for the pot!
            </p>

            <button
              onClick={handleJoinGame}
              disabled={joiningGame}
              className="btn btn-primary btn-lg gap-2"
            >
              {joiningGame ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Joining Game...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Join Game
                </>
              )}
            </button>

            <div className="mt-6 text-sm text-base-content/60">
              <p>By joining, you agree to match the bet amount.</p>
              <p className="mt-2">House takes a 7% fee from the winner.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "not a player" message if user can't join
  if (!isPlayer && !canJoin) {
    // Double-check if this is actually the creator but comparison failed
    const isLikelyCreator = gameData &&
                           gameData.playerA &&
                           publicKey &&
                           gameData.playerA.toLowerCase() === publicKey.toString().toLowerCase();

    if (isLikelyCreator) {
      // Fallback: If we think this is the creator but comparison failed, show the game
      console.warn('⚠️ Player comparison might have failed, showing game anyway');
      return (
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Lobby
                </button>
                <h1 className="text-3xl font-bold">
                  Game Room #{gameId}
                </h1>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <GameInterface gameId={gameId} />
          </div>
        </div>
      );
    }

    // Check if game is in progress (spectatable)
    const status = gameData?.status;
    const statusKey = typeof status === 'object' ? Object.keys(status)[0] : status;
    const isGameInProgress = statusKey && (
      statusKey === 'playersReady' ||
      statusKey === 'PlayersReady' ||
      statusKey === 'commitmentsReady' ||
      statusKey === 'CommitmentsReady' ||
      statusKey === 'revealingPhase' ||
      statusKey === 'RevealingPhase' ||
      statusKey === 'active'
    );

    const isGameCompleted = statusKey && (
      statusKey === 'resolved' ||
      statusKey === 'Resolved' ||
      statusKey === 'completed'
    );

    // If game is in progress, allow spectating
    if (isGameInProgress || isGameCompleted) {
      return (
        <div>
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Lobby
                </button>
                <h1 className="text-3xl font-bold">
                  Game Room #{gameId}
                </h1>
              </div>
            </div>
          </div>

          {/* Spectator Mode Banner */}
          <div className="alert alert-info mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <h3 className="font-bold">Spectator Mode</h3>
                <div className="text-sm">You are watching this game. You cannot interact or place bets.</div>
              </div>
            </div>
          </div>

          {/* Game Interface Component in Spectator Mode */}
          <div className="max-w-6xl mx-auto">
            <GameInterface gameId={gameId} isSpectator={true} />
          </div>
        </div>
      );
    }

    // Game is not joinable and not in progress - show "not available"
    return (
      <div>
        <div className="mb-6">
          <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Lobby
          </button>
          <h1 className="text-3xl font-bold">
            Game Room #{gameId}
          </h1>
        </div>

        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="max-w-md mx-auto p-8 glass-card text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-bold mb-4">
              Game Not Available
            </h2>
            <p className="text-base-content/70 mb-6">
              This game is waiting for players or has been cancelled.
              You cannot join or spectate at this time.
            </p>
            <button onClick={handleBackToLobby} className="btn btn-primary">
              <Coins className="w-4 h-4 mr-2" />
              Browse Available Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show game interface for players
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Lobby
            </button>
            <h1 className="text-3xl font-bold">
              Game Room #{gameId}
            </h1>
          </div>
        </div>
      </div>

      {/* Game Interface Component */}
      <div className="max-w-6xl mx-auto">
        <GameInterface gameId={gameId} isGameRoom={true} />
      </div>
    </div>
  );
};