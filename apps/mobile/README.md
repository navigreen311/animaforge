# AnimaForge Mobile

React Native + Expo companion app for AnimaForge.

## Stack

- Expo SDK 50
- React Native 0.73
- TypeScript (strict)
- React Navigation (bottom tabs + native stack)
- TanStack Query for server state
- Zustand for client state (auth, etc.)
- expo-notifications, expo-camera, expo-av, expo-file-system, expo-linking

## Project Structure

```
apps/mobile/
├── App.tsx                 # Root component: providers + bottom tab navigator
├── app.json                # Expo config (name, slug, icons, plugins)
├── package.json            # Dependencies & scripts
├── babel.config.js         # babel-preset-expo
├── tsconfig.json           # Strict TS, @/* → ./src/*
├── .gitignore
└── src/
    ├── lib/
    │   └── api.ts          # API client + domain types + query helpers
    │                       # (listProjects, getProject, listShots,
    │                       #  getShot, approveShot, listJobs)
    ├── store/
    │   └── auth.ts         # Zustand auth store (user, token, login, logout)
    └── screens/
        ├── DashboardScreen.tsx
        ├── RenderQueueScreen.tsx
        ├── NotificationsScreen.tsx
        └── SettingsScreen.tsx
```

## Screens (tabs)

- **Dashboard** – project overview, recent activity
- **Queue** – render queue / job status
- **Notifications** – approval requests, render completions
- **Settings** – account, preferences, logout

## Scripts

```bash
npm start          # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
```

## Configuration

- Bundle ID / package: `com.greencompanies.animaforge`
- Scheme: `animaforge://`
- Theme: dark UI, accent `#7c3aed`, background `#0a0a0f`

## Path Aliases

Import from `src/` using the `@/` alias:

```ts
import { api, listProjects } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
```
