import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CoinSide } from '../hooks/useFairCoinFlipper';

interface CoinFlipAnimationProps {
  result: CoinSide;
  onAnimationComplete: () => void;
  duration?: number;
  autoStart?: boolean;
  showResult?: boolean;
}

interface AnimationStage {
  phase: 'preparing' | 'flipping' | 'landing' | 'revealing' | 'complete';
  progress: number;
}

const CoinFlipAnimation: React.FC<CoinFlipAnimationProps> = ({
  result,
  onAnimationComplete,
  duration = 3000,
  autoStart = true,
  showResult = true
}) => {
  const coinRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationStage, setAnimationStage] = useState<AnimationStage>({
    phase: 'preparing',
    progress: 0
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound effects using Web Audio API
  const playFlipSound = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return; // Audio not supported
      }
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Create a swoosh sound effect
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  const playLandSound = useCallback(() => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Create a landing thud sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(80, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }, []);

  // Easing functions for realistic motion
  const easeOutBounce = (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      const x = t - 1.5 / d1;
      return n1 * x * x + 0.75;
    } else if (t < 2.5 / d1) {
      const x = t - 2.25 / d1;
      return n1 * x * x + 0.9375;
    } else {
      const x = t - 2.625 / d1;
      return n1 * x * x + 0.984375;
    }
  };

  const easeInQuad = (t: number): number => t * t;
  const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
  const easeInOutCubic = (t: number): number => 
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    // Different phases of animation
    if (progress < 0.1) {
      // Preparing phase (0-10%)
      setAnimationStage({ phase: 'preparing', progress: progress / 0.1 });
    } else if (progress < 0.7) {
      // Flipping phase (10-70%)
      if (animationStage.phase !== 'flipping') {
        playFlipSound();
      }
      setAnimationStage({ phase: 'flipping', progress: (progress - 0.1) / 0.6 });
    } else if (progress < 0.85) {
      // Landing phase (70-85%)
      if (animationStage.phase !== 'landing') {
        playLandSound();
      }
      setAnimationStage({ phase: 'landing', progress: (progress - 0.7) / 0.15 });
    } else if (progress < 0.95) {
      // Revealing phase (85-95%)
      setAnimationStage({ phase: 'revealing', progress: (progress - 0.85) / 0.1 });
    } else {
      // Complete phase (95-100%)
      setAnimationStage({ phase: 'complete', progress: (progress - 0.95) / 0.05 });
      
      if (progress >= 1) {
        setIsPlaying(false);
        onAnimationComplete();
        return;
      }
    }

    // Apply transformations
    if (coinRef.current) {
      const coin = coinRef.current;
      let transform = '';
      let scale = 1;
      let y = 0;
      let rotationX = 0;
      let rotationY = 0;

      switch (animationStage.phase) {
        case 'preparing':
          scale = 1 + easeOutQuad(animationStage.progress) * 0.1;
          y = -easeOutQuad(animationStage.progress) * 20;
          break;

        case 'flipping':
          const flipProgress = animationStage.progress;
          
          // Upward trajectory with gravity
          const height = Math.sin(flipProgress * Math.PI) * 200;
          y = -height;
          
          // Multiple rotations for realistic flip
          rotationX = flipProgress * 720 + (Math.sin(flipProgress * Math.PI * 8) * 15);
          rotationY = flipProgress * 1080 + (Math.sin(flipProgress * Math.PI * 6) * 10);
          
          // Slight scaling during flip
          scale = 1 + Math.sin(flipProgress * Math.PI) * 0.2;
          break;

        case 'landing':
          const landProgress = animationStage.progress;
          y = -easeOutBounce(landProgress) * 30;
          
          // Final rotation to show result
          const targetRotationX = result === 'heads' ? 0 : 180;
          rotationX = targetRotationX + (1 - easeInOutCubic(landProgress)) * 100;
          rotationY = easeInOutCubic(landProgress) * 360;
          
          scale = 1 + (1 - easeInQuad(landProgress)) * 0.3;
          break;

        case 'revealing':
          rotationX = result === 'heads' ? 0 : 180;
          scale = 1 + easeInOutCubic(animationStage.progress) * 0.1;
          break;

        case 'complete':
          rotationX = result === 'heads' ? 0 : 180;
          scale = 1;
          break;
      }

      transform = `translateY(${y}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${scale})`;
      coin.style.transform = transform;
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [duration, result, animationStage.phase, isPlaying, onAnimationComplete, playFlipSound, playLandSound]);

  // Start animation
  const startAnimation = useCallback(() => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setAnimationStage({ phase: 'preparing', progress: 0 });
    startTimeRef.current = null;
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animate, isPlaying]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && !isPlaying) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isPlaying, startAnimation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getStageMessage = (): string => {
    switch (animationStage.phase) {
      case 'preparing':
        return 'Getting ready...';
      case 'flipping':
        return 'Flipping the coin...';
      case 'landing':
        return 'Coming down...';
      case 'revealing':
        return 'And the result is...';
      case 'complete':
        return `It's ${result.toUpperCase()}!`;
      default:
        return '';
    }
  };

  return (
    <div className="coin-flip-animation">
      {/* Animation Container */}
      <div className="animation-container" ref={containerRef}>
        {/* 3D Coin */}
        <div className="coin-3d-flip" ref={coinRef}>
          {/* Coin Faces */}
          <div className="coin-face-flip coin-heads">
            <div className="coin-content">
              <div className="coin-border-ring" />
              <div className="coin-inner">
                <div className="coin-symbol">H</div>
                <div className="coin-text">HEADS</div>
              </div>
            </div>
          </div>
          
          <div className="coin-face-flip coin-tails">
            <div className="coin-content">
              <div className="coin-border-ring" />
              <div className="coin-inner">
                <div className="coin-symbol">T</div>
                <div className="coin-text">TAILS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Particles/Effects */}
        {animationStage.phase === 'flipping' && (
          <div className="flip-particles">
            {Array.from({ length: 8 }, (_, i) => (
              <div 
                key={i} 
                className="particle" 
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 45}deg)` 
                }} 
              />
            ))}
          </div>
        )}

        {/* Ground Shadow */}
        <div 
          className={`coin-shadow ${animationStage.phase === 'landing' ? 'shadow-impact' : ''}`}
          style={{
            opacity: animationStage.phase === 'flipping' || animationStage.phase === 'landing' ? 0.6 : 0.3,
            transform: `scale(${animationStage.phase === 'landing' ? 1.2 : 1})`
          }}
        />
      </div>

      {/* Status Display */}
      <div className="animation-status">
        <div className="status-text">
          {getStageMessage()}
        </div>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar"
            style={{ width: `${(animationStage.progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Result Display */}
      {animationStage.phase === 'complete' && showResult && (
        <div className="result-display animate-result-in">
          <div className="result-card">
            <div className="result-icon">
              {result === 'heads' ? '👑' : '🌟'}
            </div>
            <div className="result-text">
              <div className="result-label">Result:</div>
              <div className={`result-value ${result}`}>
                {result.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Start Button (if not auto-start) */}
      {!autoStart && !isPlaying && (
        <button 
          className="start-flip-btn"
          onClick={startAnimation}
          disabled={isPlaying}
        >
          🪙 Flip the Coin!
        </button>
      )}
    </div>
  );
};

export default CoinFlipAnimation;
