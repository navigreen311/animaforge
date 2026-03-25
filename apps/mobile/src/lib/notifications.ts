import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification category identifiers
export const NOTIFICATION_CATEGORIES = {
  JOB_COMPLETE: 'job_complete',
  REVIEW_REQUEST: 'review_request',
  COLLAB_INVITE: 'collab_invite',
} as const;

/**
 * Register device for push notifications and send token to server.
 * Returns the Expo push token string, or null if permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c4dff',
    });

    await Notifications.setNotificationChannelAsync('generations', {
      name: 'Generations',
      description: 'Generation job status updates',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('collaboration', {
      name: 'Collaboration',
      description: 'Team invites and review requests',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get the push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Register token with the server
  try {
    await api.post('/devices/register', {
      token,
      platform: Platform.OS,
    });
  } catch {
    // Silently fail -- server registration is best-effort
  }

  return token;
}

/**
 * Set up notification category actions for interactive notifications.
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.JOB_COMPLETE, [
    {
      identifier: 'view',
      buttonTitle: 'View Result',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.REVIEW_REQUEST, [
    {
      identifier: 'review',
      buttonTitle: 'Review Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'later',
      buttonTitle: 'Later',
      options: {},
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.COLLAB_INVITE, [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: { isDestructive: true },
    },
  ]);
}

/**
 * Handle an incoming notification (foreground or background tap).
 * Returns a cleanup function to remove the listener.
 */
export function handleNotification(
  onReceive: (notification: Notifications.Notification) => void,
  onTap: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receiveSub = Notifications.addNotificationReceivedListener(onReceive);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onTap);

  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}

/**
 * Get the count of unread/pending notifications (badge count).
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Clear the badge count.
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
