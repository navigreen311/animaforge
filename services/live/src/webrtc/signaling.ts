/**
 * WebRTC signalling server.
 *
 * Brokers the SDP/ICE handshake between peers in a live session. Media never
 * passes through here — once the handshake completes, audio and video flow
 * directly between browsers (or through TURN). Relaying frames through Node
 * would put a CPU-bound path in front of every viewer.
 *
 * Transport-agnostic on purpose: it talks to a minimal `SignalingSocket`
 * interface rather than to `ws` directly, so the whole protocol is testable
 * without opening a port.
 */

import { randomUUID } from 'node:crypto';
import { buildIceConfiguration, type IceConfiguration } from './iceServers';
import {
  parseClientMessage,
  type PeerInfo,
  type PeerRole,
  type ServerMessage,
  type SignalingErrorCode,
} from './messages';

/** The slice of a WebSocket this server actually needs. */
export interface SignalingSocket {
  send(data: string): void;
  close(): void;
}

interface Peer {
  id: string;
  role: PeerRole;
  displayName?: string;
  sessionId: string;
  socket: SignalingSocket;
}

export interface SignalingServerOptions {
  /**
   * Cap on peers per session. A mesh of N peers needs N*(N-1) connections, so
   * this is a real ceiling, not a formality — beyond a handful of publishers an
   * SFU is required.
   */
  maxPeersPerSession?: number;
  env?: NodeJS.ProcessEnv;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface SessionSnapshot {
  sessionId: string;
  peers: PeerInfo[];
}

const DEFAULT_MAX_PEERS = 16;

export class SignalingServer {
  private readonly peers = new Map<string, Peer>();
  private readonly sessions = new Map<string, Set<string>>();
  private readonly socketToPeer = new Map<SignalingSocket, string>();
  private readonly ice: IceConfiguration;
  private readonly maxPeersPerSession: number;
  private readonly log: Pick<Console, 'info' | 'warn' | 'error'>;

  constructor(options: SignalingServerOptions = {}) {
    this.ice = buildIceConfiguration(options.env);
    this.maxPeersPerSession = options.maxPeersPerSession ?? DEFAULT_MAX_PEERS;
    this.log = options.logger ?? console;

    // Announced once at construction rather than per-connection: an operator
    // should learn about a missing TURN relay from the startup log, not from a
    // user reporting that video "sometimes doesn't work".
    for (const warning of this.ice.warnings) {
      this.log.warn(`[webrtc] ${warning}`);
    }
  }

  /** True when a TURN relay is configured and will be offered to clients. */
  get turnConfigured(): boolean {
    return this.ice.turnConfigured;
  }

  get iceWarnings(): readonly string[] {
    return this.ice.warnings;
  }

  /** Handle one frame from a socket. */
  handleMessage(socket: SignalingSocket, raw: string): void {
    const parsed = parseClientMessage(raw);
    if (!parsed.ok || !parsed.message) {
      this.sendError(socket, 'invalid_message', parsed.error ?? 'invalid message');
      return;
    }

    const message = parsed.message;

    switch (message.type) {
      case 'join':
        this.handleJoin(socket, message.sessionId, message.role, message.displayName);
        return;
      case 'leave':
        this.handleDisconnect(socket);
        return;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.relay(socket, message);
        return;
    }
  }

  private handleJoin(
    socket: SignalingSocket,
    sessionId: string,
    role: PeerRole,
    displayName?: string,
  ): void {
    if (this.socketToPeer.has(socket)) {
      this.sendError(socket, 'already_joined', 'This connection has already joined a session');
      return;
    }

    const existing = this.sessions.get(sessionId) ?? new Set<string>();
    if (existing.size >= this.maxPeersPerSession) {
      this.sendError(
        socket,
        'session_full',
        `Session already has ${existing.size} peers (max ${this.maxPeersPerSession}). ` +
          'A mesh beyond this size needs an SFU.',
      );
      socket.close();
      return;
    }

    const peerId = randomUUID();
    const peer: Peer = { id: peerId, role, displayName, sessionId, socket };

    this.peers.set(peerId, peer);
    this.socketToPeer.set(socket, peerId);
    existing.add(peerId);
    this.sessions.set(sessionId, existing);

    // The joiner learns who is already here and initiates offers to them. The
    // existing peers only wait — that avoids glare, where both sides offer
    // simultaneously and the negotiation has to be rolled back.
    const peers = [...existing]
      .filter((id) => id !== peerId)
      .map((id) => this.toPeerInfo(this.peers.get(id)!));

    this.send(socket, {
      type: 'joined',
      peerId,
      sessionId,
      peers,
      iceServers: this.ice.iceServers,
      turnConfigured: this.ice.turnConfigured,
      warnings: [...this.ice.warnings],
    });

    this.broadcast(sessionId, { type: 'peer-joined', peer: this.toPeerInfo(peer) }, peerId);
  }

  private relay(
    socket: SignalingSocket,
    message:
      | { type: 'offer'; to: string; description: unknown }
      | { type: 'answer'; to: string; description: unknown }
      | { type: 'ice-candidate'; to: string; candidate: unknown },
  ): void {
    const senderId = this.socketToPeer.get(socket);
    if (!senderId) {
      this.sendError(socket, 'not_joined', 'Join a session before signalling');
      return;
    }

    const sender = this.peers.get(senderId)!;
    const target = this.peers.get(message.to);

    if (!target) {
      this.sendError(socket, 'unknown_peer', `No peer with id ${message.to}`);
      return;
    }

    // Without this check any peer could inject SDP into a session it never
    // joined, which is enough to hijack or break someone else's stream.
    if (target.sessionId !== sender.sessionId) {
      this.sendError(socket, 'peer_not_in_session', 'Target peer is in a different session');
      return;
    }

    if (message.type === 'ice-candidate') {
      this.send(target.socket, {
        type: 'ice-candidate',
        from: senderId,
        candidate: message.candidate as never,
      });
      return;
    }

    this.send(target.socket, {
      type: message.type,
      from: senderId,
      description: message.description as never,
    });
  }

  /** Clean up a socket, whether it left politely or the connection dropped. */
  handleDisconnect(socket: SignalingSocket): void {
    const peerId = this.socketToPeer.get(socket);
    if (!peerId) return;

    const peer = this.peers.get(peerId);
    this.socketToPeer.delete(socket);
    this.peers.delete(peerId);

    if (!peer) return;

    const session = this.sessions.get(peer.sessionId);
    if (session) {
      session.delete(peerId);
      if (session.size === 0) {
        // Drop empty sessions so the map does not grow for the process lifetime.
        this.sessions.delete(peer.sessionId);
      }
    }

    this.broadcast(peer.sessionId, { type: 'peer-left', peerId });
  }

  /* -- introspection ------------------------------------------------------- */

  sessionSnapshot(sessionId: string): SessionSnapshot | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      sessionId,
      peers: [...session].map((id) => this.toPeerInfo(this.peers.get(id)!)),
    };
  }

  stats(): { sessions: number; peers: number; turnConfigured: boolean } {
    return {
      sessions: this.sessions.size,
      peers: this.peers.size,
      turnConfigured: this.ice.turnConfigured,
    };
  }

  /* -- helpers ------------------------------------------------------------- */

  private toPeerInfo(peer: Peer): PeerInfo {
    return { peerId: peer.id, role: peer.role, displayName: peer.displayName };
  }

  private broadcast(sessionId: string, message: ServerMessage, exceptPeerId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const id of session) {
      if (id === exceptPeerId) continue;
      const peer = this.peers.get(id);
      if (peer) this.send(peer.socket, message);
    }
  }

  private send(socket: SignalingSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      // A send failing means the socket is already gone. Do not let that
      // propagate into a broadcast loop and stop the remaining peers from
      // being notified.
      this.log.warn(
        '[webrtc] failed to send to peer:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private sendError(socket: SignalingSocket, code: SignalingErrorCode, message: string): void {
    this.send(socket, { type: 'error', code, message });
  }
}
