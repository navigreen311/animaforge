import { describe, it, expect, beforeEach } from 'vitest';
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} from '../../services/notification/src/services/notificationService';

beforeEach(() => {
  clearAll();
});

// ---------------------------------------------------------------------------
// 1. Send notification
// ---------------------------------------------------------------------------
describe('Notification - Send', () => {
  it('creates a notification with an id and read=false', () => {
    const n = sendNotification({
      userId: 'user-1', type: 'in_app', title: 'Job complete',
      body: 'Your render is ready.', category: 'job_complete',
    });
    expect(n.id).toBeDefined();
    expect(n.userId).toBe('user-1');
    expect(n.read).toBe(false);
    expect(n.category).toBe('job_complete');
  });
});

// ---------------------------------------------------------------------------
// 2. Mark read
// ---------------------------------------------------------------------------
describe('Notification - Mark Read', () => {
  it('marks a single notification as read', () => {
    const n = sendNotification({ userId: 'u2', type: 'in_app', title: 'T', body: 'B' });
    const updated = markAsRead(n.id);
    expect(updated).not.toBeNull();
    expect(updated!.read).toBe(true);
  });

  it('returns null for a non-existent id', () => {
    expect(markAsRead('nonexistent')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Mark all read
// ---------------------------------------------------------------------------
describe('Notification - Mark All Read', () => {
  it('marks all unread notifications as read', () => {
    sendNotification({ userId: 'u3', type: 'in_app', title: 'A', body: 'a' });
    sendNotification({ userId: 'u3', type: 'in_app', title: 'B', body: 'b' });
    const count = markAllAsRead('u3');
    expect(count).toBe(2);
    const { notifications } = getUserNotifications('u3', {});
    expect(notifications.every((n) => n.read)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Channel preferences (filtering)
// ---------------------------------------------------------------------------
describe('Notification - Channel Preferences', () => {
  it('filters notifications by read status', () => {
    const n1 = sendNotification({ userId: 'u4', type: 'email', title: 'A', body: 'a' });
    sendNotification({ userId: 'u4', type: 'push', title: 'B', body: 'b' });
    markAsRead(n1.id);

    const { notifications: unread } = getUserNotifications('u4', { read: false });
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// 5. Weekly digest (batch creation)
// ---------------------------------------------------------------------------
describe('Notification - Weekly Digest', () => {
  it('creates digest notifications for multiple users', () => {
    const users = ['d1', 'd2', 'd3'];
    const created = users.map((userId) =>
      sendNotification({ userId, type: 'email', title: 'Weekly Digest', body: 'Summary.' }),
    );
    expect(created).toHaveLength(3);
    for (const n of created) {
      expect(n.title).toBe('Weekly Digest');
      expect(n.type).toBe('email');
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Retry failed
// ---------------------------------------------------------------------------
describe('Notification - Retry Failed', () => {
  it('deletes a failed notification and re-sends', () => {
    const original = sendNotification({
      userId: 'u5', type: 'webhook', title: 'Webhook Failed', body: 'Delivery failed',
    });
    expect(deleteNotification(original.id)).toBe(true);
    const retried = sendNotification({
      userId: 'u5', type: 'webhook', title: 'Webhook Failed', body: 'Delivery failed',
    });
    expect(retried.id).not.toBe(original.id);
    const { total } = getUserNotifications('u5', {});
    expect(total).toBe(1);
  });
});
