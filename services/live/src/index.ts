import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { liveRouter } from './routes/live';
import { SignalingServer } from './webrtc/signaling';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3015', 10);

app.use(cors());
app.use(express.json());

app.use(liveRouter);

const signaling = new SignalingServer();

app.get('/health', (_req, res) => {
  const stats = signaling.stats();
  res.json({
    status: 'ok',
    service: 'live-runtime',
    timestamp: new Date().toISOString(),
    webrtc: {
      ...stats,
      // Surfaced rather than hidden: without a TURN relay, peers behind
      // symmetric NAT cannot connect, and the failure mode is an ICE timeout
      // that looks like nothing happening at all.
      warnings: signaling.iceWarnings,
    },
  });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/live' });

wss.on('connection', (ws: WebSocket) => {
  // `ws` satisfies SignalingSocket structurally; the server only needs
  // send() and close(), which keeps the protocol testable without a port.
  const socket = {
    send: (data: string) => ws.send(data),
    close: () => ws.close(),
  };

  ws.on('message', (data: Buffer) => {
    signaling.handleMessage(socket, data.toString());
  });

  ws.on('close', () => {
    signaling.handleDisconnect(socket);
  });

  ws.on('error', () => {
    signaling.handleDisconnect(socket);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[Live Runtime] HTTP + WebSocket server running on port ${PORT}`);
  });
}

export { app, server, wss, signaling };
