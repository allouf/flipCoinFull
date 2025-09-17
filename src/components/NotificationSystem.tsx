import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showGameUpdate: (message: string, gameId?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const showSuccess = useCallback((message: string) => {
    toast.success(message, {
      duration: 5000,
      position: 'top-right',
    });
  }, []);

  const showError = useCallback((message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  }, []);

  const showInfo = useCallback((message: string) => {
    toast(message, {
      duration: 5000,
      position: 'top-right',
      icon: 'ℹ️',
    });
  }, []);

  const showWarning = useCallback((message: string) => {
    toast(message, {
      duration: 5000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#ffffff',
      },
    });
  }, []);

  const showGameUpdate = useCallback((message: string, gameId?: number) => {
    const displayMessage = gameId ? `🎲 Game ${gameId}: ${message}` : `🎲 ${message}`;
    toast(displayMessage, {
      duration: 7000,
      position: 'top-right',
      icon: '🎲',
    });
  }, []);

  const value = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showGameUpdate,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        containerClassName=""
        containerStyle={{
          zIndex: 9999,
        }}
        toastOptions={{
          className: '',
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
    </NotificationContext.Provider>
  );
};
