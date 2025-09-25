import React, { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Toaster, toast } from 'react-hot-toast';
import { Coins, Trophy, Clock, DollarSign } from 'lucide-react';

import { CoinFlipperProgram } from './utils/program';
import config from './config.json';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const network = WalletAdapterNetwork.Devnet;
const endpoint = config.rpcUrl || clusterApiUrl(network);

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
];

function CoinFlipperApp() {
  const { connected, wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [houseStats, setHouseStats] = useState({ totalGames: 0, totalCommission: 0 });

  // Form states
  const [betAmount, setBetAmount] = useState(0.1);
  const [choice, setChoice] = useState('heads');
  const [gameToJoin, setGameToJoin] = useState('');
  const [joinChoice, setJoinChoice] = useState('heads');

  useEffect(() => {
    if (connected && wallet) {
      const coinFlipperProgram = new CoinFlipperProgram(wallet, connection);
      setProgram(coinFlipperProgram);
      loadPlayerGames();
      setupEventListeners(coinFlipperProgram);
    }
  }, [connected, wallet, connection]);

  const loadPlayerGames = async () => {
    if (!program || !publicKey) return;
    
    const result = await program.getPlayerGames(publicKey.toString());
    if (result.success) {
      setGames(result.games);
    }
  };

  const setupEventListeners = (program) => {
    // Listen for game events
    program.addEventListener('GameCreated', (event) => {
      console.log('Game Created:', event);
      toast.success(`Game created! ID: ${event.gameId}`);
      loadPlayerGames();
    });

    program.addEventListener('PlayerJoined', (event) => {
      console.log('Player Joined:', event);
      toast.success('Player joined the game!');
      loadPlayerGames();
    });

    program.addEventListener('GameResolved', (event) => {
      console.log('Game Resolved:', event);
      const winnerPayout = event.winnerPayout / 1e9; // Convert from lamports
      const houseCommission = event.houseCommission / 1e9;
      const coinResult = Object.keys(event.coinResult)[0];
      
      toast.success(
        `🎉 Game resolved! Winner: ${event.winner.slice(0,8)}...\n` +
        `Coin: ${coinResult} | Payout: ${winnerPayout.toFixed(3)} SOL\n` +
        `House commission: ${houseCommission.toFixed(4)} SOL`,
        { duration: 5000 }
      );
      
      // Update house stats
      setHouseStats(prev => ({
        totalGames: prev.totalGames + 1,
        totalCommission: prev.totalCommission + houseCommission
      }));
      
      loadPlayerGames();
    });
  };

  const createGame = async () => {
    if (!program) {
      toast.error('Connect your wallet first');
      return;
    }

    if (betAmount < 0.01 || betAmount > 100) {
      toast.error('Bet amount must be between 0.01 and 100 SOL');
      return;
    }

    setLoading(true);
    const gameId = Date.now(); // Simple game ID generation

    try {
      const result = await program.createGame(gameId, betAmount, choice);
      
      if (result.success) {
        toast.success(
          `🎮 Game created!\n` +
          `Game ID: ${gameId}\n` +
          `Bet: ${betAmount} SOL\n` +
          `Your choice: ${choice.toUpperCase()}`
        );
      } else {
        toast.error(`Failed to create game: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!program || !gameToJoin) {
      toast.error('Enter a game address to join');
      return;
    }

    setLoading(true);
    try {
      const result = await program.joinGame(gameToJoin, joinChoice);
      
      if (result.success) {
        toast.success(
          `🚀 Game joined and resolved!\n` +
          `Your choice: ${joinChoice.toUpperCase()}\n` +
          `Transaction: ${result.txId.slice(0,8)}...`
        );
        setGameToJoin(''); // Clear the input
      } else {
        toast.error(`Failed to join game: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white space-y-6">
          <Coins size={64} className="mx-auto text-yellow-400" />
          <h1 className="text-4xl font-bold">Solana Coin Flipper</h1>
          <p className="text-xl opacity-80">Connect your wallet to start playing!</p>
          <WalletMultiButton className="!bg-gradient-to-r !from-yellow-400 !to-orange-500 !text-black !font-bold !px-8 !py-3 !rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <Coins size={32} className="text-yellow-400" />
            <h1 className="text-3xl font-bold">Solana Coin Flipper</h1>
          </div>
          <WalletMultiButton className="!bg-gradient-to-r !from-yellow-400 !to-orange-500 !text-black !font-bold" />
        </div>

        {/* House Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <Trophy className="text-yellow-400" size={24} />
              <div>
                <p className="text-sm opacity-80">Total Games</p>
                <p className="text-2xl font-bold">{houseStats.totalGames}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <DollarSign className="text-green-400" size={24} />
              <div>
                <p className="text-sm opacity-80">House Commission</p>
                <p className="text-2xl font-bold">{houseStats.totalCommission.toFixed(4)} SOL</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <Coins className="text-blue-400" size={24} />
              <div>
                <p className="text-sm opacity-80">Program ID</p>
                <p className="text-sm font-mono">{config.programId.slice(0,8)}...{config.programId.slice(-8)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Game */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
              <Coins className="text-yellow-400" size={24} />
              <span>Create New Game</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bet Amount (SOL)</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/20 rounded-lg border border-white/30 text-white placeholder-white/50"
                  placeholder="0.1"
                />
                <p className="text-xs opacity-60 mt-1">Min: 0.01 SOL | Max: 100 SOL</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Choice</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setChoice('heads')}
                    className={`py-2 px-4 rounded-lg border transition-all ${
                      choice === 'heads'
                        ? 'bg-yellow-500 border-yellow-400 text-black'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                    }`}
                  >
                    🪙 HEADS
                  </button>
                  <button
                    onClick={() => setChoice('tails')}
                    className={`py-2 px-4 rounded-lg border transition-all ${
                      choice === 'tails'
                        ? 'bg-yellow-500 border-yellow-400 text-black'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                    }`}
                  >
                    🎯 TAILS
                  </button>
                </div>
              </div>

              <button
                onClick={createGame}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                {loading ? 'Creating Game...' : `Create Game (${betAmount} SOL)`}
              </button>
            </div>
          </div>

          {/* Join Game */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
              <Trophy className="text-green-400" size={24} />
              <span>Join Existing Game</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game Address</label>
                <input
                  type="text"
                  value={gameToJoin}
                  onChange={(e) => setGameToJoin(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 rounded-lg border border-white/30 text-white placeholder-white/50"
                  placeholder="Enter game address..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Choice</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setJoinChoice('heads')}
                    className={`py-2 px-4 rounded-lg border transition-all ${
                      joinChoice === 'heads'
                        ? 'bg-yellow-500 border-yellow-400 text-black'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                    }`}
                  >
                    🪙 HEADS
                  </button>
                  <button
                    onClick={() => setJoinChoice('tails')}
                    className={`py-2 px-4 rounded-lg border transition-all ${
                      joinChoice === 'tails'
                        ? 'bg-yellow-500 border-yellow-400 text-black'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                    }`}
                  >
                    🎯 TAILS
                  </button>
                </div>
              </div>

              <button
                onClick={joinGame}
                disabled={loading || !gameToJoin}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                {loading ? 'Joining Game...' : 'Join & Play Instantly!'}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        {games.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
              <Clock className="text-blue-400" size={24} />
              <span>Your Games</span>
            </h2>
            
            <div className="grid gap-4">
              {games.slice(0, 5).map((game) => (
                <div key={game.address} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm opacity-60">Game #{game.gameId}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          game.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          game.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {game.status.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold">{game.betAmount} SOL</span>
                      </div>
                    </div>
                    <div className="text-xs opacity-60">
                      {game.address.slice(0,8)}...{game.address.slice(-8)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CoinFlipperApp />
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              },
            }}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
