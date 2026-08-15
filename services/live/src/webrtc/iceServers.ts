/**
 * ICE server configuration.
 *
 * STUN alone lets two peers discover their public address and connect directly.
 * That fails when either side is behind symmetric NAT — commonly corporate
 * networks and some mobile carriers — where the only way through is a TURN
 * relay that both peers connect *out* to.
 *
 * Industry measurements put the share of connections needing TURN at roughly
 * 10-20%. Without it those calls do not fail loudly: ICE simply never completes
 * and the user watches a spinner. So when TURN is absent this module says so
 * explicitly, the server forwards that to every client in its `joined` message,
 * and the health endpoint reports it. An unconfigured relay is a known
 * limitation, not a mystery bug.
 */

import type { IceServerConfig } from './messages';

/** Google's public STUN. Fine for dev; no availability guarantee for production. */
const DEFAULT_STUN = ['stun:stun.l.google.com:19302'];

export interface IceConfiguration {
  iceServers: IceServerConfig[];
  turnConfigured: boolean;
  /** Plain-language notes, surfaced to clients and on /health. */
  warnings: string[];
}

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Build the ICE configuration handed to clients.
 *
 * Environment:
 *   WEBRTC_STUN_URLS      comma-separated, defaults to Google's public STUN
 *   WEBRTC_TURN_URLS      comma-separated; enables relay when set
 *   WEBRTC_TURN_USERNAME  required alongside TURN_URLS
 *   WEBRTC_TURN_CREDENTIAL
 */
export function buildIceConfiguration(env: NodeJS.ProcessEnv = process.env): IceConfiguration {
  const warnings: string[] = [];

  const stunUrls = splitList(env.WEBRTC_STUN_URLS);
  const turnUrls = splitList(env.WEBRTC_TURN_URLS);
  const username = env.WEBRTC_TURN_USERNAME?.trim();
  const credential = env.WEBRTC_TURN_CREDENTIAL?.trim();

  const iceServers: IceServerConfig[] = [];

  if (stunUrls.length) {
    iceServers.push({ urls: stunUrls });
  } else {
    iceServers.push({ urls: DEFAULT_STUN });
    warnings.push(
      'WEBRTC_STUN_URLS is not set; using Google public STUN, which carries no ' +
        'availability guarantee. Configure your own STUN for production.',
    );
  }

  let turnConfigured = false;

  if (turnUrls.length) {
    if (username && credential) {
      iceServers.push({ urls: turnUrls, username, credential });
      turnConfigured = true;
    } else {
      // Half-configured TURN is worse than none: the client would advertise a
      // relay it cannot authenticate against, and every candidate would be
      // rejected silently.
      warnings.push(
        'WEBRTC_TURN_URLS is set but WEBRTC_TURN_USERNAME/WEBRTC_TURN_CREDENTIAL ' +
          'are missing, so the TURN relay was NOT offered to clients. Peers behind ' +
          'symmetric NAT will fail to connect.',
      );
    }
  } else {
    warnings.push(
      'No TURN relay configured (WEBRTC_TURN_URLS unset). Peers behind symmetric ' +
        'NAT — typically corporate networks and some mobile carriers — cannot ' +
        'establish a connection. Direct and STUN-assisted connections still work.',
    );
  }

  return { iceServers, turnConfigured, warnings };
}
