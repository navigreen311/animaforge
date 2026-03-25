import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types";
import { presenceService } from "./presenceService";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface RoomMember {
  userId: string;
  joinedAt: Date;
}

export interface RoomInfo {
  projectId: string;
  members: RoomMember[];
  createdAt: Date;
}

// ── Room Manager ─────────────────────────────────────────────────────
class RoomManager {
  /** projectId → room info */
  private rooms: Map<string, RoomInfo> = new Map();
  private io: AppServer | null = null;

  /** Bind the Socket.IO server instance (call once at startup). */
  init(io: AppServer): void {
    this.io = io;
  }

  // ── Room lifecycle ─────────────────────────────────────────────
  createRoom(projectId: string): RoomInfo {
    if (this.rooms.has(projectId)) {
      return this.rooms.get(projectId)!;
    }
    const room: RoomInfo = {
      projectId,
      members: [],
      createdAt: new Date(),
    };
    this.rooms.set(projectId, room);
    console.log(`[rooms] created room for project ${projectId}`);
    return room;
  }

  joinRoom(userId: string, projectId: string): RoomInfo {
    const room = this.createRoom(projectId); // ensure room exists
    const alreadyIn = room.members.some((m) => m.userId === userId);
    if (!alreadyIn) {
      room.members.push({ userId, joinedAt: new Date() });
    }

    // Update presence context
    presenceService.trackPresence(userId, "online", projectId);

    // Join the Socket.IO room for the user's sockets
    if (this.io) {
      const socketRoom = `project:${projectId}`;
      const sockets = this.io.sockets.sockets;
      for (const [, socket] of sockets) {
        if ((socket as any).data?.user?.userId === userId) {
          socket.join(socketRoom);
        }
      }
    }

    return room;
  }

  leaveRoom(userId: string, projectId: string): boolean {
    const room = this.rooms.get(projectId);
    if (!room) return false;

    const idx = room.members.findIndex((m) => m.userId === userId);
    if (idx === -1) return false;

    room.members.splice(idx, 1);

    // Leave Socket.IO room
    if (this.io) {
      const socketRoom = `project:${projectId}`;
      const sockets = this.io.sockets.sockets;
      for (const [, socket] of sockets) {
        if ((socket as any).data?.user?.userId === userId) {
          socket.leave(socketRoom);
        }
      }
    }

    // Clean up empty rooms
    if (room.members.length === 0) {
      this.rooms.delete(projectId);
      console.log(`[rooms] removed empty room for project ${projectId}`);
    }

    return true;
  }

  // ── Queries ────────────────────────────────────────────────────
  getRoomMembers(projectId: string): (RoomMember & { presence: string })[] {
    const room = this.rooms.get(projectId);
    if (!room) return [];

    return room.members.map((m) => {
      const p = presenceService.getPresence(m.userId);
      return {
        ...m,
        presence: p?.status ?? "offline",
      };
    });
  }

  getRoom(projectId: string): RoomInfo | undefined {
    return this.rooms.get(projectId);
  }

  getAllRooms(): RoomInfo[] {
    return [...this.rooms.values()];
  }

  // ── Broadcast ──────────────────────────────────────────────────
  broadcastToRoom(projectId: string, event: string, data: unknown): boolean {
    if (!this.io) return false;
    const socketRoom = `project:${projectId}`;
    this.io.to(socketRoom).emit(event as any, data);
    return true;
  }
}

// ── Singleton ────────────────────────────────────────────────────────
export const roomManager = new RoomManager();
