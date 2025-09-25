import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  soundEnabled?: boolean;
  index?: number;
}

export const ToastItem: React.FC<ToastProps> = ({ 
  toast, 
  onDismiss, 
  soundEnabled = true,
  index = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const duration = toast.duration || 5000;
  const progressStep = 100 / (duration / 50); // Update every 50ms

  // Sound effects
  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Check if context is closed
      if (ctx.state === 'closed') {
        console.warn('AudioContext is closed, skipping sound');
        return;
      }

      // Resume context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      // Connect nodes
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Configure based on toast type
      switch (toast.type) {
        case 'success':
          // Pleasant success chime
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
          filterNode.frequency.setValueAtTime(2000, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          break;
        
        case 'error':
          // Alert error sound
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(220, ctx.currentTime);
          oscillator.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
          filterNode.frequency.setValueAtTime(800, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        
        case 'warning':
          // Warning beep
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          filterNode.frequency.setValueAtTime(1200, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          break;
        
        default: // info
          // Soft notification sound
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          filterNode.frequency.setValueAtTime(1500, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [toast.type, soundEnabled]);

  // Auto-dismiss timer
  const startTimer = useCallback(() => {
    if (!duration || duration <= 0) return;
    
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 300); // Wait for exit animation
    }, duration);
    
    // Progress indicator
    progressIntervalRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress(prev => {
          const newProgress = prev - progressStep;
          return newProgress <= 0 ? 0 : newProgress;
        });
      }
    }, 50);
  }, [duration, toast.id, onDismiss, progressStep, isPaused]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      const remainingTime = (progress / 100) * duration;
      
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
      }, remainingTime);
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - progressStep;
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 50);
    }
  }, [isPaused, progress, duration, toast.id, onDismiss, progressStep]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  // Initialize
  useEffect(() => {
    // Play sound and show notification
    playNotificationSound();
    setIsVisible(true);
    startTimer();
    
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      const pattern = toast.type === 'error' ? [100, 50, 100] : [50];
      navigator.vibrate(pattern);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [playNotificationSound, startTimer]);

  const getToastColor = () => {
    switch (toast.type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-error';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div 
      className={`enhanced-toast ${getToastColor()} transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        animationDelay: `${index * 100}ms`
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      {/* Progress Bar */}
      {duration > 0 && (
        <div className="toast-progress">
          <div 
            className="toast-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex items-center p-4">
        <div className="toast-icon text-2xl mr-3">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1">{toast.title}</h4>
          <p className="text-xs opacity-90">{toast.message}</p>
        </div>
        
        <button 
          onClick={handleDismiss}
          className="toast-close ml-3 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      {/* Pause Indicator */}
      {isPaused && (
        <div className="toast-paused">
          ⏸️
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onClear?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxToasts?: number;
  soundEnabled?: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  onDismiss,
  onClear,
  position = 'top-right',
  maxToasts = 5,
  soundEnabled = true
}) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(soundEnabled);
  
  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts);
  
  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);
  
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      default: return 'top-4 right-4';
    }
  };
  
  if (visibleToasts.length === 0) {
    return null;
  }
  
  return (
    <div className={`fixed z-50 max-w-sm ${getPositionClasses()}`}>
      {/* Controls */}
      <div className="toast-controls flex justify-end gap-2 mb-2">
        <button 
          className="toast-control-btn sound-toggle"
          onClick={toggleSound}
          aria-label={`${isSoundEnabled ? 'Disable' : 'Enable'} notification sounds`}
          title={`${isSoundEnabled ? 'Disable' : 'Enable'} sounds`}
        >
          {isSoundEnabled ? '🔊' : '🔇'}
        </button>
        
        {onClear && visibleToasts.length > 1 && (
          <button 
            className="toast-control-btn clear-all"
            onClick={onClear}
            aria-label="Clear all notifications"
            title="Clear all"
          >
            🗑️
          </button>
        )}
      </div>
      
      {/* Toast List */}
      <div className="toast-list space-y-2">
        {visibleToasts.map((toast, index) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss}
            soundEnabled={isSoundEnabled}
            index={index}
          />
        ))}
      </div>
      
      {/* Overflow Indicator */}
      {toasts.length > maxToasts && (
        <div className="toast-overflow text-xs text-center mt-2 opacity-70">
          +{toasts.length - maxToasts} more notifications
        </div>
      )}
    </div>
  );
};
