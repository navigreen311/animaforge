import type { Server } from "socket.io";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Register notification-related event handlers on an authenticated socket.
 *
 * - render:notify     – push a notification to a specific user room
 * - system:broadcast  – broadcast a message to every connected client
 * - user:typing       – relay typing indicator within a project collab room
 */
export function registerNotificationEvents(
  io: AppServer,
  socket: AuthenticatedSocket,
): void {
  // ── render:notify ──────────────────────────────────────────────
  socket.on("render:notify" as any, (data: { userId: string; message: string; payload?: Record<string, unknown> }) => {
    const room = `user:${data.userId}`;
    io.to(room).emit("render:notify" as any, {
      from: socket.data.user.userId,
      message: data.message,
      payload: data.payload ?? {},
      timestamp: Date.now(),
    });
  });

  // ── system:broadcast ───────────────────────────────────────────
  socket.on("system:broadcast" as any, (data: { message: string; level?: "info" | "warning" | "critical" }) => {
    io.emit("system:broadcast" as any, {
      from: socket.data.user.userId,
      message: data.message,
      level: data.level ?? "info",
      timestamp: Date.now(),
    });
  });

  // ── user:typing ────────────────────────────────────────────────
  socket.on("user:typing" as any, (data: { projectId: string; isTyping: boolean }) => {
    const room = `project:${data.projectId}`;
    socket.to(room).emit("user:typing" as any, {
      userId: socket.data.user.userId,
      projectId: data.projectId,
      isTyping: data.isTyping,
      timestamp: Date.now(),
    });
  });
}
