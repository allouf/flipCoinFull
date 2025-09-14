import React from 'react';

const AboutGame: React.FC = () => (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4 flex items-center">
          <span className="text-primary">ℹ️</span>
          About Solana Coin Flipper
        </h2>

        <div className="space-y-6">
          {/* How to Play */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent">🎮 How to Play</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-sm mt-1">1</span>
                <span>
                  Connect your Solana wallet and ensure you have enough SOL for the bet +
                  transaction fees
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-sm mt-1">2</span>
                <span>Create a new room with your desired bet amount or join an existing room</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-sm mt-1">3</span>
                <span>
                  Both players choose either &quot;Heads&quot; or &quot;Tails&quot; within the
                  time limit (2 minutes)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-sm mt-1">4</span>
                <span>The smart contract flips a virtual coin and determines the winner</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-sm mt-1">5</span>
                <span>Winner takes the entire pot minus a small house fee (3%)</span>
              </div>
            </div>
          </div>

          {/* Game Rules */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent">📋 Game Rules</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                <span>
                  <strong>Minimum Bet:</strong>
                  {' '}
                  0.01 SOL per game
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                <span>
                  <strong>Selection Time:</strong>
                  {' '}
                  2 minutes to make your choice after both players join
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                <span>
                  <strong>House Fee:</strong>
                  {' '}
                  3% of the total pot goes to house
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                <span>
                  <strong>Fairness:</strong>
                  {' '}
                  Coin flip result is generated on-chain using blockchain data
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-warning rounded-full" />
                <span>
                  <strong>Timeout:</strong>
                  {' '}
                  If time runs out, all players get refunded (minus gas fees)
                </span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent">⚠️ Important Notes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <span>All bets are placed on Solana Devnet for testing purposes</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <span>
                  Make sure you have sufficient SOL for both the bet amount and
                  transaction fees
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <span>Once you make a selection, it cannot be changed</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <span>
                  If your opponent doesn&apos;t join or make a selection in time,
                  you&apos;ll get your bet refunded
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-info">•</span>
                <span>Game rooms expire after 5 minutes if no second player joins</span>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent">🔧 Technical Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="badge badge-outline badge-xs">Blockchain</span>
                <span>Solana Devnet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-outline badge-xs">Smart Contract</span>
                <span>Anchor Framework (Rust)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-outline badge-xs">Randomness</span>
                <span>On-chain pseudo-random generation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-outline badge-xs">Frontend</span>
                <span>React + TypeScript + Tailwind CSS</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-base-300 pt-4">
            <p className="text-xs text-base-content/70 text-center">
              Built with ❤️ for the Solana ecosystem •
              {' '}
              <span className="ml-1">Questions? Check the console for debug info</span>
            </p>
          </div>
        </div>
      </div>
    </div>
);

export default AboutGame;
