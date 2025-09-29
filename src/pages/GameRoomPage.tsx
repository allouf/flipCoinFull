import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { GameRoom } from '../components/GameRoom';
import { useCoinFlipper } from '../hooks/useCoinFlipper';

/**
 * GameRoomPage - Individual game room using the NEW fair coin flipper system
 *
 * This page handles direct game room access via URL (/game/:gameId)
 * Uses the NEW useFairCoinFlipper hook and GameInterface component
 */
export const GameRoomPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { connected } = useWallet();
  const coinFlipperResult = useCoinFlipper();

  // Auto-rejoin the game when URL has gameId and wallet connects
  useEffect(() => {
    if (connected && gameId && coinFlipperResult) {
      const numericGameId = parseInt(gameId, 10);
      if (!isNaN(numericGameId) && coinFlipperResult.gameState.roomId !== numericGameId) {
        console.log('🎯 Auto-rejoining game from URL:', numericGameId);
        coinFlipperResult.rejoinRoom(numericGameId);
      }
    }
  }, [connected, gameId, coinFlipperResult]);

  // Handle game completion - navigate back to lobby
  useEffect(() => {
    if (coinFlipperResult?.gameState.gameStatus === 'completed') {
      // Show results for a few seconds, then navigate back
      const timer = setTimeout(() => {
        navigate('/lobby');
      }, 10000); // 10 seconds to view results

      return () => clearTimeout(timer);
    }
  }, [coinFlipperResult?.gameState.gameStatus, navigate]);

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto p-8 glass-card text-center">
          <h2 className="text-2xl font-bold mb-6">
            Connect Your Wallet
          </h2>
          <p className="text-base-content/70 mb-6">
            You need to connect your wallet to join game #{gameId}
          </p>
          <div className="flex justify-center">
            <WalletMultiButton className="!btn !btn-primary !btn-lg" />
          </div>
          <div className="mt-4">
            <button onClick={handleBackToLobby} className="link link-primary text-sm">
              ← Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!coinFlipperResult) {
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

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={handleBackToLobby} className="btn btn-ghost btn-sm mb-2">
              ← Back to Lobby
            </button>
            <h1 className="text-3xl font-bold">
              Game Room {gameId ? `#${gameId}` : ''}
            </h1>
          </div>
        </div>
      </div>


      {/* Game Room Component */}
      <div className="max-w-6xl mx-auto">
        <GameRoom gameId={parseInt(gameId || '0', 10)} />
      </div>
    </div>
  );
};