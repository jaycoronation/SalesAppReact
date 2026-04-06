import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ApiEndPoints } from '@/network/ApiEndPoint';
import { SessionManager } from '@/utils/sessionManager';

interface Notification {
  is_read: string;
}

interface NotificationContextType {
  unreadCount: number;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const userData = await SessionManager.getUserData();
      const token = await SessionManager.getToken();
      
      if (!userData?.user_id || !token) return;

      const response = await fetch(
        `${ApiEndPoints.BASE_URL}notifications/list?user_id=${userData.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const json = await response.json();
        if (json.success === 1 && Array.isArray(json.data)) {
          const unread = (json.data as Notification[]).filter((n) => n.is_read === '0').length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to fetch count:', err);
    }
  }, []);

  // Initial fetch on provider mount
  useEffect(() => {
    refreshCount();
    
    // Optional: Refresh periodically (e.g., every 5 minutes)
    const interval = setInterval(refreshCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
