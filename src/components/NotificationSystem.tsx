import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast, ToastContainer, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface NotificationContextType {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
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
  const defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options });
  }, []);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    toast.error(message, { ...defaultOptions, ...options });
  }, []);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    toast.info(message, { ...defaultOptions, ...options });
  }, []);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    toast.warning(message, { ...defaultOptions, ...options });
  }, []);

  const showGameUpdate = useCallback((message: string, gameId?: number) => {
    const displayMessage = gameId ? `🎲 Game ${gameId}: ${message}` : `🎲 ${message}`;
    toast.info(displayMessage, {
      ...defaultOptions,
      autoClose: 7000,
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
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastClassName="custom-toast"
        style={{ zIndex: 9999 }}
      />
    </NotificationContext.Provider>
  );
};
