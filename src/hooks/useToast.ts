import { useState, useCallback } from 'react';
import { Toast } from '../components/Toast';

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    type: Toast['type'], 
    title: string, 
    message: string, 
    duration?: number
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message: string, duration?: number) => 
    addToast('success', title, message, duration), [addToast]);

  const error = useCallback((title: string, message: string, duration?: number) => 
    addToast('error', title, message, duration), [addToast]);

  const warning = useCallback((title: string, message: string, duration?: number) => 
    addToast('warning', title, message, duration), [addToast]);

  const info = useCallback((title: string, message: string, duration?: number) => 
    addToast('info', title, message, duration), [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };
};
