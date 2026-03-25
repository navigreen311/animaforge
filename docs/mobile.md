# AnimaForge Mobile App

The AnimaForge mobile app provides on-the-go access to project management, review workflows, and real-time notifications. It is built with React Native for cross-platform support.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.74+ |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| State Management | Zustand + TanStack Query |
| Networking | Axios with interceptors for JWT refresh |
| Real-time | Socket.IO client |
| Storage | MMKV for key-value, SQLite for offline cache |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Animations | Reanimated 3 + Gesture Handler |

### Project Structure

```
apps/mobile/
  src/
    components/        # Shared UI components
    screens/           # Screen components organized by feature
      auth/
      projects/
      timeline/
      review/
      notifications/
      settings/
    navigation/        # Navigator definitions
    services/          # API client, WebSocket, storage
    stores/            # Zustand stores
    hooks/             # Custom hooks
    utils/             # Helpers and constants
  ios/                 # Native iOS project (Xcode)
  android/             # Native Android project (Gradle)
```

---

## Navigation Structure

```
App
  AuthStack
    LoginScreen
    SSOScreen
    ForgotPasswordScreen
  MainTabs
    ProjectsTab
      ProjectListScreen
      ProjectDetailScreen
      TimelineScreen
      ShotDetailScreen
    ReviewTab
      ReviewQueueScreen
      ReviewDetailScreen (side-by-side compare)
    NotificationsTab
      NotificationListScreen
    ProfileTab
      ProfileScreen
      SettingsScreen
      AppearanceScreen
```

---

## Push Notifications

### Supported Events

| Event | Notification |
|-------|-------------|
| Generation complete | "Your video for [Project] is ready to review" |
| Generation failed | "Generation failed for [Shot] in [Project]" |
| Review requested | "[User] requested your review on [Project]" |
| Review approved/rejected | "Your shot was [approved/rejected] by [User]" |
| Comment added | "[User] commented on [Shot]" |
| Collaboration invite | "[User] invited you to [Project]" |
| System maintenance | "Scheduled maintenance on [Date]" |

### Implementation

- **iOS**: Apple Push Notification service (APNs) via Firebase Cloud Messaging
- **Android**: Firebase Cloud Messaging (FCM)
- **Token management**: Device push tokens are registered on login and refreshed on app foreground
- **Preferences**: Users can enable/disable notification categories in Settings
- **Deep linking**: Tapping a notification opens the relevant screen (project, shot, review)

---

## Offline Mode

The mobile app supports limited offline functionality:

### Available Offline

- Browse cached project list and details
- View previously loaded shot thumbnails and metadata
- Read cached review comments
- Draft comments (queued for sync)
- View notification history

### Requires Connection

- Video playback (streamed from CDN)
- Starting generation jobs
- Approving/rejecting reviews
- Uploading assets
- Real-time collaboration

### Sync Strategy

1. On app launch, TanStack Query checks cache freshness and refetches stale data
2. Offline mutations are queued in MMKV and replayed on reconnection
3. Conflict resolution: server state wins, with a notification to the user if their offline action was superseded
4. Background sync runs every 5 minutes when the app is foregrounded

---

## Supported Platforms

| Platform | Minimum Version | Target Version |
|----------|----------------|----------------|
| iOS | 16.0 | 18.x |
| Android | API 28 (Android 9) | API 35 (Android 15) |

### Device Requirements

- 4 GB RAM minimum (recommended 6 GB+)
- 100 MB free storage for app + cache
- Internet connection for core features (Wi-Fi or cellular)

### Build and Distribution

- **iOS**: Distributed via TestFlight (beta) and the App Store (production)
- **Android**: Distributed via Firebase App Distribution (beta) and Google Play (production)
- **CI/CD**: Builds are triggered by tags matching `mobile/v*` using GitHub Actions with Fastlane
- **Code signing**: Managed via Fastlane Match (iOS) and Gradle signing configs (Android)
