import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCoinFlipper } from '../hooks/useCoinFlipper';

const getJoinButtonTitle = (connected: boolean, roomId: string): string => {
  if (!connected) return 'Please connect your wallet first';
  if (!roomId) return 'Please enter a room ID';
  return '';
};

export const BlockchainGame: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const {
    gameState,
    loading,
    error,
    createRoom,
    joinRoom,
    makeSelection,
    resetGame,
  } = useCoinFlipper();

  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [roomIdToJoin, setRoomIdToJoin] = useState<string>('');

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
    await makeSelection(selection);
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
            {gameState.gameStatus}
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
          {/* Create Room Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Create New Room</h3>
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
                disabled={loading || !connected}
                className={`btn btn-primary ${!connected ? 'btn-disabled' : ''}`}
                title={!connected ? 'Please connect your wallet first' : ''}
              >
                {loading ? (
                  <span className="loading loading-spinner" />
                ) : (
                  'Create Room'
                )}
              </button>
            </div>
          </div>

          {/* Join Room Section */}
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
            <span className="font-mono font-bold">{gameState.roomId}</span>
          </p>
        </div>
      )}

      {/* Selection Phase */}
      {gameState.gameStatus === 'selecting' && !gameState.playerSelection && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Make Your Selection</h3>
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={() => handleSelection('heads')}
              disabled={loading}
              className="btn btn-lg btn-outline btn-primary"
            >
              <span className="text-2xl mr-2">👑</span>
              Heads
            </button>
            <button
              type="button"
              onClick={() => handleSelection('tails')}
              disabled={loading}
              className="btn btn-lg btn-outline btn-secondary"
            >
              <span className="text-2xl mr-2">🪙</span>
              Tails
            </button>
          </div>
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
