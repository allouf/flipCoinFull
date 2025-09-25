import React, { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Toaster } from 'react-hot-toast';

import EnhancedGameLobby from './components/EnhancedGameLobby';
import StatsPage from './pages/StatsPage';
import { AboutPage } from './pages/AboutPage';
import { logProgramIdValidation } from './utils/programIdValidator';
import './styles/EnhancedGameLobby.css';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const network = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network);

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
];

function MainApp() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('game-lobby');

  // Log program ID validation on startup
  useEffect(() => {
    logProgramIdValidation();
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white space-y-6">
          <div className="text-6xl mb-4">🪙</div>
          <h1 className="text-4xl font-bold">Fair Coin Flipper</h1>
          <p className="text-xl opacity-80">Connect your wallet to start playing!</p>
          <WalletMultiButton className="!bg-gradient-to-r !from-yellow-400 !to-orange-500 !text-black !font-bold !px-8 !py-3 !rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-bold text-white">Fair Coin Flipper</span>
            </div>

            {/* Center - Navigation Tabs */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('game-lobby')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === 'game-lobby'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>🎮</span>
                <span className="font-medium">Game Lobby</span>
              </button>

              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === 'statistics'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>📊</span>
                <span className="font-medium">Statistics</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === 'about'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>ℹ️</span>
                <span className="font-medium">About</span>
              </button>
            </div>

            {/* Right side - Wallet Status */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300">
                <span>🟢</span>
                <span className="text-sm font-medium">Connected</span>
              </div>
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !text-white !font-medium !text-sm !px-4 !py-2 !rounded-lg !border-0" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'game-lobby' && (
          <div className="space-y-6">
            <EnhancedGameLobby
              onJoinGame={(gamePda, gameId) => {
                console.log('Join game:', gamePda, gameId);
                // TODO: Implement join game logic
              }}
              onRejoinGame={(gamePda, gameId) => {
                console.log('Rejoin game:', gamePda, gameId);
                // TODO: Implement rejoin game logic
              }}
              onCreateGameClick={() => {
                console.log('Create game clicked');
                // TODO: Implement create game logic
              }}
            />
          </div>
        )}

        {activeTab === 'statistics' && (
          <StatsPage className="fade-in" />
        )}

        {activeTab === 'about' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
            <AboutPage />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MainApp />
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