import type { Server } from "socket.io";

/**
 * Emit an event to a specific user's private room.
 *
 * Each connected user auto-joins `user:<userId>` on connection,
 * so this targets all of that user's active sockets.
 */
export function emitToUser(
  io: Server,
  userId: string,
  event: string,
  data: unknown,
): void {
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to every socket in a project room.
 *
 * Sockets join `project:<projectId>` via `collab:join` or equivalent.
 */
export function emitToProject(
  io: Server,
  projectId: string,
  event: string,
  data: unknown,
): void {
  io.to(`project:${projectId}`).emit(event, data);
}

/**
 * Emit an event to every socket in an organisation room.
 *
 * Sockets should join `org:<orgId>` during their connection handshake
 * or via a dedicated event handler when org context is established.
 */
export function emitToOrg(
  io: Server,
  orgId: string,
  event: string,
  data: unknown,
): void {
  io.to(`org:${orgId}`).emit(event, data);
}
