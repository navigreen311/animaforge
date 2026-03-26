/**
 * Integration tests — Realtime (WebSocket) API
 *
 * Tests the Socket.IO realtime service covering connection, room joining,
 * job progress broadcasts, collaboration cursor relay, disconnect cleanup,
 * and authentication enforcement.
 */
import { describe, it, expect, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

let httpServer: any;
let serverPort: number;
const activeSockets: ClientSocket[] = [];

function makeToken(userId: string): string {
  return jwt.sign({ userId, email: 'test@test.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

function connectClient(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${serverPort}`, {
      query: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    activeSockets.push(socket);

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));

    // Timeout after 5 seconds
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

// Start the HTTP server on a random port before tests
async function ensureServer(): Promise<void> {
  if (httpServer) return;
  const mod = await import('../../services/realtime/src/index');
  httpServer = mod.httpServer;
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      serverPort = (httpServer.address() as any).port;
      resolve();
    });
  });
}

// Disconnect all clients after each test
afterEach(() => {
  while (activeSockets.length > 0) {
    const socket = activeSockets.pop();
    if (socket?.connected) socket.disconnect();
  }
});

describe('Realtime WebSocket API', () => {
  // 1. Connect WebSocket -> connected
  it('should connect a client with a valid token', async () => {
    await ensureServer();
    const userId = uuidv4();
    const token = makeToken(userId);

    const socket = await connectClient(token);

    expect(socket.connected).toBe(true);
  });

  // 2. Join project room -> receive join event
  it('should emit collab:joined when a client joins a project room', async () => {
    await ensureServer();
    const userId = uuidv4();
    const projectId = uuidv4();
    const token = makeToken(userId);

    const socket = await connectClient(token);

    const joinEvent = await new Promise<any>((resolve) => {
      socket.on('collab:joined', (data) => resolve(data));
      socket.emit('collab:join', { projectId });
    });

    expect(joinEvent.projectId).toBe(projectId);
    expect(joinEvent.userId).toBe(userId);
  });

  // 3. Job progress -> broadcast received
  it('should broadcast job:progress to clients in the project room', async () => {
    await ensureServer();
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const projectId = uuidv4();

    const socket1 = await connectClient(makeToken(user1Id));
    const socket2 = await connectClient(makeToken(user2Id));

    // Both join the same project room
    await new Promise<void>((resolve) => {
      socket1.on('collab:joined', () => resolve());
      socket1.emit('collab:join', { projectId });
    });
    await new Promise<void>((resolve) => {
      socket2.on('collab:joined', () => resolve());
      socket2.emit('collab:join', { projectId });
    });

    // socket1 sends a job:progress event
    const progressData = {
      jobId: uuidv4(),
      projectId,
      progress: 42,
      stage: 'rendering',
      message: 'Frame 42 of 100',
    };

    const received = await new Promise<any>((resolve) => {
      socket2.on('job:progress', (data) => resolve(data));
      socket1.emit('job:progress', progressData);
    });

    expect(received.jobId).toBe(progressData.jobId);
    expect(received.progress).toBe(42);
    expect(received.stage).toBe('rendering');
  });

  // 4. Collab cursor -> relayed to other clients
  it('should relay collab:cursor to other clients in the room', async () => {
    await ensureServer();
    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const projectId = uuidv4();

    const socket1 = await connectClient(makeToken(user1Id));
    const socket2 = await connectClient(makeToken(user2Id));

    // Both join the project
    await new Promise<void>((resolve) => {
      socket1.on('collab:joined', () => resolve());
      socket1.emit('collab:join', { projectId });
    });
    await new Promise<void>((resolve) => {
      socket2.on('collab:joined', () => resolve());
      socket2.emit('collab:join', { projectId });
    });

    // socket1 moves cursor
    const cursorData = {
      projectId,
      userId: user1Id,
      x: 150,
      y: 300,
      label: 'cursor-1',
    };

    const received = await new Promise<any>((resolve) => {
      socket2.on('collab:cursor', (data) => resolve(data));
      socket1.emit('collab:cursor', cursorData);
    });

    expect(received.x).toBe(150);
    expect(received.y).toBe(300);
    expect(received.userId).toBe(user1Id);
    expect(received.projectId).toBe(projectId);
  });

  // 5. Disconnect -> cleanup
  it('should handle client disconnect gracefully', async () => {
    await ensureServer();
    const userId = uuidv4();
    const token = makeToken(userId);

    const socket = await connectClient(token);
    expect(socket.connected).toBe(true);

    // Disconnect and verify
    const disconnected = new Promise<void>((resolve) => {
      socket.on('disconnect', () => resolve());
    });

    socket.disconnect();
    await disconnected;

    expect(socket.connected).toBe(false);
  });

  // 6. Auth required -> reject without token
  it('should reject connection without a token', async () => {
    await ensureServer();

    const socket = ioClient(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    activeSockets.push(socket);

    const error = await new Promise<Error>((resolve) => {
      socket.on('connect_error', (err) => resolve(err));
      // Timeout fallback
      setTimeout(() => resolve(new Error('Expected rejection')), 5000);
    });

    expect(error.message).toContain('Authentication error');
    expect(socket.connected).toBe(false);
  });
});
