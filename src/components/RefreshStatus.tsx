import React, { useCallback, useEffect, useState } from 'react';

interface RefreshStatusProps {
  isStale: boolean;
  isCircuitOpen: boolean;
  lastUpdated: number;
  onRefresh: () => Promise<void>;
  onForceRefresh: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export const RefreshStatus: React.FC<RefreshStatusProps> = ({
  isStale,
  isCircuitOpen,
  lastUpdated,
  onRefresh,
  onForceRefresh,
  isLoading = false,
  className = '',
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  // Update time ago display
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = Date.now();
      const diff = now - lastUpdated;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      
      if (minutes > 0) {
        setTimeAgo(`${minutes}m ago`);
      } else {
        setTimeAgo(`${seconds}s ago`);
      }
    };
    
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || isLoading) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isLoading, onRefresh]);

  const handleForceRefresh = useCallback(async () => {
    if (refreshing || isLoading) return;
    
    setRefreshing(true);
    try {
      await onForceRefresh();
    } catch (error) {
      console.error('Force refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isLoading, onForceRefresh]);

  // Show circuit breaker status
  if (isCircuitOpen) {
    return (
      <div className={`refresh-status circuit-open ${className}`}>
        <div className="status-indicator">
          🔴 <span>Network temporarily unavailable</span>
        </div>
        <p className="status-message">
          Too many failed requests. Please wait a moment before refreshing.
        </p>
      </div>
    );
  }

  // Show stale data warning
  if (isStale) {
    return (
      <div className={`refresh-status stale ${className}`}>
        <div className="status-indicator">
          ⚠️ <span>Data may be outdated</span>
        </div>
        <div className="refresh-controls">
          <button 
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="refresh-button"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <span className="last-updated">Updated {timeAgo}</span>
        </div>
      </div>
    );
  }

  // Show normal refresh controls
  return (
    <div className={`refresh-status normal ${className}`}>
      <div className="refresh-controls">
        <button 
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="refresh-button secondary"
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
        <button 
          onClick={handleForceRefresh}
          disabled={refreshing || isLoading}
          className="refresh-button force"
          title="Force refresh (clears cache)"
        >
          {refreshing ? '⚡ Updating...' : '⚡ Force Refresh'}
        </button>
        <span className="last-updated">Updated {timeAgo}</span>
      </div>
    </div>
  );
};

// CSS styles (to be added to your global CSS or styled-components)
export const refreshStatusStyles = `
.refresh-status {
  padding: 12px;
  border-radius: 8px;
  margin: 8px 0;
  font-size: 14px;
}

.refresh-status.circuit-open {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.refresh-status.stale {
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  color: #92400e;
}

.refresh-status.normal {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.status-message {
  margin: 8px 0 0 0;
  font-size: 13px;
  opacity: 0.8;
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.refresh-button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.refresh-button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-button.secondary {
  border-color: #3b82f6;
  color: #3b82f6;
}

.refresh-button.force {
  border-color: #7c3aed;
  color: #7c3aed;
  background: #faf5ff;
}

.last-updated {
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .refresh-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .refresh-button {
    text-align: center;
  }
}
`;
