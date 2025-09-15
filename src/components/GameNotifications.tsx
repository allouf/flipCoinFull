import React, { useEffect, useState } from 'react';

export interface GameNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 = no auto-dismiss
}

interface GameNotificationsProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}

export const GameNotifications: React.FC<GameNotificationsProps> = ({
  notifications,
  onDismiss,
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<GameNotification[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);

    // Auto-dismiss notifications after their duration
    notifications.forEach((notification) => {
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration);
      }
    });
  }, [notifications, onDismiss]);

  if (visibleNotifications.length === 0) return null;

  const getNotificationIcon = (type: GameNotification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'info': return '🔔';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '🔔';
    }
  };

  const getNotificationClass = (type: GameNotification['type']) => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'info': return 'alert-info';
      case 'warning': return 'alert-warning';
      case 'error': return 'alert-error';
      default: return 'alert-info';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`alert ${getNotificationClass(notification.type)} shadow-lg animate-in slide-in-from-right-full duration-300`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-start space-x-3">
              <span className="text-lg">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm opacity-90 mt-1">{notification.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              className="btn btn-ghost btn-xs hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameNotifications;
