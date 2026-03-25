import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { socketAuth } from "./middleware/socketAuth";
import { registerJobEvents } from "./handlers/jobEvents";
import { registerCollabEvents } from "./handlers/collabEvents";
import { registerNotificationEvents } from "./handlers/notificationEvents";
import { presenceService } from "./services/presenceService";
import { roomManager } from "./services/roomManager";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types";

const PORT = Number(process.env.PORT) || 3002;

const app = express();
app.use(cors());
app.use(express.json());

// Health-check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "realtime", timestamp: Date.now() });
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST"],
  },
});

// ── Auth middleware ──────────────────────────────────────────────────
io.use(socketAuth);

// ── Initialize room manager with io instance ────────────────────────
roomManager.init(io);

// ── Connection handler ──────────────────────────────────────────────
io.on("connection", (socket) => {
  const authedSocket = socket as AuthenticatedSocket;
  const { userId } = authedSocket.data.user;

  // Every user automatically joins their own private room
  authedSocket.join(`user:${userId}`);

  // Track presence as online
  presenceService.trackPresence(userId, "online");

  // Set auto-away after 5 minutes of inactivity
  presenceService.setAway(userId, 5 * 60 * 1000);

  console.log(`[realtime] user ${userId} connected (${authedSocket.id})`);

  // Register domain event handlers
  registerJobEvents(io, authedSocket);
  registerCollabEvents(io, authedSocket);
  registerNotificationEvents(io, authedSocket);

  authedSocket.on("disconnect", (reason) => {
    presenceService.trackPresence(userId, "offline");
    console.log(`[realtime] user ${userId} disconnected (${reason})`);
  });
});

// ── Start server ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`[realtime] listening on :${PORT}`);
  });
}

// Exported for testing
export { app, httpServer, io };
