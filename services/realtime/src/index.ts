import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { socketAuth } from "./middleware/socketAuth";
import { registerJobEvents } from "./handlers/jobEvents";
import { registerCollabEvents } from "./handlers/collabEvents";
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

// ── Connection handler ──────────────────────────────────────────────
io.on("connection", (socket) => {
  const authedSocket = socket as AuthenticatedSocket;
  const { userId } = authedSocket.data.user;

  // Every user automatically joins their own private room
  authedSocket.join(`user:${userId}`);

  console.log(`[realtime] user ${userId} connected (${authedSocket.id})`);

  // Register domain event handlers
  registerJobEvents(io, authedSocket);
  registerCollabEvents(io, authedSocket);

  authedSocket.on("disconnect", (reason) => {
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
