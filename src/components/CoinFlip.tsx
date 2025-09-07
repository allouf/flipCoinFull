import React, { useState } from 'react';

interface CoinFlipProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onFlip: (choice: 'heads' | 'tails') => void;
  onReset?: () => void;
  disabled?: boolean;
}

export const CoinFlip: React.FC<CoinFlipProps> = ({
  isFlipping,
  result,
  onFlip,
  onReset,
  disabled = false,
}) => {
  const [userChoice, setUserChoice] = useState<'heads' | 'tails' | null>(null);

  const handleChoiceSelect = (choice: 'heads' | 'tails') => {
    if (disabled || isFlipping) return;
    setUserChoice(choice);
  };

  const handleFlip = () => {
    if (!userChoice || disabled || isFlipping) return;
    onFlip(userChoice);
  };

  const getCoinDisplay = () => {
    if (isFlipping) return '?';
    if (result === 'heads') return 'H';
    if (result === 'tails') return 'T';
    return '?';
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Coin Display */}
      <div className="relative">
        <div
          className={`coin gradient-bg flex items-center justify-center text-white font-bold text-4xl
            ${isFlipping ? 'flipping' : ''}
            ${result ? 'animate-bounce-in' : ''}
          `}
        >
          {getCoinDisplay()}
        </div>
        {isFlipping && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="loading loading-dots loading-sm" />
          </div>
        )}
      </div>

      {/* Choice Selection */}
      {!result && !isFlipping && (
        <div className="flex space-x-4">
          <button
            type="button"
            className={`btn ${userChoice === 'heads' ? 'btn-primary' : 'btn-outline btn-primary'}`}
            onClick={() => handleChoiceSelect('heads')}
            disabled={disabled}
          >
            Heads
          </button>
          <button
            type="button"
            className={`btn ${userChoice === 'tails' ? 'btn-primary' : 'btn-outline btn-primary'}`}
            onClick={() => handleChoiceSelect('tails')}
            disabled={disabled}
          >
            Tails
          </button>
        </div>
      )}

      {/* Flip Button */}
      {!result && !isFlipping && userChoice && (
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={handleFlip}
          disabled={disabled}
        >
          Flip Coin!
        </button>
      )}

      {/* Result Display */}
      {result && (
        <div className="text-center">
          <div className={`text-2xl font-bold mb-2 ${
            result === userChoice ? 'text-success' : 'text-error'
          }`}
          >
            {result === userChoice ? 'You Won!' : 'You Lost!'}
          </div>
          <div className="text-lg">
            Result:
            {' '}
            <span className="font-bold capitalize">{result}</span>
          </div>
          <div className="text-sm text-base-content/70 mb-4">
            Your choice:
            {' '}
            <span className="font-bold capitalize">{userChoice}</span>
          </div>
          {onReset && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setUserChoice(null);
                onReset();
              }}
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
};
