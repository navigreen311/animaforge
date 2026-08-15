/**
 * y-websocket ships `bin/utils` as plain CommonJS with no bundled types, so
 * importing it fails under `noImplicitAny`. This declares the one function the
 * collab server uses.
 *
 * Kept deliberately narrow: a blanket `declare module 'y-websocket/bin/utils'`
 * would silence every future import from that path too.
 */
declare module 'y-websocket/bin/utils' {
  import type { WebSocket } from 'ws';
  import type { IncomingMessage } from 'node:http';

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean },
  ): void;
}
