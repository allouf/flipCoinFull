import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { NetworkSelector } from '../components/NetworkSelector';
import EnhancedGameLobby from '../components/EnhancedGameLobby';
import { CoinFlip } from '../components/CoinFlip';
import { useFairCoinFlipper } from '../hooks/useFairCoinFlipper';

// CreateGameForm component
interface CreateGameFormProps {
  onCreateGame: (betAmount: number) => Promise<void>;
}

const CreateGameForm: React.FC<CreateGameFormProps> = ({ onCreateGame }) => {
  const [betAmount, setBetAmount] = useState('0.01');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }
    
    if (amount < 0.01) {
      alert('Minimum bet amount is 0.01 SOL');
      return;
    }
    
    if (amount > 10) {
      alert('Maximum bet amount is 10 SOL');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateGame(amount);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePresetClick = (amount: number) => {
    setBetAmount(amount.toString());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Bet Amount (SOL)</span>
          <span className="label-text-alt text-xs">Min: 0.01 SOL • Max: 10 SOL</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.01"
            max="10"
            step="0.01"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="input input-bordered input-lg flex-1 text-center font-mono"
            placeholder="0.01"
            disabled={isCreating}
          />
          <div className="text-lg font-semibold px-2">SOL</div>
        </div>
      </div>

      {/* Quick preset buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-base-content/60 w-full text-center mb-2">Quick presets:</span>
        {[0.01, 0.1, 0.5, 1.0].map(amount => (
          <button
            key={amount}
            type="button"
            onClick={() => handlePresetClick(amount)}
            className={`btn btn-sm ${
              parseFloat(betAmount) === amount 
                ? 'btn-primary' 
                : 'btn-outline btn-neutral'
            }`}
            disabled={isCreating}
          >
            {amount} SOL
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          type="submit"
          disabled={isCreating}
          className="btn btn-primary btn-lg px-8"
        >
          {isCreating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating Game...
            </>
          ) : (
            <>
              🎮 Create Game ({betAmount} SOL)
            </>
          )}
        </button>
      </div>
      
      <div className="text-center text-sm text-base-content/60">
        <p>🔒 Your bet will be held in escrow until the game is completed</p>
        <p>⚡ House fee: 7% of total pot</p>
      </div>
    </form>
  );
};

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const { gameState, createGame } = useFairCoinFlipper();

  // Demo coin flip state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | null>(null);

  const handleDemoFlip = () => {
    setIsFlipping(true);
    setFlipResult(null);
    // Simulate coin flip
    setTimeout(() => {
      const result = Math.random() > 0.5 ? 'heads' : 'tails';
      setFlipResult(result);
      setIsFlipping(false);
    }, 2000);
  };

  const handleResetFlip = () => {
    setFlipResult(null);
    setIsFlipping(false);
  };

  const handleCreateGame = async (betAmount: number) => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Create game without requiring selection upfront
      const success = await createGame(betAmount);
      if (success && gameState.gameId) {
        console.log('Game created successfully, navigating to game room');
        // Navigate to the newly created game room
        navigate(`/game/${gameState.gameId}`);
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game: ' + (error as Error).message);
    }
  };

  const handleJoinGame = (gamePda: string, gameId: number) => {
    console.log('Joining game:', gameId);
    // Navigate to the game room with gamePda parameter to avoid redundant searches
    navigate(`/game/${gameId}?pda=${gamePda}`);
  };

  const handleRejoinGame = (gamePda: string, gameId: number) => {
    console.log('Rejoining own game:', gameId, 'at', gamePda);
    // Navigate to the game room with gamePda parameter to avoid redundant searches
    navigate(`/game/${gameId}?pda=${gamePda}`);
  };

  return (
    <div>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4 text-white">
            Flip, Bet, Win
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            The ultimate 1v1 coin flipping game on Solana blockchain.
            Browse active games, join any room, or create your own. Let the blockchain decide your fate.
          </p>
        </div>

        {/* Enhanced Game Lobby - Browse Active Games  */}
        <div className="mb-12">
          <EnhancedGameLobby
            onJoinGame={handleJoinGame}
            onRejoinGame={handleRejoinGame}
            onCreateGameClick={() => {
              const createGameSection = document.getElementById('create-game-section');
              if (createGameSection) {
                createGameSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        </div>

        {/* Create New Game Section */}
        <div className="mb-12" id="create-game-section">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Create New Game</h3>
              <div className="badge badge-primary">Custom Bet</div>
            </div>
            
            {!connected ? (
              <div className="text-center py-8">
                <h4 className="text-xl font-semibold mb-4">Connect Your Wallet</h4>
                <p className="text-base-content/70 mb-6">
                  Connect your Solana wallet to create and join games
                </p>
                <WalletConnectButton />
              </div>
            ) : (
              <CreateGameForm onCreateGame={handleCreateGame} />
            )}
          </div>
        </div>

        {/* Coin Animation Demo */}
        <div className="glass-card p-8 text-center mb-8">
          <h3 className="text-2xl font-bold mb-6">Demo Mode (No Blockchain)</h3>
          <CoinFlip
            isFlipping={isFlipping}
            result={flipResult}
            onFlip={handleDemoFlip}
            onReset={handleResetFlip}
          />
        </div>

        {/* Info Section */}
        <div className="text-center">
          <p className="text-sm text-base-content/60 mb-4">
            Built on Solana blockchain • House fee: 7% • Fair & Transparent
          </p>
        </div>
      </main>
    </div>
  );
};
