import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './providers/WalletProvider';
import { WalletConnectButton } from './components/WalletConnectButton';
import { NetworkSelector } from './components/NetworkSelector';
import { CoinFlip } from './components/CoinFlip';
import { BlockchainGame } from './components/BlockchainGame';
import { logProgramIdValidation } from './utils/programIdValidator';
import './styles/wallet-adapter-overrides.css';

const HomePage = () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      {/* Header */}
      <header className="navbar bg-base-300/50 backdrop-blur-sm border-b border-base-300/20">
        <div className="navbar-start">
          <h1 className="text-2xl font-bold gradient-bg bg-clip-text text-transparent">
            Solana Coin Flipper
          </h1>
        </div>
        <div className="navbar-end gap-4">
          <NetworkSelector />
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">
            Flip, Bet, Win
          </h2>
          <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
            The ultimate 1v1 coin flipping game on Solana blockchain.
            Create rooms, place bets, and let the blockchain decide your fate.
          </p>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">0</div>
            <div className="text-sm text-base-content/70">Total Games</div>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-3xl font-bold text-secondary mb-2">0 SOL</div>
            <div className="text-sm text-base-content/70">Total Volume</div>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">0</div>
            <div className="text-sm text-base-content/70">Active Rooms</div>
          </div>
        </div>

        {/* Blockchain Game */}
        <div className="mb-12">
          <BlockchainGame />
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

        {/* Action Buttons - Legacy (Hidden when wallet connected) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-50">
          <p className="text-sm text-center text-base-content/60 mb-4">
            Use the &ldquo;On-Chain Coin Flip&rdquo; section above for real blockchain gameplay
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-300/30 text-base-content/60">
        <div>
          <p>Built on Solana blockchain • House fee: 3% • Fair & Transparent</p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Validate Program ID configuration on app startup
    logProgramIdValidation();
  }, []);

  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Additional routes to be added */}
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
};

export default App;
