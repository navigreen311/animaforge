import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { liveRouter } from './routes/live';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3015', 10);

app.use(cors());
app.use(express.json());

app.use(liveRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'live-runtime', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/live' });

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Client connected');

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WS] Received:', message);
      ws.send(JSON.stringify({ type: 'ack', timestamp: Date.now() }));
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });

  ws.send(JSON.stringify({ type: 'connected', message: 'AnimaForge Live Runtime' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[Live Runtime] HTTP + WebSocket server running on port ${PORT}`);
  });
}

export { app, server, wss };
