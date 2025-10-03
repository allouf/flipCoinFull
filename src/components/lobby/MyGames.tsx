import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Play, Clock, Trophy, X, ExternalLink, User, Coins, Info } from 'lucide-react';
import { useAnchorProgram } from '../../hooks/useAnchorProgram';

interface MyGamesProps {
  myGames?: any[];
  loading?: boolean;
}

export const MyGames: React.FC<MyGamesProps> = ({ myGames, loading }) => {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const { cancelRoom } = useAnchorProgram();
  const [filter, setFilter] = useState<'all' | 'created' | 'joined' | 'waiting'>('all');
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  const handleCancelGame = async (roomId: string) => {
    try {
      await cancelRoom(parseInt(roomId));
      // Note: Parent component will handle data refresh
    } catch (error) {
      console.error('Failed to cancel game:', error);
    }
  };

  const handleContinueGame = async (roomId: string) => {
    try {
      // Navigate directly to the game room - GameRoomPage will handle loading the game state
      navigate(`/game/${roomId}`);
      // Note: Parent component will handle data refresh
    } catch (error) {
      console.error('Failed to continue game:', error);
    }
  };

  const filteredGames = (myGames || []).filter(game => {
    if (filter === 'all') return true;
    if (filter === 'created') return game.role === 'creator';
    if (filter === 'joined') return game.role === 'joiner';
    if (filter === 'waiting') return game.status === 'waiting';
    return true;
  });

  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-base-content/60">
          Connect your wallet to see games you've created or joined.
        </p>
      </div>
    );
  }

  if (filteredGames.length === 0 && (!myGames || myGames.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎲</div>
        <h3 className="text-xl font-semibold mb-2">No Games Yet</h3>
        <p className="text-base-content/60 mb-6">
          You haven't created or joined any games yet. Start playing to see your active games here!
        </p>
        <button className="btn btn-primary">
          Create Your First Game
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`tab ${filter === 'created' ? 'tab-active' : ''}`}
          onClick={() => setFilter('created')}
        >
          Created by me
        </button>
        <button
          className={`tab ${filter === 'joined' ? 'tab-active' : ''}`}
          onClick={() => setFilter('joined')}
        >
          Joined
        </button>
        <button
          className={`tab ${filter === 'waiting' ? 'tab-active' : ''}`}
          onClick={() => setFilter('waiting')}
        >
          Waiting
        </button>
      </div>

      {/* Games List */}
      <div className="space-y-3">
        {filteredGames.map((game) => (
          <div key={game.id} className="card bg-base-100 shadow-lg">
            <div className="card-body p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">Game #{game.id.slice(-8)}</h3>
                    <div className={`badge badge-sm ${
                      game.status === 'waiting' ? 'badge-warning' :
                      game.status === 'active' ? 'badge-success' :
                      game.status === 'completed' ? 'badge-info' : 'badge-error'
                    }`}>
                      {game.status}
                    </div>
                  </div>
                  <div className="text-xs text-base-content/60">
                    {game.role === 'creator' ? 'Created by you' : 'You joined'} • 
                    {new Date(game.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-mono font-medium">{game.betAmount} SOL</div>
                  <div className="text-xs text-base-content/60">
                    {game.status === 'completed' && game.winner === 'you' ? (
                      <span className="text-success">You won!</span>
                    ) : game.status === 'completed' ? (
                      <span className="text-error">You lost</span>
                    ) : (
                      `Pot: ${(game.betAmount * 2).toFixed(3)} SOL`
                    )}
                  </div>
                </div>
              </div>

              {/* Game progress/actions */}
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2">
                  {game.status === 'waiting' && (
                    <>
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="text-sm text-base-content/70">
                        Waiting for opponent
                      </span>
                    </>
                  )}
                  {game.status === 'active' && (
                    <>
                      <Play className="w-4 h-4 text-success" />
                      <span className="text-sm text-base-content/70">
                        {game.phase === 'selection' ? 'Make your choice' : 'Waiting for reveal'}
                      </span>
                    </>
                  )}
                  {game.status === 'completed' && (
                    <>
                      <Trophy className="w-4 h-4 text-info" />
                      <span className="text-sm text-base-content/70">
                        Game completed
                      </span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {game.status === 'waiting' && game.role === 'creator' && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/game/${game.id}`)}
                        title="Enter the game room"
                      >
                        <Play className="w-3 h-3" />
                        Enter Game
                      </button>
                      <button
                        className="btn btn-sm btn-primary btn-outline"
                        onClick={() => {
                          const gameUrl = `${window.location.origin}/game/${game.id}`;
                          navigator.clipboard.writeText(gameUrl);
                          console.log('Game link copied:', gameUrl);
                        }}
                        title="Share this link with a friend to join"
                      >
                        📋 Copy Link
                      </button>
                      <button
                        className="btn btn-sm btn-error btn-outline gap-1"
                        onClick={() => handleCancelGame(game.id)}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </>
                  )}
                  {game.status === 'active' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleContinueGame(game.id)}
                      disabled={loading}
                    >
                      Continue
                    </button>
                  )}
                  {game.status === 'completed' && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedGame(game)}
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Game Details Modal */}
      {selectedGame && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-2xl mb-1">
                  Game Details
                </h3>
                <p className="text-sm text-base-content/60">
                  Game #{selectedGame.id.slice(-8)}
                </p>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setSelectedGame(null)}
              >
                ✕
              </button>
            </div>

            {/* Game Outcome */}
            <div className={`alert mb-6 ${
              selectedGame.winner === 'you' ? 'alert-success' : 'alert-error'
            }`}>
              <Trophy className="w-6 h-6" />
              <div>
                <h4 className="font-bold text-lg">
                  {selectedGame.winner === 'you' ? '🎉 You Won!' : '😞 You Lost'}
                </h4>
                <p className="text-sm">
                  {selectedGame.winner === 'you'
                    ? `You won ${(selectedGame.betAmount * 2 * 0.93).toFixed(4)} SOL`
                    : `You lost ${selectedGame.betAmount.toFixed(4)} SOL`
                  }
                </p>
              </div>
            </div>

            {/* Game Information */}
            <div className="space-y-4">
              {/* Players */}
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Players
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-base-content/60 mb-1">
                        {selectedGame.role === 'creator' ? 'You (Creator)' : 'Opponent (Creator)'}
                      </div>
                      <div className="font-mono text-xs truncate" title={selectedGame.creatorId}>
                        {selectedGame.creatorId ? `${selectedGame.creatorId.slice(0, 4)}...${selectedGame.creatorId.slice(-4)}` : 'Unknown'}
                      </div>
                      <div className="text-sm mt-1">
                        Choice: <span className="font-semibold capitalize">{selectedGame.creatorChoice || 'Not revealed'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/60 mb-1">
                        {selectedGame.role === 'joiner' ? 'You (Joiner)' : 'Opponent (Joiner)'}
                      </div>
                      <div className="font-mono text-xs truncate" title={selectedGame.joinerId}>
                        {selectedGame.joinerId ? `${selectedGame.joinerId.slice(0, 4)}...${selectedGame.joinerId.slice(-4)}` : 'No opponent yet'}
                      </div>
                      <div className="text-sm mt-1">
                        Choice: <span className="font-semibold capitalize">{selectedGame.joinerChoice || 'Not revealed'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Result */}
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Result
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Coin Flip Result:</span>
                      <span className="font-semibold capitalize">{selectedGame.coinResult || 'Not available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Winner:</span>
                      <span className="font-semibold">
                        {selectedGame.winner === 'you' ? 'You' : 'Opponent'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Completed:</span>
                      <span className="font-mono text-sm">
                        {new Date(selectedGame.completedAt || selectedGame.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Financial Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Your Bet:</span>
                      <span className="font-mono">{selectedGame.betAmount.toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Total Pot:</span>
                      <span className="font-mono">{(selectedGame.betAmount * 2).toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/70">House Fee (7%):</span>
                      <span className="font-mono">{(selectedGame.betAmount * 2 * 0.07).toFixed(4)} SOL</span>
                    </div>
                    <div className="divider my-2"></div>
                    <div className="flex justify-between font-semibold">
                      <span>Your Net:</span>
                      <span className={`font-mono ${
                        selectedGame.winner === 'you' ? 'text-success' : 'text-error'
                      }`}>
                        {selectedGame.winner === 'you' ? '+' : '-'}
                        {selectedGame.winner === 'you'
                          ? (selectedGame.betAmount * 2 * 0.93 - selectedGame.betAmount).toFixed(4)
                          : selectedGame.betAmount.toFixed(4)
                        } SOL
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Link */}
              {selectedGame.signature && (
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Transaction
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs truncate flex-1">
                        {selectedGame.signature}
                      </span>
                      <a
                        href={`https://explorer.solana.com/tx/${selectedGame.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-primary"
                      >
                        View on Explorer
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => setSelectedGame(null)}
              >
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setSelectedGame(null)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};