/**
 * Centro de notificações em tempo real
 * Fase 6: Sistema Multi-Loja - Fase 3
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  // Função para adicionar notificação (pode ser usada globalmente)
  const addNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      action?: { label: string; onClick: () => void }
    ) => {
      const id = Date.now().toString();
      const notification: Notification = {
        id,
        title,
        message,
        type,
        timestamp: new Date(),
        read: false,
        action,
      };

      setNotifications((prev) => [notification, ...prev]);

      // Auto-hide success notifications após 5 segundos
      if (type === 'success') {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, 5000);
        setAutoHideTimer(timer);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <Info size={20} className="text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell size={20} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-slate-800 dark:text-slate-200';
    }
  };

  // Expose function globally for easy access
  useEffect(() => {
    (window as any).__notificationCenter = { addNotification, removeNotification };
  }, [addNotification, removeNotification]);

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => {
            setShowPanel(!showPanel);
            if (!showPanel) {
              notifications.forEach((n) => markAsRead(n.id));
            }
          }}
          className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Notificações"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {showPanel && (
          <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Sem notificações</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-slate-50 dark:bg-slate-800/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${getTextColor(notification.type)}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {notification.timestamp.toLocaleTimeString('pt-PT')}
                        </p>

                        {notification.action && (
                          <button
                            onClick={notification.action.onClick}
                            className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                          >
                            {notification.action.label} →
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Panel Footer */}
            {notifications.length > 0 && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-3">
                <button
                  onClick={clearAll}
                  className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium py-1"
                >
                  Limpar Tudo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Export para uso global
export const useNotifications = () => {
  return (window as any).__notificationCenter || { addNotification: () => {}, removeNotification: () => {} };
};
