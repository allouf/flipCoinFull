import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { NetworkSelector } from '../components/NetworkSelector';
import { Coins, Shield, Trophy, Clock, AlertCircle, DollarSign, Zap, Lock, ChevronRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-bg bg-clip-text text-transparent">
            About Solana Coin Flipper
          </h1>
          <p className="text-xl text-base-content/70">
            The Premier Blockchain-Based Coin Flipping Game on Solana
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-primary">
              <DollarSign className="w-8 h-8" />
            </div>
            <div className="stat-title">Min Bet</div>
            <div className="stat-value text-primary">0.01 SOL</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-secondary">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="stat-title">Winner Gets</div>
            <div className="stat-value text-secondary">93%</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-accent">
              <Zap className="w-8 h-8" />
            </div>
            <div className="stat-title">House Fee</div>
            <div className="stat-value text-accent">7%</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-figure text-info">
              <Clock className="w-8 h-8" />
            </div>
            <div className="stat-title">Time Limit</div>
            <div className="stat-value text-info">1 Hour</div>
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <Coins className="w-6 h-6" />
              How to Play
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="badge badge-primary badge-lg">1</div>
                <div>
                  <h3 className="font-bold mb-1">Connect Your Wallet</h3>
                  <p className="text-base-content/70">Connect your Solana wallet (Phantom, Solflare, etc.) and ensure you have enough SOL on devnet for betting and transaction fees.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="badge badge-primary badge-lg">2</div>
                <div>
                  <h3 className="font-bold mb-1">Create or Join a Game</h3>
                  <p className="text-base-content/70">Create a new game with your desired bet amount (0.01 - 100 SOL) or join an existing game from the lobby.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="badge badge-primary badge-lg">3</div>
                <div>
                  <h3 className="font-bold mb-1">Make Your Commitment</h3>
                  <p className="text-base-content/70">Both players secretly choose Heads or Tails. Your choice is encrypted and committed to the blockchain.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="badge badge-primary badge-lg">4</div>
                <div>
                  <h3 className="font-bold mb-1">Reveal Your Choice</h3>
                  <p className="text-base-content/70">After both players commit, reveal your choice. The smart contract verifies your commitment matches your reveal.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="badge badge-primary badge-lg">5</div>
                <div>
                  <h3 className="font-bold mb-1">Auto-Resolution</h3>
                  <p className="text-base-content/70">When the second player reveals, the game auto-resolves. The smart contract flips the coin and transfers winnings instantly!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Rules */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <Shield className="w-6 h-6" />
              Game Rules & Mechanics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-3 text-primary">Core Rules</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Minimum bet: 0.01 SOL</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Maximum bet: 100 SOL</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>House fee: 7% of total pot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Winner receives: 93% of total pot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Game timeout: 1 hour (cancellable after)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-primary" />
                    <span>Cancellation fee: 2% per player</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-3 text-secondary">Fair Play Mechanics</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>Commit-Reveal scheme prevents cheating</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>Choices are encrypted until both commit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>Smart contract verifies all commitments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>Tie-breaker: Cryptographic hash determines winner</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>All funds held in escrow until resolution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-secondary" />
                    <span>Transparent & verifiable on blockchain</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Fairness */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <Lock className="w-6 h-6" />
              Security & Fairness
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold mb-2 text-success">🔐 Secure</h3>
                <p className="text-sm text-base-content/70">
                  All game logic runs on Solana blockchain. Funds are secured in program-derived escrow accounts.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-info">🎲 Provably Fair</h3>
                <p className="text-sm text-base-content/70">
                  Cryptographic commit-reveal prevents any manipulation. Results are deterministic and verifiable.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-warning">⚡ Instant Payouts</h3>
                <p className="text-sm text-base-content/70">
                  Winners receive funds automatically when the game resolves. No manual claims needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <Zap className="w-6 h-6" />
              Technical Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-3">Smart Contract</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Program ID:</span>
                    <span className="font-mono text-xs">7CCbhf...hrcf6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Network:</span>
                    <span>Solana Devnet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Language:</span>
                    <span>Rust (Anchor)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Deployment:</span>
                    <span>Solana Playground</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-3">Game Flow</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Create Game:</span>
                    <span>Initialize + Escrow</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Join Game:</span>
                    <span>Match Bet + Lock</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Commitments:</span>
                    <span>SHA-256 Hash</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Resolution:</span>
                    <span>Auto on 2nd Reveal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">
              <AlertCircle className="w-6 h-6" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="collapse collapse-plus bg-base-200">
                <input type="radio" name="faq-accordion" defaultChecked />
                <div className="collapse-title font-medium">
                  What happens if both players choose the same side?
                </div>
                <div className="collapse-content">
                  <p className="text-sm text-base-content/70">
                    If both players choose the same side (both heads or both tails), the smart contract uses a cryptographic tie-breaker.
                    It combines both players' secrets and addresses to generate a deterministic random number that fairly selects a winner.
                  </p>
                </div>
              </div>
              <div className="collapse collapse-plus bg-base-200">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-medium">
                  Can I cancel a game if my opponent doesn't show up?
                </div>
                <div className="collapse-content">
                  <p className="text-sm text-base-content/70">
                    Yes! Games can be cancelled after 1 hour if they're stuck in any phase. You'll receive your bet back minus a 2% cancellation fee.
                    The cancellation fee covers network costs and prevents abuse.
                  </p>
                </div>
              </div>
              <div className="collapse collapse-plus bg-base-200">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-medium">
                  How do I know the game is fair?
                </div>
                <div className="collapse-content">
                  <p className="text-sm text-base-content/70">
                    The game uses a commit-reveal scheme where your choice is encrypted before revealing. The smart contract is open-source and
                    verifiable on Solana blockchain. All randomness is derived from player inputs, making it impossible to manipulate.
                  </p>
                </div>
              </div>
              <div className="collapse collapse-plus bg-base-200">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-medium">
                  What happens to the 7% house fee?
                </div>
                <div className="collapse-content">
                  <p className="text-sm text-base-content/70">
                    The house fee goes to the platform wallet to cover operational costs, development, and maintenance of the game.
                    This ensures the platform remains sustainable and can continue providing a secure gaming experience.
                  </p>
                </div>
              </div>
              <div className="collapse collapse-plus bg-base-200">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-medium">
                  Can I play multiple games at once?
                </div>
                <div className="collapse-content">
                  <p className="text-sm text-base-content/70">
                    Yes! You can create or join multiple games simultaneously. Each game is independent with its own escrow account.
                    Just make sure you have enough SOL in your wallet to cover all your bets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
          <div className="card-body text-center">
            <h2 className="card-title text-2xl mb-4 justify-center">Ready to Play?</h2>
            <p className="mb-6">Test your luck in a provably fair, blockchain-powered coin flip!</p>
            <div className="card-actions justify-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-lg bg-base-100 text-base-content hover:bg-base-200"
              >
                Start Playing
              </button>
              <button
                onClick={() => navigate('/lobby')}
                className="btn btn-lg btn-outline border-base-100 text-base-100 hover:bg-base-100 hover:text-base-content"
              >
                Browse Games
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <p className="text-sm text-base-content/60">
            Program ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
          </p>
          <p className="text-sm text-base-content/60 mt-2">
            Built on Solana • Open Source • Auditable
          </p>
        </div>
      </main>
    </div>
  );
};