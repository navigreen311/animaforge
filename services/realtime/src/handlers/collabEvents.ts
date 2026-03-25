import type { Server } from "socket.io";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  CollabCursorEvent,
  CollabEditEvent,
  CollabJoinEvent,
  ServerToClientEvents,
} from "../types";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Register collaboration event handlers on an authenticated socket.
 *
 * - collab:join   -- joins the project room and notifies other members
 * - collab:cursor -- broadcasts cursor position to everyone *except* the sender
 * - collab:edit   -- broadcasts a CRDT delta to the entire room
 */
export function registerCollabEvents(
  io: AppServer,
  socket: AuthenticatedSocket,
): void {
  socket.on("collab:join", (data: CollabJoinEvent) => {
    const room = `project:${data.projectId}`;
    socket.join(room);
    io.to(room).emit("collab:joined", {
      projectId: data.projectId,
      userId: socket.data.user.userId,
    });
  });

  socket.on("collab:cursor", (data: CollabCursorEvent) => {
    const room = `project:${data.projectId}`;
    socket.to(room).emit("collab:cursor", {
      ...data,
      userId: socket.data.user.userId,
    });
  });

  socket.on("collab:edit", (data: CollabEditEvent) => {
    const room = `project:${data.projectId}`;
    socket.to(room).emit("collab:edit", {
      ...data,
      userId: socket.data.user.userId,
    });
  });
}
