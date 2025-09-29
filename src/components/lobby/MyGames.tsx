import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Play, Clock, Trophy, X } from 'lucide-react';
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
                    <button className="btn btn-sm btn-outline">
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};