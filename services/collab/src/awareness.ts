import type { WebSocket } from 'ws';

export interface AwarenessState {
  userId: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedShot: string | null;
  ws: WebSocket;
}

const USER_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#3b82f6', '#f97316'];
let colorIndex = 0;
function nextColor(): string { const c = USER_COLORS[colorIndex % USER_COLORS.length]; colorIndex++; return c; }

export class AwarenessManager {
  private rooms = new Map<string, Map<string, AwarenessState>>();

  addConnection(projectId: string, userId: string, displayName: string, ws: WebSocket): void {
    if (!this.rooms.has(projectId)) this.rooms.set(projectId, new Map());
    this.rooms.get(projectId)!.set(userId, { userId, displayName, color: nextColor(), cursor: null, selectedShot: null, ws });
    this.broadcastAwareness(projectId);
  }

  removeConnection(projectId: string, userId: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    room.delete(userId);
    if (room.size === 0) this.rooms.delete(projectId); else this.broadcastAwareness(projectId);
  }

  updateCursor(projectId: string, userId: string, cursor: { x: number; y: number } | null): void {
    const s = this.rooms.get(projectId)?.get(userId); if (!s) return; s.cursor = cursor; this.broadcastAwareness(projectId);
  }

  updateSelectedShot(projectId: string, userId: string, shotId: string | null): void {
    const s = this.rooms.get(projectId)?.get(userId); if (!s) return; s.selectedShot = shotId; this.broadcastAwareness(projectId);
  }

  getRoom(projectId: string): Map<string, AwarenessState> | undefined { return this.rooms.get(projectId); }

  totalConnections(): number { let c = 0; for (const r of this.rooms.values()) c += r.size; return c; }

  private broadcastAwareness(projectId: string): void {
    const room = this.rooms.get(projectId); if (!room) return;
    const users = Array.from(room.values()).map(({ ws, ...rest }) => rest);
    const msg = JSON.stringify({ type: 'awareness-update', users });
    for (const conn of room.values()) { if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg); }
  }
}
