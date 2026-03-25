import 'dotenv/config';
import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { verifyToken } from './auth.js';
import { initPersistence } from './persistence.js';
import { ShotLockManager } from './shotLocking.js';
import { AwarenessManager } from './awareness.js';

const PORT = parseInt(process.env.COLLAB_PORT || '3012', 10);
const HOST = process.env.COLLAB_HOST || '0.0.0.0';
const docs = new Map<string, Y.Doc>();
export const lockManager = new ShotLockManager();
export const awarenessManager = new AwarenessManager();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'collab', activeDocs: docs.size, activeConnections: awarenessManager.totalConnections(), uptime: process.uptime() }));
    return;
  }
  res.writeHead(404); res.end('Not found');
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const token = url.searchParams.get('token');
  const projectId = url.searchParams.get('projectId');
  if (!projectId) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }
  const user = verifyToken(token);
  if (!user) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => {
    (ws as any).__user = user; (ws as any).__projectId = projectId;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const projectId = url.searchParams.get('projectId')!;
  const user = (ws as any).__user as { userId: string; displayName: string };
  if (!docs.has(projectId)) { const doc = new Y.Doc(); docs.set(projectId, doc); initPersistence(projectId, doc); }
  setupWSConnection(ws as any, request, { docName: projectId, gc: true });
  awarenessManager.addConnection(projectId, user.userId, user.displayName, ws);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'lock-shot') {
        const result = lockManager.lockShot(user.userId, msg.shotId);
        broadcastToRoom(projectId, { type: 'shot-lock-update', shotId: msg.shotId, ...result });
      } else if (msg.type === 'unlock-shot') {
        lockManager.unlockShot(user.userId, msg.shotId);
        broadcastToRoom(projectId, { type: 'shot-lock-update', shotId: msg.shotId, locked: false, lockedBy: null, expiresAt: null });
      } else if (msg.type === 'query-lock') {
        const info = lockManager.isLocked(msg.shotId);
        ws.send(JSON.stringify({ type: 'shot-lock-update', shotId: msg.shotId, ...info }));
      }
    } catch { /* Yjs binary protocol */ }
  });

  ws.on('close', () => {
    awarenessManager.removeConnection(projectId, user.userId);
    lockManager.releaseAllForUser(user.userId);
    broadcastToRoom(projectId, { type: 'locks-released', userId: user.userId });
    const room = awarenessManager.getRoom(projectId);
    if (!room || room.size === 0) docs.delete(projectId);
  });
});

function broadcastToRoom(projectId: string, message: Record<string, unknown>) {
  const room = awarenessManager.getRoom(projectId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const conn of room.values()) { if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(data); }
}

server.listen(PORT, HOST, () => { console.log(`[collab] Yjs server on ${HOST}:${PORT}`); });
export { server, wss, docs };
