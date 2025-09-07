import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Clock, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { getVRFErrorDetector, VRFErrorClassification } from '../services/VRFErrorDetector';
import { getVRFEmergencyFallback } from '../services/VRFEmergencyFallback';
import { useConnection } from '@solana/wallet-adapter-react';

interface VRFErrorRecoveryProps {
  gameId: string;
  roomId: number;
  error?: Error;
  vrfAccount?: string;
  onRetry?: () => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface ErrorState {
  classification: VRFErrorClassification | null;
  isRetrying: boolean;
  emergencyTimeRemaining: number;
  canManualRetry: boolean;
  showDetails: boolean;
}

/**
 * VRFErrorRecovery - User-friendly error recovery interface for VRF failures
 * 
 * Features:
 * - Clear error explanations in user-friendly language
 * - Automatic retry countdown and manual retry options
 * - Emergency timeout visualization with fallback options
 * - Network status indicators and troubleshooting suggestions
 * - Integration with VRF error detection and emergency fallback systems
 */
export const VRFErrorRecovery: React.FC<VRFErrorRecoveryProps> = ({
  gameId,
  roomId,
  error,
  vrfAccount,
  onRetry,
  onCancel,
  className = '',
}) => {
  const { connection } = useConnection();
  const [errorState, setErrorState] = useState<ErrorState>({
    classification: null,
    isRetrying: false,
    emergencyTimeRemaining: 0,
    canManualRetry: true,
    showDetails: false,
  });

  const errorDetector = getVRFErrorDetector();
  const emergencyFallback = getVRFEmergencyFallback(connection);

  // Update error classification when error changes
  useEffect(() => {
    if (error && vrfAccount) {
      const classification = errorDetector.classifyError(error, vrfAccount);
      setErrorState(prev => ({
        ...prev,
        classification,
      }));
    }
  }, [error, vrfAccount, errorDetector]);

  // Monitor emergency timeout
  useEffect(() => {
    if (!gameId) return;

    const interval = setInterval(() => {
      const activeGames = emergencyFallback.getActiveEmergencyGames();
      const currentGame = activeGames.find(game => game.gameId === gameId);
      
      if (currentGame) {
        setErrorState(prev => ({
          ...prev,
          emergencyTimeRemaining: Math.max(0, currentGame.timeRemaining),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameId, emergencyFallback]);

  // Handle manual retry
  const handleManualRetry = async () => {
    if (!onRetry || errorState.isRetrying) return;

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    try {
      // Try manual VRF retry first
      if (emergencyFallback.isGameInEmergencyState(gameId)) {
        await emergencyFallback.manualRetryVRF(gameId);
      }

      // Call parent retry function
      await onRetry();
    } catch (retryError) {
      console.error('Manual retry failed:', retryError);
      // Error will be handled by parent component
    } finally {
      setErrorState(prev => ({ ...prev, isRetrying: false }));
    }
  };

  // Get user-friendly error message
  const getUserFriendlyMessage = (classification: VRFErrorClassification): string => {
    switch (classification.type) {
      case 'timeout':
        return `The coin flip is taking longer than usual. This sometimes happens when the randomness service is busy. We're automatically trying different servers to speed things up.`;
      
      case 'queue_full':
        return `The randomness service is experiencing high demand right now. We've automatically switched to a less busy server and should have your result shortly.`;
      
      case 'oracle_offline':
        return `One of our randomness servers appears to be temporarily unavailable. We're automatically using backup servers to complete your coin flip.`;
      
      case 'network':
        return `There seems to be a network connectivity issue. This could be due to your internet connection or temporary server issues. We're retrying automatically.`;
      
      case 'account_invalid':
        return `There's a technical issue with one of our randomness servers. We've automatically switched to a working server to complete your game.`;
      
      default:
        return `We're experiencing a technical issue with the coin flip service. Our system is automatically trying different approaches to complete your game.`;
    }
  };

  // Get severity color scheme
  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-700',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600 dark:text-blue-400',
        };
      
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-700',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
      
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-700',
          text: 'text-orange-800 dark:text-orange-200',
          icon: 'text-orange-600 dark:text-orange-400',
        };
      
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-700',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400',
        };
      
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-800 dark:text-gray-200',
          icon: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return seconds > 60 ? `${Math.ceil(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  };

  if (!error || !errorState.classification) {
    return null;
  }

  const colors = getSeverityColors(errorState.classification.severity);
  const isEmergencyActive = errorState.emergencyTimeRemaining > 0;

  return (
    <div className={`rounded-lg border-2 ${colors.bg} ${colors.border} ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`flex-shrink-0 ${colors.icon}`}>
            {errorState.classification.severity === 'critical' ? (
              <AlertTriangle size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${colors.text} mb-2`}>
              {isEmergencyActive ? 'Backup Resolution Active' : 'Processing Your Coin Flip'}
            </h3>
            
            <p className={`${colors.text} opacity-90 leading-relaxed`}>
              {getUserFriendlyMessage(errorState.classification)}
            </p>
          </div>
        </div>

        {/* Emergency Timeout Warning */}
        {isEmergencyActive && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-amber-600 dark:text-amber-400" size={20} />
              <span className="font-medium text-amber-800 dark:text-amber-200">
                Backup Resolution in {formatTimeRemaining(errorState.emergencyTimeRemaining)}
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              If the randomness service doesn't respond soon, we'll automatically resolve your game fairly. 
              You won't lose your bet - our backup system ensures fair outcomes.
            </p>
          </div>
        )}

        {/* Network Status */}
        <div className="flex items-center gap-2 mb-4">
          {errorState.classification.type === 'network' ? (
            <WifiOff className="text-red-500" size={16} />
          ) : (
            <Wifi className="text-green-500" size={16} />
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {errorState.classification.type === 'network' 
              ? 'Network issues detected' 
              : 'Network connection stable'
            }
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onRetry && errorState.canManualRetry && (
            <button
              onClick={handleManualRetry}
              disabled={errorState.isRetrying}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {errorState.isRetrying ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Try Again
                </>
              )}
            </button>
          )}
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel Game
            </button>
          )}

          <button
            onClick={() => setErrorState(prev => ({ ...prev, showDetails: !prev.showDetails }))}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {errorState.showDetails ? 'Hide Details' : 'Show Technical Details'}
          </button>
        </div>

        {/* Technical Details (Collapsible) */}
        {errorState.showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Technical Details</h4>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-2">
              <div>
                <span className="font-medium">Error Type:</span> {errorState.classification.type}
              </div>
              <div>
                <span className="font-medium">Severity:</span> {errorState.classification.severity}
              </div>
              <div>
                <span className="font-medium">VRF Account:</span> {vrfAccount || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Suggested Action:</span> {errorState.classification.suggestedAction}
              </div>
              <div>
                <span className="font-medium">Error Message:</span> 
                <code className="block mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                  {error.message}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Reassurance Message */}
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Your funds are safe
            </span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            All transactions are secured by the Solana blockchain. 
            If the game cannot complete normally, you'll receive a full refund automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VRFErrorRecovery;