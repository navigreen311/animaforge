import { v4 as uuidv4 } from "uuid";

export type NotificationType =
  | "email"
  | "push"
  | "in_app"
  | "webhook";

export type NotificationCategory =
  | "job_complete"
  | "job_failed"
  | "review_requested"
  | "comment_added"
  | "collab_invite"
  | "credit_low";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// In-memory store: userId -> Notification[]
const notifications = new Map<string, Notification[]>();

export function sendNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  category?: NotificationCategory;
}): Notification {
  const notification: Notification = {
    id: uuidv4(),
    userId: data.userId,
    type: data.type,
    category: data.category,
    title: data.title,
    body: data.body,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const userNotifications = notifications.get(data.userId) || [];
  userNotifications.push(notification);
  notifications.set(data.userId, userNotifications);

  return notification;
}

export function getUserNotifications(
  userId: string,
  options: { page?: number; limit?: number; read?: boolean }
): { notifications: Notification[]; total: number; page: number; limit: number } {
  const page = options.page || 1;
  const limit = options.limit || 20;

  let userNotifications = notifications.get(userId) || [];

  if (options.read !== undefined) {
    userNotifications = userNotifications.filter((n) => n.read === options.read);
  }

  // Sort newest first
  const sorted = [...userNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = sorted.length;
  const start = (page - 1) * limit;
  const paginated = sorted.slice(start, start + limit);

  return { notifications: paginated, total, page, limit };
}

export function markAsRead(notificationId: string): Notification | null {
  for (const [, userNotifications] of notifications) {
    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return notification;
    }
  }
  return null;
}

export function markAllAsRead(userId: string): number {
  const userNotifications = notifications.get(userId) || [];
  let count = 0;
  for (const n of userNotifications) {
    if (!n.read) {
      n.read = true;
      count++;
    }
  }
  return count;
}

export function deleteNotification(notificationId: string): boolean {
  for (const [userId, userNotifications] of notifications) {
    const index = userNotifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      userNotifications.splice(index, 1);
      notifications.set(userId, userNotifications);
      return true;
    }
  }
  return false;
}

export function clearAll(): void {
  notifications.clear();
}
