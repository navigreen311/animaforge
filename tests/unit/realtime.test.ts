import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { createServer, Server as HttpServer } from 'http';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { socketAuth } from '../../services/realtime/src/middleware/socketAuth';
import { registerJobEvents } from '../../services/realtime/src/handlers/jobEvents';
import { registerCollabEvents } from '../../services/realtime/src/handlers/collabEvents';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../services/realtime/src/types';

const JWT_SECRET = 'dev-secret';
const PORT = 0;

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Realtime WebSocket Service', () => {
  let httpServer: HttpServer;
  let ioServer: Server<ClientToServerEvents, ServerToClientEvents>;
  let port: number;

  function connectClient(token: string): ClientSocket {
    return ioClient(`http://localhost:${port}`, {
      query: { token },
      transports: ['websocket'],
      forceNew: true,
    });
  }

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        httpServer = createServer();
        ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
          cors: { origin: '*' },
        });

        ioServer.use(socketAuth);
        ioServer.on('connection', (socket: ServerSocket) => {
          const s = socket as AuthenticatedSocket;
          s.join(`user:${s.data.user.userId}`);
          registerJobEvents(ioServer, s);
          registerCollabEvents(ioServer, s);
        });

        httpServer.listen(PORT, () => {
          const addr = httpServer.address();
          port = typeof addr === 'object' && addr ? addr.port : 0;
          resolve();
        });
      }),
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        ioServer.close();
        httpServer.close(() => resolve());
      }),
  );

  // ── 1. Connection auth ──────────────────────────────────────────────
  it('rejects connections without a token', () =>
    new Promise<void>((resolve, reject) => {
      const client = connectClient('');
      client.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication error');
        client.disconnect();
        resolve();
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Should not have connected'));
      });
    }));

  it('accepts connections with a valid token', () =>
    new Promise<void>((resolve) => {
      const client = connectClient(makeToken('user-rt-1'));
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
    }));

  // ── 2. Room join / leave ────────────────────────────────────────────
  it('joins a project room and notifies members', () =>
    new Promise<void>((resolve) => {
      const clientA = connectClient(makeToken('user-rt-a'));
      const clientB = connectClient(makeToken('user-rt-b'));
      let aReady = false;
      let bReady = false;

      function afterBoth(): void {
        clientA.emit('collab:join', { projectId: 'proj-rt-1' });
        clientB.on('collab:joined', (data) => {
          expect(data.projectId).toBe('proj-rt-1');
          expect(data.userId).toBe('user-rt-b');
          clientA.disconnect();
          clientB.disconnect();
          resolve();
        });
        setTimeout(() => clientB.emit('collab:join', { projectId: 'proj-rt-1' }), 50);
      }

      clientA.on('connect', () => { aReady = true; if (bReady) afterBoth(); });
      clientB.on('connect', () => { bReady = true; if (aReady) afterBoth(); });
    }));

  // ── 3. Job progress broadcast ───────────────────────────────────────
  it('broadcasts job:progress to project room members', () =>
    new Promise<void>((resolve) => {
      const sender = connectClient(makeToken('worker-rt'));
      const listener = connectClient(makeToken('viewer-rt'));
      let sReady = false;
      let lReady = false;

      function afterBoth(): void {
        sender.emit('collab:join', { projectId: 'proj-rt-2' });
        listener.emit('collab:join', { projectId: 'proj-rt-2' });
        listener.on('job:progress', (data) => {
          expect(data.jobId).toBe('job-rt-1');
          expect(data.progress).toBe(55);
          sender.disconnect();
          listener.disconnect();
          resolve();
        });
        setTimeout(() => {
          sender.emit('job:progress', {
            jobId: 'job-rt-1',
            projectId: 'proj-rt-2',
            progress: 55,
            stage: 'encoding',
          });
        }, 100);
      }

      sender.on('connect', () => { sReady = true; if (lReady) afterBoth(); });
      listener.on('connect', () => { lReady = true; if (sReady) afterBoth(); });
    }));

  // ── 4. Collab cursor relay ──────────────────────────────────────────
  it('relays collab:cursor to room members except sender', () =>
    new Promise<void>((resolve) => {
      const sender = connectClient(makeToken('editor-rt-1'));
      const other = connectClient(makeToken('editor-rt-2'));
      let sReady = false;
      let oReady = false;

      function afterBoth(): void {
        sender.emit('collab:join', { projectId: 'proj-rt-3' });
        other.emit('collab:join', { projectId: 'proj-rt-3' });

        other.on('collab:cursor', (data) => {
          expect(data.x).toBe(42);
          expect(data.y).toBe(84);
          expect(data.userId).toBe('editor-rt-1');
          sender.disconnect();
          other.disconnect();
          resolve();
        });

        sender.on('collab:cursor', () => {
          sender.disconnect();
          other.disconnect();
          throw new Error('Sender should not receive its own cursor');
        });

        setTimeout(() => {
          sender.emit('collab:cursor', {
            projectId: 'proj-rt-3',
            userId: 'editor-rt-1',
            x: 42,
            y: 84,
          });
        }, 100);
      }

      sender.on('connect', () => { sReady = true; if (oReady) afterBoth(); });
      other.on('connect', () => { oReady = true; if (sReady) afterBoth(); });
    }));

  // ── 5. Presence tracking ────────────────────────────────────────────
  it('tracks connected users via server rooms', () =>
    new Promise<void>((resolve) => {
      const client = connectClient(makeToken('presence-user'));
      client.on('connect', () => {
        client.emit('collab:join', { projectId: 'proj-rt-presence' });
        setTimeout(() => {
          const room = ioServer.sockets.adapter.rooms.get('project:proj-rt-presence');
          expect(room).toBeDefined();
          expect(room!.size).toBeGreaterThanOrEqual(1);
          client.disconnect();
          resolve();
        }, 80);
      });
    }));

  // ── 6. Typing indicator (collab:edit relay) ─────────────────────────
  it('relays collab:edit events to the project room', () =>
    new Promise<void>((resolve) => {
      const sender = connectClient(makeToken('typer-1'));
      const receiver = connectClient(makeToken('typer-2'));
      let sReady = false;
      let rReady = false;

      function afterBoth(): void {
        sender.emit('collab:join', { projectId: 'proj-rt-type' });
        receiver.emit('collab:join', { projectId: 'proj-rt-type' });

        receiver.on('collab:edit', (data) => {
          expect(data.userId).toBe('typer-1');
          expect(data.delta).toBeDefined();
          sender.disconnect();
          receiver.disconnect();
          resolve();
        });

        setTimeout(() => {
          sender.emit('collab:edit', {
            projectId: 'proj-rt-type',
            userId: 'typer-1',
            delta: { text: 'hello' },
            timestamp: Date.now(),
          });
        }, 100);
      }

      sender.on('connect', () => { sReady = true; if (rReady) afterBoth(); });
      receiver.on('connect', () => { rReady = true; if (sReady) afterBoth(); });
    }));

  // ── 7. Room member list ─────────────────────────────────────────────
  it('associates each socket with its user room', () =>
    new Promise<void>((resolve) => {
      const client = connectClient(makeToken('member-list-user'));
      client.on('connect', () => {
        setTimeout(() => {
          const userRoom = ioServer.sockets.adapter.rooms.get('user:member-list-user');
          expect(userRoom).toBeDefined();
          expect(userRoom!.size).toBe(1);
          client.disconnect();
          resolve();
        }, 50);
      });
    }));

  // ── 8. Disconnect cleanup ───────────────────────────────────────────
  it('cleans up user room on disconnect', () =>
    new Promise<void>((resolve) => {
      const client = connectClient(makeToken('cleanup-user'));
      client.on('connect', () => {
        client.disconnect();
        setTimeout(() => {
          const userRoom = ioServer.sockets.adapter.rooms.get('user:cleanup-user');
          expect(userRoom?.size ?? 0).toBe(0);
          resolve();
        }, 200);
      });
    }));
});
