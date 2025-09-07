import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, Server, Wifi } from 'lucide-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getVRFAccountManager } from '../services/VRFAccountManager';
import { getVRFEmergencyFallback } from '../services/VRFEmergencyFallback';

interface VRFSystemStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  vrfAccounts: {
    healthy: number;
    total: number;
    failing: string[];
    quarantined: string[];
  };
  emergencyGames: number;
  networkStatus: 'good' | 'poor' | 'offline';
  lastUpdate: number;
}

/**
 * VRFSystemStatus - Real-time system health indicator
 * 
 * Features:
 * - VRF account health summary
 * - Emergency game count
 * - Network status indicator
 * - Overall system status with visual indicators
 */
export const VRFSystemStatus: React.FC<VRFSystemStatusProps> = ({
  className = '',
  showDetails = false,
}) => {
  const { connection } = useConnection();
  const [status, setStatus] = useState<SystemStatus>({
    overall: 'healthy',
    vrfAccounts: {
      healthy: 0,
      total: 0,
      failing: [],
      quarantined: [],
    },
    emergencyGames: 0,
    networkStatus: 'good',
    lastUpdate: Date.now(),
  });

  const [isExpanded, setIsExpanded] = useState(showDetails);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      try {
        // Get VRF account manager status
        const vrfManager = getVRFAccountManager();
        const accountSummary = vrfManager.getAccountStatusSummary();
        
        // Get emergency fallback status
        const emergencyFallback = getVRFEmergencyFallback(connection);
        const emergencyGames = emergencyFallback.getActiveEmergencyGames();
        
        // Calculate overall system health
        const healthyRatio = accountSummary.healthy.length / accountSummary.total;
        let overall: SystemStatus['overall'] = 'healthy';
        
        if (emergencyGames.length > 0 || healthyRatio < 0.3) {
          overall = 'critical';
        } else if (healthyRatio < 0.7 || accountSummary.failing.length > 0) {
          overall = 'degraded';
        }
        
        // Simulate network status (in real app, this would check actual network health)
        const networkStatus: SystemStatus['networkStatus'] = 
          accountSummary.failing.length > accountSummary.healthy.length ? 'poor' : 'good';

        setStatus({
          overall,
          vrfAccounts: {
            healthy: accountSummary.healthy.length,
            total: accountSummary.total,
            failing: accountSummary.failing,
            quarantined: accountSummary.quarantined,
          },
          emergencyGames: emergencyGames.length,
          networkStatus,
          lastUpdate: Date.now(),
        });
      } catch (error) {
        console.warn('Failed to update VRF system status:', error);
        // Set degraded status on error
        setStatus(prev => ({
          ...prev,
          overall: 'degraded',
          lastUpdate: Date.now(),
        }));
      }
    };

    // Initial update
    updateStatus();
    
    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000);
    
    return () => clearInterval(interval);
  }, [connection]);

  // Get status color scheme
  const getStatusColors = (status: SystemStatus['overall']) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-green-50 dark:bg-green-900/10',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          icon: 'text-green-600 dark:text-green-400',
        };
      
      case 'degraded':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/10',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
      
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/10',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400',
        };
      
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/10',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          icon: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const colors = getStatusColors(status.overall);
  const StatusIcon = status.overall === 'healthy' ? CheckCircle : 
                   status.overall === 'degraded' ? AlertTriangle : 
                   AlertTriangle;

  return (
    <div className={`rounded-lg border ${colors.bg} ${colors.border} ${className}`}>
      {/* Main Status Header */}
      <div 
        className="p-3 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={colors.icon} size={16} />
            <span className={`text-sm font-medium ${colors.text}`}>
              VRF System: {status.overall.charAt(0).toUpperCase() + status.overall.slice(1)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick indicators */}
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Server size={12} />
              <span>{status.vrfAccounts.healthy}/{status.vrfAccounts.total}</span>
            </div>
            
            {status.emergencyGames > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Clock size={12} />
                <span>{status.emergencyGames}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Wifi size={12} />
              <div className={`w-2 h-2 rounded-full ${
                status.networkStatus === 'good' ? 'bg-green-500' :
                status.networkStatus === 'poor' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* VRF Accounts Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server size={14} className="text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                VRF Accounts
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {status.vrfAccounts.healthy} Healthy
                </span>
              </div>
              <div>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {status.vrfAccounts.failing.length} Failing
                </span>
              </div>
            </div>
            
            {status.vrfAccounts.quarantined.length > 0 && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {status.vrfAccounts.quarantined.length} Quarantined
              </div>
            )}
          </div>

          {/* Emergency Games */}
          {status.emergencyGames > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Emergency Resolution Active
                </span>
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                {status.emergencyGames} game{status.emergencyGames !== 1 ? 's' : ''} using backup resolution
              </div>
            </div>
          )}

          {/* Network Status */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={14} className="text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Network Status
              </span>
            </div>
            <div className={`text-xs ${
              status.networkStatus === 'good' ? 'text-green-600 dark:text-green-400' :
              status.networkStatus === 'poor' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {status.networkStatus === 'good' ? 'All systems operational' :
               status.networkStatus === 'poor' ? 'Some connectivity issues' :
               'Network connectivity problems'}
            </div>
          </div>

          {/* Last Update */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
            Last updated: {new Date(status.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default VRFSystemStatus;