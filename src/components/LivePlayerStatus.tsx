import React, { useState, useEffect } from 'react';
import { formatAddress } from '../utils/address';

interface LivePlayerStatusProps {
  playerId: string;
  hasSelected?: boolean;
  isOnline?: boolean;
  lastSeen?: number;
  showAvatar?: boolean;
  className?: string;
}

/**
 * LivePlayerStatus - Shows real-time opponent status in game rooms
 *
 * Features:
 * - Online/offline status indicator
 * - Selection status (without revealing choice)
 * - Last seen timestamp
 * - Animated status changes
 * - Player avatar/identicon
 */
export const LivePlayerStatus: React.FC<LivePlayerStatusProps> = ({
  playerId,
  hasSelected = false,
  isOnline = false,
  lastSeen,
  showAvatar = true,
  className = '',
}) => {
  const [statusChanged, setStatusChanged] = useState(false);
  const [previousStatus, setPreviousStatus] = useState({ hasSelected, isOnline });

  // Animate status changes
  useEffect(() => {
    if (hasSelected !== previousStatus.hasSelected || isOnline !== previousStatus.isOnline) {
      setStatusChanged(true);
      setTimeout(() => setStatusChanged(false), 2000);
    }
    setPreviousStatus({ hasSelected, isOnline });
  }, [hasSelected, isOnline, previousStatus]);

  /**
   * Generate a simple identicon based on player ID
   */
  const generateAvatar = (id: string): string => {
    // Simple hash to generate consistent colors
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }

    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  /**
   * Format last seen time
   */
  const formatLastSeen = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown';

    const diff = Date.now() - timestamp;
    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (): string => {
    if (isOnline) return 'text-green-600';
    return 'text-gray-400';
  };

  /**
   * Get selection status
   */
  const getSelectionStatus = (): { text: string; color: string; icon: JSX.Element } => {
    if (hasSelected) {
      return {
        text: 'Ready',
        color: 'text-green-600',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
      };
    }
    return {
      text: 'Thinking...',
      color: 'text-yellow-600',
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ),
    };
  };

  const selectionStatus = getSelectionStatus();

  return (
    <div className={`live-player-status ${className}`}>
      <div className={`
        flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300
        ${statusChanged
        ? 'border-blue-400 bg-blue-50 shadow-md'
        : 'border-gray-200 bg-white'
        }
      `}
      >
        {/* Avatar */}
        {showAvatar && (
          <div className="relative">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
              ${generateAvatar(playerId)}
            `}
            >
              {playerId.slice(0, 2).toUpperCase()}
            </div>

            {/* Online Status Dot */}
            <div className={`
              absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
              ${isOnline
              ? 'bg-green-500'
              : 'bg-gray-400'
              }
              ${isOnline ? 'animate-pulse' : ''}
            `}
            />
          </div>
        )}

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {formatAddress(playerId)}
            </h4>

            {/* Online Status */}
            <span className={`text-xs ${getStatusColor()}`}>
              {isOnline ? '● Online' : '○ Offline'}
            </span>
          </div>

          {/* Selection Status */}
          <div className="flex items-center space-x-1 mt-1">
            <div className={selectionStatus.color}>
              {selectionStatus.icon}
            </div>
            <span className={`text-xs ${selectionStatus.color}`}>
              {selectionStatus.text}
            </span>
          </div>

          {/* Last Seen */}
          {!isOnline && lastSeen && (
            <div className="text-xs text-gray-500 mt-1">
              Last seen:
              {' '}
              {formatLastSeen(lastSeen)}
            </div>
          )}
        </div>

        {/* Status Animation */}
        {statusChanged && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 12a1 1 0 001 1h4.586l-2.293 2.293a1 1 0 001.414 1.414l4-4a1 1 0 000-1.414l-4-4a1 1 0 10-1.414 1.414L9.586 11H5a1 1 0 00-1 1z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Additional Status Messages */}
      {hasSelected && !isOnline && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          ⚠️ Player selected but appears offline
        </div>
      )}
    </div>
  );
};
