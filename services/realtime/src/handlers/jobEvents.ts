import type { Server } from "socket.io";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  JobCompleteEvent,
  JobFailedEvent,
  JobProgressEvent,
  ServerToClientEvents,
} from "../types";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Register job-related event handlers on an authenticated socket.
 *
 * Every job event is broadcast to the project room so all collaborators
 * watching that project receive live updates.
 */
export function registerJobEvents(
  io: AppServer,
  socket: AuthenticatedSocket,
): void {
  socket.on("job:progress", (data: JobProgressEvent) => {
    const room = `project:${data.projectId}`;
    io.to(room).emit("job:progress", data);
  });

  socket.on("job:complete", (data: JobCompleteEvent) => {
    const room = `project:${data.projectId}`;
    io.to(room).emit("job:complete", data);
  });

  socket.on("job:failed", (data: JobFailedEvent) => {
    const room = `project:${data.projectId}`;
    io.to(room).emit("job:failed", data);
  });
}
