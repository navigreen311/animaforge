import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { createServer, Server as HttpServer } from "http";
import { Server, type Socket as ServerSocket } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { socketAuth } from "../middleware/socketAuth";
import { registerJobEvents } from "../handlers/jobEvents";
import { registerCollabEvents } from "../handlers/collabEvents";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types";

const JWT_SECRET = "dev-secret";
const PORT = 0; // let OS pick a free port

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

describe("Realtime WebSocket service", () => {
  let httpServer: HttpServer;
  let ioServer: Server<ClientToServerEvents, ServerToClientEvents>;
  let port: number;

  function connectClient(token: string): ClientSocket {
    return ioClient(`http://localhost:${port}`, {
      query: { token },
      transports: ["websocket"],
      forceNew: true,
    });
  }

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        httpServer = createServer();
        ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(
          httpServer,
          { cors: { origin: "*" } },
        );

        ioServer.use(socketAuth);
        ioServer.on("connection", (socket: ServerSocket) => {
          const s = socket as AuthenticatedSocket;
          s.join(`user:${s.data.user.userId}`);
          registerJobEvents(ioServer, s);
          registerCollabEvents(ioServer, s);
        });

        httpServer.listen(PORT, () => {
          const addr = httpServer.address();
          port = typeof addr === "object" && addr ? addr.port : 0;
          resolve();
        });
      }),
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        ioServer.close();
        httpServer.close(() => resolve());
      }),
  );

  // ── Connection tests ─────────────────────────────────────────────
  it("rejects connections without a token", () =>
    new Promise<void>((resolve, reject) => {
      const client = connectClient("");
      client.on("connect_error", (err) => {
        expect(err.message).toContain("Authentication error");
        client.disconnect();
        resolve();
      });
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("Should not have connected"));
      });
    }));

  it("accepts connections with a valid token", () =>
    new Promise<void>((resolve) => {
      const client = connectClient(makeToken("user-1"));
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
    }));

  // ── Room join test ────────────────────────────────────────────────
  it("joins a project room on collab:join and notifies members", () =>
    new Promise<void>((resolve) => {
      const clientA = connectClient(makeToken("user-a"));
      const clientB = connectClient(makeToken("user-b"));

      let aConnected = false;
      let bConnected = false;

      function afterBothConnected(): void {
        // A joins project first
        clientA.emit("collab:join", { projectId: "proj-1" });

        // B listens for joined notification (from itself joining)
        clientB.on("collab:joined", (data) => {
          expect(data.projectId).toBe("proj-1");
          expect(data.userId).toBe("user-b");
          clientA.disconnect();
          clientB.disconnect();
          resolve();
        });

        // Small delay so A's join completes, then B joins
        setTimeout(() => {
          clientB.emit("collab:join", { projectId: "proj-1" });
        }, 50);
      }

      clientA.on("connect", () => {
        aConnected = true;
        if (bConnected) afterBothConnected();
      });
      clientB.on("connect", () => {
        bConnected = true;
        if (aConnected) afterBothConnected();
      });
    }));

  // ── Job event relay test ──────────────────────────────────────────
  it("broadcasts job:progress to all members of a project room", () =>
    new Promise<void>((resolve) => {
      const sender = connectClient(makeToken("worker-1"));
      const listener = connectClient(makeToken("viewer-1"));

      let sReady = false;
      let lReady = false;

      function afterBothConnected(): void {
        // Both join the same project room
        sender.emit("collab:join", { projectId: "proj-2" });
        listener.emit("collab:join", { projectId: "proj-2" });

        listener.on("job:progress", (data) => {
          expect(data.jobId).toBe("job-99");
          expect(data.progress).toBe(42);
          sender.disconnect();
          listener.disconnect();
          resolve();
        });

        // Give time for room joins to propagate
        setTimeout(() => {
          sender.emit("job:progress", {
            jobId: "job-99",
            projectId: "proj-2",
            progress: 42,
            stage: "rendering",
          });
        }, 100);
      }

      sender.on("connect", () => {
        sReady = true;
        if (lReady) afterBothConnected();
      });
      listener.on("connect", () => {
        lReady = true;
        if (sReady) afterBothConnected();
      });
    }));

  // ── Cursor relay test ─────────────────────────────────────────────
  it("relays collab:cursor to room members except the sender", () =>
    new Promise<void>((resolve) => {
      const sender = connectClient(makeToken("editor-1"));
      const other = connectClient(makeToken("editor-2"));

      let sReady = false;
      let oReady = false;

      function afterBothConnected(): void {
        sender.emit("collab:join", { projectId: "proj-3" });
        other.emit("collab:join", { projectId: "proj-3" });

        // The "other" client should receive the cursor event
        other.on("collab:cursor", (data) => {
          expect(data.x).toBe(100);
          expect(data.y).toBe(200);
          expect(data.userId).toBe("editor-1");
          sender.disconnect();
          other.disconnect();
          resolve();
        });

        // Sender should NOT receive its own cursor event
        sender.on("collab:cursor", () => {
          sender.disconnect();
          other.disconnect();
          throw new Error("Sender should not receive its own cursor");
        });

        setTimeout(() => {
          sender.emit("collab:cursor", {
            projectId: "proj-3",
            userId: "editor-1",
            x: 100,
            y: 200,
          });
        }, 100);
      }

      sender.on("connect", () => {
        sReady = true;
        if (oReady) afterBothConnected();
      });
      other.on("connect", () => {
        oReady = true;
        if (sReady) afterBothConnected();
      });
    }));
});
