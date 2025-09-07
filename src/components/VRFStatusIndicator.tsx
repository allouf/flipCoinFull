import React, { useState } from 'react';
import { useEnhancedConnectionStatus, VRFAccountDetail } from '../hooks/useEnhancedConnectionStatus';

interface VRFStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const VRFStatusIndicator: React.FC<VRFStatusIndicatorProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { vrfHealth, refreshVRFHealth, getVRFAccountDetails } = useEnhancedConnectionStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  if (!vrfHealth) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-500">VRF Initializing...</span>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVRFHealth();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'poor':
        return 'Poor';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const vrfAccounts = getVRFAccountDetails();

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        <div 
          className={`w-3 h-3 rounded-full ${getStatusColor(vrfHealth.status)} ${
            isRefreshing ? 'animate-pulse' : ''
          }`}
        />
        <span className="text-sm font-medium">
          VRF: {getStatusText(vrfHealth.status)}
        </span>
        <span className="text-xs text-gray-500">
          ({vrfHealth.healthyAccounts}/{vrfHealth.totalAccounts})
        </span>
        
        {showDetails && (
          <>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-400"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowAccountDetails(!showAccountDetails)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {showAccountDetails ? 'Hide Details' : 'Details'}
            </button>
          </>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex gap-4">
            <span>Avg Response: {vrfHealth.avgResponseTime}ms</span>
            <span>Success Rate: {(vrfHealth.avgSuccessRate * 100).toFixed(1)}%</span>
          </div>
          {vrfHealth.lastHealthCheck && (
            <div className="text-gray-500">
              Last Check: {new Date(vrfHealth.lastHealthCheck).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {showAccountDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-medium mb-2">VRF Account Details</h4>
          <div className="space-y-2">
            {vrfAccounts.map((account) => (
              <VRFAccountCard key={account.name} account={account} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface VRFAccountCardProps {
  account: VRFAccountDetail;
}

const VRFAccountCard: React.FC<VRFAccountCardProps> = ({ account }) => {
  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-2 bg-white rounded border">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{account.name}</span>
            <span className="text-xs bg-gray-200 px-1 rounded">
              Priority: {account.priority}
            </span>
            <span className={`text-xs font-medium ${getHealthColor(account.isHealthy)}`}>
              {account.isHealthy ? '✓ Healthy' : '✗ Unhealthy'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {account.publicKey.slice(0, 8)}...{account.publicKey.slice(-8)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <span className="text-gray-500">Queue Depth:</span>
          <span className="ml-1 font-medium">{account.queueDepth}</span>
        </div>
        <div>
          <span className="text-gray-500">Response Time:</span>
          <span className="ml-1 font-medium">{account.avgResponseTime}ms</span>
        </div>
        <div>
          <span className="text-gray-500">Success Rate:</span>
          <span className="ml-1 font-medium">{(account.successRate * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Last Update:</span>
          <span className="ml-1 font-medium">{formatTime(account.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
};