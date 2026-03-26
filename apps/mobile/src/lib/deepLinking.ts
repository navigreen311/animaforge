import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeepLinkRoute {
  screen: string;
  params?: Record<string, string>;
}

export type DeepLinkType = 'project' | 'shot' | 'verify' | 'invite';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URL_SCHEME = 'animaforge://';
const UNIVERSAL_LINK_PREFIX = 'https://animaforge.com';

export const DEEP_LINK_ROUTES: Record<DeepLinkType, string> = {
  project: 'ProjectDetail',
  shot: 'ShotDetail',
  verify: 'Verify',
  invite: 'AcceptInvite',
} as const;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let navigationRef: NavigationContainerRef<any> | null = null;
let linkingSubscription: ReturnType<typeof Linking.addEventListener> | null = null;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Normalise both custom-scheme and universal URLs into a path string.
 */
function normalisePath(url: string): string | null {
  if (url.startsWith(URL_SCHEME)) {
    return url.slice(URL_SCHEME.length);
  }
  if (url.startsWith(UNIVERSAL_LINK_PREFIX)) {
    return url.slice(UNIVERSAL_LINK_PREFIX.length).replace(/^\//, '');
  }
  return null;
}

/**
 * Parse a deep-link URL into the target screen + params.
 *
 * Supported patterns:
 *   animaforge://project/{id}
 *   animaforge://shot/{id}
 *   animaforge://verify/{outputId}
 *   animaforge://invite/{token}
 */
function parseDeepLink(url: string): DeepLinkRoute | null {
  const path = normalisePath(url);
  if (!path) return null;

  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [type, id] = segments as [string, string];

  switch (type) {
    case 'project':
      return { screen: DEEP_LINK_ROUTES.project, params: { projectId: id } };
    case 'shot':
      return { screen: DEEP_LINK_ROUTES.shot, params: { shotId: id } };
    case 'verify':
      return { screen: DEEP_LINK_ROUTES.verify, params: { outputId: id } };
    case 'invite':
      return { screen: DEEP_LINK_ROUTES.invite, params: { token: id } };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

function navigateToRoute(route: DeepLinkRoute): void {
  if (!navigationRef?.isReady()) {
    setTimeout(() => {
      if (navigationRef?.isReady()) {
        navigationRef.navigate(route.screen as never, route.params as never);
      }
    }, 500);
    return;
  }
  navigationRef.navigate(route.screen as never, route.params as never);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handle an incoming deep-link URL by parsing it and navigating to the
 * appropriate screen.
 */
export function handleDeepLink(url: string): void {
  const route = parseDeepLink(url);
  if (route) {
    navigateToRoute(route);
  }
}

/**
 * Register the animaforge:// custom URL scheme and universal link handler.
 * Call once at app startup, passing the React Navigation ref.
 */
export function configureDeepLinks(
  navRef: NavigationContainerRef<any>,
): void {
  navigationRef = navRef;

  // Handle links that open the app from a cold start.
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  // Handle links while the app is already running.
  linkingSubscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });
}

/**
 * Remove the deep-link listener. Call on unmount if needed.
 */
export function removeDeepLinkListener(): void {
  linkingSubscription?.remove();
  linkingSubscription = null;
}

/**
 * Build a shareable deep-link URL for a given resource.
 *
 * @param type - The resource type (project | shot | verify | invite).
 * @param id  - The resource identifier.
 * @returns   A universal link string (HTTPS) suitable for sharing.
 */
export function generateShareLink(type: DeepLinkType, id: string): string {
  return `${UNIVERSAL_LINK_PREFIX}/${type}/${encodeURIComponent(id)}`;
}

/**
 * React Navigation linking configuration object.
 * Pass this to <NavigationContainer linking={deepLinkingConfig}>.
 */
export const deepLinkingConfig = {
  prefixes: [URL_SCHEME, UNIVERSAL_LINK_PREFIX],
  config: {
    screens: {
      Main: {
        screens: {
          Projects: {
            screens: {
              ProjectDetail: 'project/:projectId',
              ShotDetail: 'shot/:shotId',
            },
          },
        },
      },
      Verify: 'verify/:outputId',
      AcceptInvite: 'invite/:token',
    },
  },
};
