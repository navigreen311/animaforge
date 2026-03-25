import { v4 as uuidv4 } from "uuid";
import prisma from "../db";

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

export type EmailTemplateType =
  | "welcome"
  | "job_complete"
  | "review_request"
  | "credit_low"
  | "weekly_digest";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  createdAt: string;
}

export interface ChannelPreferences {
  email: boolean;
  push: boolean;
  in_app: boolean;
  webhook: boolean;
  unsubscribedTypes: NotificationCategory[];
}

// ---------------------------------------------------------------------------
// In-memory stores (used as primary when Prisma is unavailable)
// ---------------------------------------------------------------------------
const notifications = new Map<string, Notification[]>();
const preferences = new Map<string, ChannelPreferences>();

// ---------------------------------------------------------------------------
// Helpers — Prisma persistence with in-memory fallback
// ---------------------------------------------------------------------------
function defaultPreferences(): ChannelPreferences {
  return {
    email: true,
    push: true,
    in_app: true,
    webhook: false,
    unsubscribedTypes: [],
  };
}

async function persistNotification(notification: Notification): Promise<void> {
  if (!prisma?.notification) return;
  try {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {
        read: notification.read,
        status: notification.status,
        retryCount: notification.retryCount,
      },
      create: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        category: notification.category ?? null,
        title: notification.title,
        body: notification.body,
        read: notification.read,
        status: notification.status,
        retryCount: notification.retryCount,
        createdAt: notification.createdAt,
      },
    });
  } catch {
    // DB write failed — in-memory copy is still authoritative
  }
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------
const EMAIL_TEMPLATES: Record<EmailTemplateType, (vars: Record<string, string>) => string> = {
  welcome: (v) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
<h1 style="color:#6C63FF;">Welcome to AnimaForge, ${v.name || "Creator"}!</h1>
<p>Your account is ready. Start creating stunning animations today.</p>
<a href="${v.dashboardUrl || "#"}" style="display:inline-block;padding:12px 24px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:6px;">Go to Dashboard</a>
</body></html>`,

  job_complete: (v) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
<h2>Job Complete</h2>
<p>Your job <strong>${v.jobName || "Untitled"}</strong> (ID: ${v.jobId || "N/A"}) has finished successfully.</p>
<p>Duration: ${v.duration || "N/A"}</p>
<a href="${v.resultUrl || "#"}" style="display:inline-block;padding:12px 24px;background:#28a745;color:#fff;text-decoration:none;border-radius:6px;">View Results</a>
</body></html>`,

  review_request: (v) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
<h2>Review Requested</h2>
<p><strong>${v.requesterName || "A team member"}</strong> has requested your review on <em>${v.itemName || "an item"}</em>.</p>
<a href="${v.reviewUrl || "#"}" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;">Start Review</a>
</body></html>`,

  credit_low: (v) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
<h2 style="color:#dc3545;">Low Credit Warning</h2>
<p>Your account balance is <strong>${v.remaining || "0"} credits</strong>. Add more credits to keep your jobs running.</p>
<a href="${v.billingUrl || "#"}" style="display:inline-block;padding:12px 24px;background:#dc3545;color:#fff;text-decoration:none;border-radius:6px;">Add Credits</a>
</body></html>`,

  weekly_digest: (v) => `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
<h2>Your Weekly Digest</h2>
<p>Here is a summary of your activity this week:</p>
<ul>
  <li>Total notifications: <strong>${v.totalCount || "0"}</strong></li>
  <li>Jobs completed: <strong>${v.jobCompleteCount || "0"}</strong></li>
  <li>Reviews requested: <strong>${v.reviewCount || "0"}</strong></li>
  <li>Comments: <strong>${v.commentCount || "0"}</strong></li>
</ul>
${v.digestBody || ""}
<a href="${v.dashboardUrl || "#"}" style="display:inline-block;padding:12px 24px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:6px;">Go to Dashboard</a>
</body></html>`,
};

export function getTemplate(
  type: EmailTemplateType,
  vars: Record<string, string> = {}
): string {
  const templateFn = EMAIL_TEMPLATES[type];
  if (!templateFn) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return templateFn(vars);
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------
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
    status: "sent",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  const userNotifications = notifications.get(data.userId) || [];
  userNotifications.push(notification);
  notifications.set(data.userId, userNotifications);

  persistNotification(notification);

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
      persistNotification(notification);
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
      persistNotification(n);
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
      if (prisma?.notification) {
        prisma.notification.delete({ where: { id: notificationId } }).catch(() => {});
      }
      return true;
    }
  }
  return false;
}

export function clearAll(): void {
  notifications.clear();
  preferences.clear();
}

// ---------------------------------------------------------------------------
// Batch Send
// ---------------------------------------------------------------------------
export function sendBatch(
  items: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    category?: NotificationCategory;
  }[]
): Notification[] {
  return items.map((item) => sendNotification(item));
}

// ---------------------------------------------------------------------------
// Weekly Digest
// ---------------------------------------------------------------------------
export function generateWeeklyDigest(
  userId: string,
  vars: Record<string, string> = {}
): { html: string; summary: { total: number; byCategory: Record<string, number> } } {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const userNotifications = notifications.get(userId) || [];

  const weekNotifications = userNotifications.filter(
    (n) => new Date(n.createdAt) >= oneWeekAgo
  );

  const byCategory: Record<string, number> = {};
  for (const n of weekNotifications) {
    const cat = n.category || "general";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const templateVars: Record<string, string> = {
    totalCount: String(weekNotifications.length),
    jobCompleteCount: String(byCategory["job_complete"] || 0),
    reviewCount: String(byCategory["review_requested"] || 0),
    commentCount: String(byCategory["comment_added"] || 0),
    ...vars,
  };

  const html = getTemplate("weekly_digest", templateVars);
  return { html, summary: { total: weekNotifications.length, byCategory } };
}

// ---------------------------------------------------------------------------
// Channel Preferences
// ---------------------------------------------------------------------------
export function getPreferences(userId: string): ChannelPreferences {
  return preferences.get(userId) || defaultPreferences();
}

export function updatePreferences(
  userId: string,
  prefs: Partial<ChannelPreferences>
): ChannelPreferences {
  const current = getPreferences(userId);
  const updated: ChannelPreferences = {
    email: prefs.email ?? current.email,
    push: prefs.push ?? current.push,
    in_app: prefs.in_app ?? current.in_app,
    webhook: prefs.webhook ?? current.webhook,
    unsubscribedTypes: prefs.unsubscribedTypes ?? current.unsubscribedTypes,
  };
  preferences.set(userId, updated);

  if (prisma?.channelPreference) {
    prisma.channelPreference
      .upsert({
        where: { userId },
        update: { ...updated },
        create: { userId, ...updated },
      })
      .catch(() => {});
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Unsubscribe from specific notification type
// ---------------------------------------------------------------------------
export function unsubscribeFromType(
  userId: string,
  type: NotificationCategory
): ChannelPreferences {
  const current = getPreferences(userId);
  if (!current.unsubscribedTypes.includes(type)) {
    current.unsubscribedTypes.push(type);
  }
  preferences.set(userId, current);
  return current;
}

// ---------------------------------------------------------------------------
// Retry Failed Deliveries
// ---------------------------------------------------------------------------
export function retryFailed(maxRetries: number = 3): {
  retried: number;
  stillFailed: number;
} {
  let retried = 0;
  let stillFailed = 0;

  for (const [, userNotifications] of notifications) {
    for (const n of userNotifications) {
      if (n.status === "failed" && n.retryCount < maxRetries) {
        // Exponential backoff delay (conceptual — actual delay handled by caller/scheduler)
        const _backoffMs = Math.pow(2, n.retryCount) * 1000;

        // Simulate retry attempt
        try {
          // In production this would call the actual delivery channel
          n.status = "sent";
          n.retryCount += 1;
          retried++;
          persistNotification(n);
        } catch {
          n.retryCount += 1;
          if (n.retryCount >= maxRetries) {
            stillFailed++;
          }
          persistNotification(n);
        }
      } else if (n.status === "failed" && n.retryCount >= maxRetries) {
        stillFailed++;
      }
    }
  }

  return { retried, stillFailed };
}

// ---------------------------------------------------------------------------
// Helpers exposed for testing
// ---------------------------------------------------------------------------
export function _getNotificationsMap(): Map<string, Notification[]> {
  return notifications;
}
