import React, { useEffect } from 'react';
import { useVRFProcessingStatus } from '../hooks/useVRFProcessingStatus';

interface VRFProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  roomId?: number;
  onComplete?: (success: boolean, result?: any) => void;
  showAdvancedDetails?: boolean;
}

export const VRFProcessingModal: React.FC<VRFProcessingModalProps> = ({
  isOpen,
  onClose,
  gameId,
  roomId,
  onComplete,
  showAdvancedDetails = false,
}) => {
  const {
    processingState,
    startProcessing,
    cancelProcessing,
    clearError,
  } = useVRFProcessingStatus();

  // Start processing when modal opens with game details
  useEffect(() => {
    if (isOpen && gameId && roomId && !processingState.isProcessing) {
      startProcessing(gameId, roomId);
    }
  }, [isOpen, gameId, roomId, processingState.isProcessing, startProcessing]);

  // Handle completion
  useEffect(() => {
    if (processingState.status?.status === 'completed' || processingState.status?.status === 'failed') {
      const success = processingState.status.status === 'completed';
      onComplete?.(success, processingState.status);
      
      if (success) {
        // Auto-close on success after a brief delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  }, [processingState.status?.status, onComplete, onClose]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (processingState.canCancel) {
      cancelProcessing();
    }
    onClose();
  };

  const handleRetry = () => {
    if (gameId && roomId) {
      clearError();
      startProcessing(gameId, roomId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              VRF Processing
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={processingState.isProcessing && !processingState.canCancel}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{processingState.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  processingState.error 
                    ? 'bg-red-500' 
                    : processingState.status?.status === 'completed'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${processingState.progress}%` }}
              />
            </div>
          </div>

          {/* Status Text */}
          <div className="mb-6">
            <p className="text-center text-gray-700 font-medium">
              {processingState.statusText}
            </p>
            
            {/* Time and Attempt Info */}
            {processingState.status && (
              <div className="mt-2 text-center text-sm text-gray-500">
                {processingState.status.timeElapsed > 0 && (
                  <span>
                    Time: {Math.round(processingState.status.timeElapsed / 1000)}s
                  </span>
                )}
                {processingState.status.attempt > 1 && (
                  <span className="ml-3">
                    Attempt: {processingState.status.attempt}/{processingState.status.maxAttempts}
                  </span>
                )}
              </div>
            )}

            {/* Queue Information */}
            {processingState.status?.estimatedWaitTime && (
              <div className="mt-2 text-center text-sm text-blue-600">
                <span>
                  Estimated wait: ~{Math.round(processingState.status.estimatedWaitTime / 1000)}s
                </span>
                {processingState.status.queuePosition && (
                  <span className="ml-2">
                    (Queue position: #{processingState.status.queuePosition})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {processingState.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">VRF Processing Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{processingState.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Details */}
          {showAdvancedDetails && processingState.status && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Details</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Game ID: {processingState.gameId}</div>
                <div>Room ID: {processingState.status.roomId}</div>
                {processingState.status.vrfAccount && (
                  <div>VRF Account: {processingState.status.vrfAccount}</div>
                )}
                <div>Status: {processingState.status.status}</div>
                {processingState.history.length > 0 && (
                  <div>
                    <div className="mt-2 font-medium">Recent Events:</div>
                    <div className="max-h-20 overflow-y-auto">
                      {processingState.history.slice(-3).map((event, index) => (
                        <div key={index} className="text-xs">
                          {event.status} - {event.account} 
                          {event.error && ` (${event.error})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {processingState.error && !processingState.isProcessing && (
              <button
                onClick={handleRetry}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Retry VRF Request
              </button>
            )}
            
            {processingState.canCancel ? (
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                Cancel Request
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  processingState.status?.status === 'completed'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : processingState.error
                    ? 'bg-gray-500 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {processingState.status?.status === 'completed' 
                  ? 'Done' 
                  : processingState.error
                  ? 'Close'
                  : 'Close'}
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {processingState.isProcessing && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Processing...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact version for inline use
export const VRFProcessingIndicator: React.FC<{
  gameId?: string;
  showDetails?: boolean;
  className?: string;
}> = ({
  gameId,
  showDetails = false,
  className = '',
}) => {
  const { processingState, getProcessingStats } = useVRFProcessingStatus();

  if (!processingState.isProcessing && !processingState.status) {
    return null;
  }

  const stats = getProcessingStats();

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        {/* Spinner */}
        {processingState.isProcessing && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        )}
        
        {/* Status */}
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-800">
            {processingState.statusText}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
            <div 
              className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
          
          {/* Details */}
          {showDetails && processingState.status && (
            <div className="mt-1 text-xs text-blue-600">
              {processingState.status.vrfAccount && (
                <span>Account: {processingState.status.vrfAccount} • </span>
              )}
              {processingState.status.attempt > 1 && (
                <span>Attempt: {processingState.status.attempt}/{processingState.status.maxAttempts}</span>
              )}
            </div>
          )}
        </div>

        {/* Time */}
        {processingState.status && processingState.status.timeElapsed > 0 && (
          <div className="text-xs text-blue-600">
            {Math.round(processingState.status.timeElapsed / 1000)}s
          </div>
        )}
      </div>

      {/* System Stats */}
      {showDetails && (
        <div className="mt-2 text-xs text-gray-500 flex gap-4">
          <span>Active: {stats.activeGames}</span>
          <span>Avg Time: {Math.round(stats.averageProcessingTime / 1000)}s</span>
          <span>Success: {Math.round(stats.successRate * 100)}%</span>
          <span className={`font-medium ${
            stats.currentLoad === 'high' ? 'text-red-500' :
            stats.currentLoad === 'medium' ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            Load: {stats.currentLoad}
          </span>
        </div>
      )}
    </div>
  );
};