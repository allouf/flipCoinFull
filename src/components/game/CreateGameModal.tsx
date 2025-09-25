import React, { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { BET_PRESETS, MIN_BET_SOL, MAX_BET_SOL } from '../../config/constants';

interface CreateGameModalProps {
  onClose: () => void;
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({ onClose }) => {
  const [betAmount, setBetAmount] = useState(BET_PRESETS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePresetClick = (amount: number) => {
    setBetAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= MIN_BET_SOL && numValue <= MAX_BET_SOL) {
      setBetAmount(numValue);
    }
  };

  const handleCreateGame = async () => {
    if (betAmount < MIN_BET_SOL || betAmount > MAX_BET_SOL) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement game creation
      console.log('Creating game with bet amount:', betAmount);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      onClose();
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Create New Game</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bet Amount Selection */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Select Bet Amount</span>
              <span className="label-text-alt text-xs">
                {MIN_BET_SOL} - {MAX_BET_SOL} SOL
              </span>
            </label>

            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {BET_PRESETS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={`btn btn-sm ${
                    betAmount === amount && !customAmount
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                  disabled={loading}
                >
                  {amount} SOL
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Custom Amount</span>
              </label>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="input input-bordered flex-1"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min={MIN_BET_SOL}
                  max={MAX_BET_SOL}
                  step={0.001}
                  disabled={loading}
                />
                <span className="bg-base-200 px-3 flex items-center text-sm font-medium">
                  SOL
                </span>
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="bg-base-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Your bet:</span>
              <span className="font-mono font-medium">{betAmount.toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Total pot:</span>
              <span className="font-mono font-medium">{(betAmount * 2).toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">House fee (7%):</span>
              <span className="font-mono font-medium">{(betAmount * 2 * 0.07).toFixed(3)} SOL</span>
            </div>
            <div className="border-t border-base-300 pt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Winner receives:</span>
                <span className="font-mono text-success">
                  {(betAmount * 2 * 0.93).toFixed(3)} SOL
                </span>
              </div>
            </div>
          </div>

          {/* Validation */}
          {(betAmount < MIN_BET_SOL || betAmount > MAX_BET_SOL) && (
            <div className="alert alert-warning">
              <div className="text-sm">
                Bet amount must be between {MIN_BET_SOL} and {MAX_BET_SOL} SOL
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-base-300">
          <button
            onClick={onClose}
            className="btn btn-outline flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGame}
            className={`btn btn-primary flex-1 gap-2 ${
              loading ? 'loading' : ''
            }`}
            disabled={loading || betAmount < MIN_BET_SOL || betAmount > MAX_BET_SOL}
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
};