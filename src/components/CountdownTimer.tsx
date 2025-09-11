import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  /** The deadline timestamp (Date object or timestamp) */
  deadline: Date | number;
  /** Callback when countdown reaches zero */
  onTimeout?: () => void;
  /** Optional class name for styling */
  className?: string;
  /** Whether to show warning colors when time is running low */
  showWarningColors?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadline,
  onTimeout,
  className = '',
  showWarningColors = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const deadlineTime = deadline instanceof Date ? deadline.getTime() : deadline;
      const difference = deadlineTime - now;
      
      if (difference <= 0) {
        setTimeLeft(0);
        if (!isExpired) {
          setIsExpired(true);
          onTimeout?.();
        }
        return 0;
      }
      
      setTimeLeft(difference);
      return difference;
    };

    // Calculate initial time
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline, onTimeout, isExpired]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getColorClass = () => {
    if (!showWarningColors || isExpired) return 'text-base-content';
    
    const totalSeconds = Math.floor(timeLeft / 1000);
    
    if (totalSeconds <= 30) {
      return 'text-error animate-pulse';
    } else if (totalSeconds <= 60) {
      return 'text-warning';
    } else {
      return 'text-success';
    }
  };

  const getBackgroundClass = () => {
    if (!showWarningColors || isExpired) return 'bg-base-200';
    
    const totalSeconds = Math.floor(timeLeft / 1000);
    
    if (totalSeconds <= 30) {
      return 'bg-error/10 border-error/20';
    } else if (totalSeconds <= 60) {
      return 'bg-warning/10 border-warning/20';
    } else {
      return 'bg-success/10 border-success/20';
    }
  };

  if (isExpired) {
    return (
      <div className={`p-3 bg-error/20 border border-error/40 rounded-lg ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-error text-lg">⏰</span>
          <span className="text-error font-semibold">Time's Up!</span>
        </div>
        <div className="text-xs text-error/80 text-center mt-1">
          Selection deadline has passed
        </div>
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const progressPercentage = Math.max(0, Math.min(100, (totalSeconds / 120) * 100)); // Assuming 2 minutes (120s) total

  return (
    <div className={`p-3 border rounded-lg ${getBackgroundClass()} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">⏱️ Time Remaining:</span>
        <span className={`text-lg font-mono font-bold ${getColorClass()}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-base-300 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${
            totalSeconds <= 30 
              ? 'bg-error' 
              : totalSeconds <= 60 
                ? 'bg-warning' 
                : 'bg-success'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* Warning Messages */}
      {totalSeconds <= 30 && (
        <div className="text-xs text-error text-center mt-2 animate-pulse">
          🚨 Hurry up! Less than 30 seconds left!
        </div>
      )}
      {totalSeconds > 30 && totalSeconds <= 60 && (
        <div className="text-xs text-warning text-center mt-2">
          ⚡ Only 1 minute remaining
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;
