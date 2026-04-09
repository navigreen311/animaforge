"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./use-socket";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface UseRealtimeNotificationsReturn {
  /** The most recent notification received via WebSocket. */
  latestNotification: Notification | null;
  /** Running count of unread notifications since mount. */
  unreadCount: number;
  /** Mark all current notifications as read (resets unreadCount to 0). */
  markAllRead: () => void;
}

/**
 * Subscribe to `notification:new` events from the realtime service.
 *
 * Returns the latest notification, a running unread count, and a
 * helper to reset the count.
 */
export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const { subscribe } = useSocket();
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return subscribe<{ notification: Notification }>("notification:new", (data) => {
      setLatestNotification(data.notification);
      setUnreadCount((prev) => prev + 1);
    });
  }, [subscribe]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { latestNotification, unreadCount, markAllRead };
}
