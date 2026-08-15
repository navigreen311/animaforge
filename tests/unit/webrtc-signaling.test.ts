import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalingServer, type SignalingSocket } from '../../services/live/src/webrtc/signaling';
import { buildIceConfiguration } from '../../services/live/src/webrtc/iceServers';
import { parseClientMessage } from '../../services/live/src/webrtc/messages';

/** A socket that records what the server sent it. */
class FakeSocket implements SignalingSocket {
  readonly sent: any[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.closed = true;
  }

  lastOfType(type: string): any {
    return [...this.sent].reverse().find((m) => m.type === type);
  }

  typesSeen(): string[] {
    return this.sent.map((m) => m.type);
  }
}

const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function join(
  server: SignalingServer,
  socket: SignalingSocket,
  sessionId: string,
  role: 'broadcaster' | 'viewer',
  displayName?: string,
) {
  server.handleMessage(socket, JSON.stringify({ type: 'join', sessionId, role, displayName }));
}

describe('message parsing', () => {
  it('rejects non-JSON', () => {
    const result = parseClientMessage('not json at all');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not valid JSON/);
  });

  it('rejects an unknown message type', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'hack' })).ok).toBe(false);
  });

  it('rejects an offer with no target', () => {
    const result = parseClientMessage(
      JSON.stringify({ type: 'offer', description: { type: 'offer', sdp: 'v=0' } }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects oversized SDP', () => {
    const result = parseClientMessage(
      JSON.stringify({
        type: 'offer',
        to: 'peer-1',
        description: { type: 'offer', sdp: 'x'.repeat(70_000) },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('accepts a well-formed offer', () => {
    const result = parseClientMessage(
      JSON.stringify({
        type: 'offer',
        to: 'peer-1',
        description: { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n' },
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.message?.type).toBe('offer');
  });
});

describe('ICE configuration', () => {
  it('warns when no TURN relay is configured', () => {
    const config = buildIceConfiguration({});
    expect(config.turnConfigured).toBe(false);
    expect(config.warnings.join(' ')).toMatch(/symmetric NAT/);
  });

  it('offers TURN when fully configured', () => {
    const config = buildIceConfiguration({
      WEBRTC_TURN_URLS: 'turn:relay.example:3478',
      WEBRTC_TURN_USERNAME: 'user',
      WEBRTC_TURN_CREDENTIAL: 'secret',
    });
    expect(config.turnConfigured).toBe(true);
    expect(config.iceServers.some((s) => s.urls.includes('turn:relay.example:3478'))).toBe(true);
  });

  it('refuses half-configured TURN rather than advertising an unusable relay', () => {
    const config = buildIceConfiguration({
      WEBRTC_TURN_URLS: 'turn:relay.example:3478',
      // username/credential missing
    });
    expect(config.turnConfigured).toBe(false);
    expect(config.iceServers.some((s) => s.urls.includes('turn:relay.example:3478'))).toBe(false);
    expect(config.warnings.join(' ')).toMatch(/NOT offered/);
  });

  it('warns when falling back to public STUN', () => {
    const config = buildIceConfiguration({});
    expect(config.warnings.join(' ')).toMatch(/Google public STUN/);
  });
});

describe('SignalingServer', () => {
  let server: SignalingServer;

  beforeEach(() => {
    server = new SignalingServer({ env: {}, logger: silentLogger });
  });

  it('assigns a peer id and reports ICE config on join', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'broadcaster');

    const joined = socket.lastOfType('joined');
    expect(joined.peerId).toMatch(/[0-9a-f-]{36}/);
    expect(joined.sessionId).toBe('session-1');
    expect(joined.peers).toEqual([]);
    expect(joined.iceServers.length).toBeGreaterThan(0);
  });

  it('tells the joining client that TURN is missing', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'viewer');

    const joined = socket.lastOfType('joined');
    expect(joined.turnConfigured).toBe(false);
    expect(joined.warnings.join(' ')).toMatch(/symmetric NAT/);
  });

  it('gives the joiner the existing peers and notifies those already present', () => {
    const first = new FakeSocket();
    const second = new FakeSocket();

    join(server, first, 'session-1', 'broadcaster', 'Ada');
    join(server, second, 'session-1', 'viewer', 'Grace');

    // The newcomer learns who is already here, and so initiates the offers.
    const joined = second.lastOfType('joined');
    expect(joined.peers).toHaveLength(1);
    expect(joined.peers[0].role).toBe('broadcaster');
    expect(joined.peers[0].displayName).toBe('Ada');

    const notified = first.lastOfType('peer-joined');
    expect(notified.peer.role).toBe('viewer');
    expect(notified.peer.displayName).toBe('Grace');
  });

  it('does not tell the joiner about peers in other sessions', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();

    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-2', 'viewer');

    expect(b.lastOfType('joined').peers).toEqual([]);
    expect(a.lastOfType('peer-joined')).toBeUndefined();
  });

  it('relays an offer to the named peer only', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();
    const c = new FakeSocket();

    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-1', 'viewer');
    join(server, c, 'session-1', 'viewer');

    const bId = b.lastOfType('joined').peerId;
    const aId = a.lastOfType('joined').peerId;

    server.handleMessage(
      a,
      JSON.stringify({
        type: 'offer',
        to: bId,
        description: { type: 'offer', sdp: 'v=0-offer' },
      }),
    );

    const offer = b.lastOfType('offer');
    expect(offer.from).toBe(aId);
    expect(offer.description.sdp).toBe('v=0-offer');
    expect(c.lastOfType('offer')).toBeUndefined();
  });

  it('relays answers and ICE candidates back', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();
    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-1', 'viewer');

    const aId = a.lastOfType('joined').peerId;
    const bId = b.lastOfType('joined').peerId;

    server.handleMessage(
      b,
      JSON.stringify({
        type: 'answer',
        to: aId,
        description: { type: 'answer', sdp: 'v=0-answer' },
      }),
    );
    server.handleMessage(
      b,
      JSON.stringify({
        type: 'ice-candidate',
        to: aId,
        candidate: { candidate: 'candidate:1 1 udp 1 10.0.0.1 5000 typ host', sdpMid: '0' },
      }),
    );

    expect(a.lastOfType('answer').from).toBe(bId);
    expect(a.lastOfType('answer').description.sdp).toBe('v=0-answer');
    expect(a.lastOfType('ice-candidate').candidate.candidate).toMatch(/typ host/);
  });

  it('refuses to relay across sessions', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();
    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-2', 'viewer');

    const bId = b.lastOfType('joined').peerId;

    server.handleMessage(
      a,
      JSON.stringify({
        type: 'offer',
        to: bId,
        description: { type: 'offer', sdp: 'v=0' },
      }),
    );

    expect(a.lastOfType('error').code).toBe('peer_not_in_session');
    expect(b.lastOfType('offer')).toBeUndefined();
  });

  it('rejects signalling before joining', () => {
    const socket = new FakeSocket();
    server.handleMessage(
      socket,
      JSON.stringify({
        type: 'offer',
        to: 'someone',
        description: { type: 'offer', sdp: 'v=0' },
      }),
    );

    expect(socket.lastOfType('error').code).toBe('not_joined');
  });

  it('rejects an offer to a peer that does not exist', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'broadcaster');

    server.handleMessage(
      socket,
      JSON.stringify({
        type: 'offer',
        to: 'no-such-peer',
        description: { type: 'offer', sdp: 'v=0' },
      }),
    );

    expect(socket.lastOfType('error').code).toBe('unknown_peer');
  });

  it('rejects a second join on the same connection', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'broadcaster');
    join(server, socket, 'session-2', 'viewer');

    expect(socket.lastOfType('error').code).toBe('already_joined');
  });

  it('reports malformed frames without dropping the connection', () => {
    const socket = new FakeSocket();
    server.handleMessage(socket, '{{{');

    expect(socket.lastOfType('error').code).toBe('invalid_message');
    expect(socket.closed).toBe(false);
  });

  it('notifies peers when one leaves', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();
    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-1', 'viewer');

    const bId = b.lastOfType('joined').peerId;
    server.handleMessage(b, JSON.stringify({ type: 'leave' }));

    expect(a.lastOfType('peer-left').peerId).toBe(bId);
  });

  it('cleans up when a connection drops without leaving', () => {
    const a = new FakeSocket();
    const b = new FakeSocket();
    join(server, a, 'session-1', 'broadcaster');
    join(server, b, 'session-1', 'viewer');

    server.handleDisconnect(b);

    expect(a.lastOfType('peer-left')).toBeDefined();
    expect(server.sessionSnapshot('session-1')?.peers).toHaveLength(1);
  });

  it('forgets a session once the last peer leaves', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'broadcaster');
    expect(server.stats().sessions).toBe(1);

    server.handleDisconnect(socket);

    expect(server.stats().sessions).toBe(0);
    expect(server.sessionSnapshot('session-1')).toBeNull();
  });

  it('is idempotent on repeated disconnects', () => {
    const socket = new FakeSocket();
    join(server, socket, 'session-1', 'broadcaster');

    server.handleDisconnect(socket);
    expect(() => server.handleDisconnect(socket)).not.toThrow();
    expect(server.stats().peers).toBe(0);
  });

  it('enforces the mesh size cap', () => {
    const small = new SignalingServer({
      env: {},
      logger: silentLogger,
      maxPeersPerSession: 2,
    });

    const a = new FakeSocket();
    const b = new FakeSocket();
    const c = new FakeSocket();

    join(small, a, 'session-1', 'broadcaster');
    join(small, b, 'session-1', 'viewer');
    join(small, c, 'session-1', 'viewer');

    expect(c.lastOfType('error').code).toBe('session_full');
    expect(c.lastOfType('error').message).toMatch(/SFU/);
    expect(c.closed).toBe(true);
    expect(small.stats().peers).toBe(2);
  });

  it('keeps broadcasting to remaining peers when one send throws', () => {
    const a = new FakeSocket();
    const broken: SignalingSocket = {
      send: () => {
        throw new Error('socket already closed');
      },
      close: () => undefined,
    };
    const c = new FakeSocket();

    join(server, a, 'session-1', 'broadcaster');
    join(server, broken, 'session-1', 'viewer');
    join(server, c, 'session-1', 'viewer');

    // c must still be told, even though `broken` throws first.
    expect(c.lastOfType('joined')).toBeDefined();
    expect(a.typesSeen().filter((t) => t === 'peer-joined')).toHaveLength(2);
  });
});
