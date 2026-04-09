import type { Server } from "socket.io";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  ShotUpdatedEvent,
  ShotStatusChangedEvent,
} from "../types";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Register shot-related event handlers on an authenticated socket.
 *
 * - shot:updated        -- a shot was updated (e.g. approved), broadcast to project room
 * - shot:status_changed -- a shot's status changed, broadcast to project room
 */
export function registerShotEvents(
  io: AppServer,
  socket: AuthenticatedSocket,
): void {
  socket.on("shot:updated", (data: ShotUpdatedEvent) => {
    const room = `project:${data.projectId}`;
    io.to(room).emit("shot:updated", data);
  });

  socket.on("shot:status_changed", (data: ShotStatusChangedEvent) => {
    const room = `project:${data.projectId}`;
    io.to(room).emit("shot:status_changed", data);
  });
}
