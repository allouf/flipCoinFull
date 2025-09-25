import React, { useState, useEffect } from 'react';
import { CoinSide } from '../types/game';

interface CoinSelectionProps {
  onChoiceSelect: (choice: CoinSide) => void;
  disabled?: boolean;
  selectedChoice?: CoinSide;
  className?: string;
}

interface CoinButtonProps {
  side: CoinSide;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

const CoinButton: React.FC<CoinButtonProps> = ({ side, selected, disabled, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (selected) {
      setAnimationClass('coin-selected-pulse');
      const timer = setTimeout(() => setAnimationClass(''), 600);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  const handleClick = () => {
    if (!disabled) {
      setAnimationClass('coin-click-bounce');
      setTimeout(() => {
        setAnimationClass('');
        onClick();
      }, 150);
    }
  };

  return (
    <div className="coin-button-container">
      <button
        className={`coin-button ${
          selected ? 'selected' : ''
        } ${disabled ? 'disabled' : ''} ${animationClass}`}
        onClick={handleClick}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        aria-label={`Choose ${side}`}
        aria-pressed={selected}
      >
        {/* 3D Coin Container */}
        <div className={`coin-3d ${isHovered && !disabled ? 'hovered' : ''}`}>
          {/* Coin Edge (gives 3D depth) */}
          <div className="coin-edge" />
          
          {/* Front Face (Heads/Tails) */}
          <div className={`coin-face front ${side}`}>
            <div className="coin-design">
              {side === 'heads' ? (
                <>
                  <div className="coin-border" />
                  <div className="coin-center">
                    <div className="coin-text">H</div>
                    <div className="coin-subtext">HEADS</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="coin-border" />
                  <div className="coin-center">
                    <div className="coin-text">T</div>
                    <div className="coin-subtext">TAILS</div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Back Face */}
          <div className={`coin-face back ${side}`}>
            <div className="coin-design">
              <div className="coin-border" />
              <div className="coin-center">
                <div className="coin-pattern">⬢</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selection Indicator */}
        {selected && (
          <div className="selection-indicator">
            <div className="check-mark">✓</div>
          </div>
        )}
        
        {/* Glow Effect */}
        <div className={`coin-glow ${selected ? 'active' : ''}`} />
      </button>
      
      {/* Choice Label */}
      <div className={`choice-label ${selected ? 'selected' : ''}`}>
        {side.toUpperCase()}
      </div>
    </div>
  );
};

const CoinSelection: React.FC<CoinSelectionProps> = ({
  onChoiceSelect,
  disabled = false,
  selectedChoice,
  className = ''
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (selectedChoice) {
      setShowConfirmation(true);
      const timer = setTimeout(() => setShowConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedChoice]);

  const handleChoiceSelect = (choice: CoinSide) => {
    onChoiceSelect(choice);
    
    // Add haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className={`coin-selection ${className}`}>
      {/* Header */}
      <div className="selection-header">
        <h2 className="selection-title">
          🪙 Choose Your Prediction
        </h2>
        <p className="selection-subtitle">
          Pick heads or tails for the coin flip
        </p>
      </div>

      {/* Coins Container */}
      <div className="coins-container">
        <CoinButton
          side="heads"
          selected={selectedChoice === 'heads'}
          disabled={disabled}
          onClick={() => handleChoiceSelect('heads')}
        />
        
        <div className="vs-divider">
          <div className="vs-text">VS</div>
          <div className="vs-line" />
        </div>
        
        <CoinButton
          side="tails"
          selected={selectedChoice === 'tails'}
          disabled={disabled}
          onClick={() => handleChoiceSelect('tails')}
        />
      </div>

      {/* Confirmation Message */}
      {selectedChoice && showConfirmation && (
        <div className="choice-confirmation animate-fade-in">
          <div className="confirmation-content">
            <span className="confirmation-icon">🎯</span>
            <span className="confirmation-text">
              You chose <strong>{selectedChoice.toUpperCase()}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedChoice && (
        <div className="selection-instructions">
          <div className="instruction-item">
            <span className="instruction-icon">👆</span>
            <span>Click on a coin to make your prediction</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinSelection;
