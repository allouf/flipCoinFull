import React, { useState } from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useCrossTabSync } from '../hooks/useCrossTabSync';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * ConnectionStatus - Displays WebSocket connection status and health
 *
 * Features:
 * - Real-time connection status indicator
 * - Reconnection attempts display
 * - Cross-tab synchronization status
 * - Detailed connection info (expandable)
 * - Manual reconnection trigger
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(showDetails);
  const {
    connected,
    reconnecting,
    reconnectAttempts,
    lastConnected,
    reconnect,
    connectionError,
  } = useConnectionStatus();

  const {
    isLeaderTab,
    tabCount,
    connectionShared,
  } = useCrossTabSync();

  /**
   * Get status color based on connection state
   */
  const getStatusColor = (): string => {
    if (connected) return 'text-green-600';
    if (reconnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get status icon based on connection state
   */
  const getStatusIcon = (): JSX.Element => {
    if (connected) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }

    if (reconnecting) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  /**
   * Get status text
   */
  const getStatusText = (): string => {
    if (connected) {
      return isLeaderTab ? 'Connected (Leader)' : `Connected (${connectionShared ? 'Shared' : 'Direct'})`;
    }
    if (reconnecting) {
      return `Reconnecting... (${reconnectAttempts}/10)`;
    }
    return 'Disconnected';
  };

  /**
   * Format last connected time
   */
  const formatLastConnected = (): string => {
    if (!lastConnected) return 'Never';

    const diff = Date.now() - lastConnected;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  /**
   * Handle manual reconnection
   */
  const handleReconnect = async (): Promise<void> => {
    try {
      await reconnect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
    }
  };

  return (
    <div className={`connection-status ${className}`}>
      {/* Status Indicator */}
      <div
        className="flex items-center space-x-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        title={getStatusText()}
      >
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          {!showDetails && (
            <span className="text-sm font-medium">
              {connected ? '●' : reconnecting ? '◐' : '○'}
            </span>
          )}
        </div>

        {showDetails && (
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        )}

        {/* Expand/Collapse Icon */}
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64 z-50">
          <div className="space-y-3 text-sm">
            {/* Connection Status */}
            <div>
              <div className="font-medium text-gray-900 mb-2">Connection Status</div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${getStatusColor()}`}>
                  {connected ? 'Connected' : reconnecting ? 'Reconnecting' : 'Disconnected'}
                </span>
              </div>

              {reconnecting && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-600">Attempts:</span>
                  <span className="text-yellow-600">
                    {reconnectAttempts}
                    /10
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-600">Last connected:</span>
                <span className="text-gray-900">{formatLastConnected()}</span>
              </div>
            </div>

            {/* Multi-tab Status */}
            <div className="border-t border-gray-200 pt-3">
              <div className="font-medium text-gray-900 mb-2">Multi-tab Status</div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role:</span>
                <span className={`font-medium ${isLeaderTab ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isLeaderTab ? 'Leader' : 'Follower'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-600">Open tabs:</span>
                <span className="text-gray-900">{tabCount}</span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-600">Connection:</span>
                <span className="text-gray-900">{connectionShared ? 'Shared' : 'Direct'}</span>
              </div>
            </div>

            {/* Error Information */}
            {connectionError && (
              <div className="border-t border-gray-200 pt-3">
                <div className="font-medium text-gray-900 mb-2">Error</div>
                <div className="text-red-600 text-xs break-all">
                  {connectionError.message}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 pt-3 flex space-x-2">
              {!connected && !reconnecting && (
                <button
                  onClick={handleReconnect}
                  className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Reconnect
                </button>
              )}

              <button
                onClick={() => setExpanded(false)}
                className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
