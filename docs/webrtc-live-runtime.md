# WebRTC live runtime (N3)

Signalling for peer-to-peer media in live sessions. Implemented in
`services/live/src/webrtc/`.

## What the server does and does not do

It brokers the handshake. **Media never passes through it.** Once peers have
exchanged SDP and ICE candidates, audio and video flow directly between browsers
or via a TURN relay. Relaying frames through Node would put a CPU-bound path in
front of every viewer.

WebRTC deliberately leaves signalling undefined — peers cannot discover each
other or exchange SDP without an out-of-band channel. This is that channel,
running over the existing `/ws/live` WebSocket.

## Protocol

Connect to `ws://<live-host>/ws/live`, then:

### Client to server

| Message         | Fields                                                          |
| --------------- | --------------------------------------------------------------- |
| `join`          | `sessionId`, `role` (`broadcaster` \| `viewer`), `displayName?` |
| `leave`         | —                                                               |
| `offer`         | `to`, `description` (RTCSessionDescriptionInit)                 |
| `answer`        | `to`, `description`                                             |
| `ice-candidate` | `to`, `candidate` (RTCIceCandidateInit)                         |

### Server to client

| Message            | Fields                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| `joined`           | `peerId`, `sessionId`, `peers[]`, `iceServers[]`, `turnConfigured`, `warnings[]` |
| `peer-joined`      | `peer`                                                                           |
| `peer-left`        | `peerId`                                                                         |
| `offer` / `answer` | `from`, `description`                                                            |
| `ice-candidate`    | `from`, `candidate`                                                              |
| `error`            | `code`, `message`                                                                |

Error codes: `invalid_message`, `not_joined`, `already_joined`, `unknown_peer`,
`session_full`, `peer_not_in_session`.

### Who offers

The **joining** peer receives the list of peers already present and initiates an
offer to each. Peers already in the session only wait for it.

This avoids glare — both sides offering at once, forcing a rollback. A rule
about who initiates is cheaper than implementing perfect negotiation.

## Client sketch

```ts
const ws = new WebSocket('wss://live.animaforge.com/ws/live');
const connections = new Map<string, RTCPeerConnection>();
let iceServers: RTCIceServer[] = [];

ws.onopen = () => ws.send(JSON.stringify({ type: 'join', sessionId, role: 'viewer' }));

ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'joined':
      iceServers = msg.iceServers;
      if (!msg.turnConfigured) {
        // Surface this. Users behind symmetric NAT will not connect, and the
        // failure looks like nothing happening at all.
        showBanner(msg.warnings.join(' '));
      }
      // We joined last, so we offer to everyone already here.
      for (const peer of msg.peers) await sendOffer(peer.peerId);
      break;

    case 'offer': {
      const pc = getConnection(msg.from);
      await pc.setRemoteDescription(msg.description);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', to: msg.from, description: answer }));
      break;
    }

    case 'answer':
      await getConnection(msg.from).setRemoteDescription(msg.description);
      break;

    case 'ice-candidate':
      await getConnection(msg.from).addIceCandidate(msg.candidate);
      break;

    case 'peer-left':
      connections.get(msg.peerId)?.close();
      connections.delete(msg.peerId);
      break;
  }
};

function getConnection(peerId: string): RTCPeerConnection {
  let pc = connections.get(peerId);
  if (!pc) {
    pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: 'ice-candidate', to: peerId, candidate: e.candidate }));
      }
    };
    connections.set(peerId, pc);
  }
  return pc;
}
```

## TURN is not optional in production

STUN lets peers discover their public address and connect directly. Behind
**symmetric NAT** — corporate networks, some mobile carriers — that is
impossible, and the only route is a TURN relay both peers connect _out_ to.
Industry measurements put the share of connections needing TURN at roughly
10-20%.

Without it, those calls do not fail loudly. ICE simply never completes and the
user watches a spinner. So the absence is reported in three places rather than
left to be discovered:

- a warning logged once at service startup
- `turnConfigured: false` plus `warnings[]` in every `joined` message
- the `webrtc` block on `GET /health`

```bash
WEBRTC_TURN_URLS=turn:relay.example.com:3478
WEBRTC_TURN_USERNAME=animaforge
WEBRTC_TURN_CREDENTIAL=...
```

All three are required together. `WEBRTC_TURN_URLS` without credentials is
**refused rather than advertised** — a relay the client cannot authenticate
against fails the same way as no relay, only harder to diagnose.

## Limits

`maxPeersPerSession` defaults to **16**. This is a mesh: every peer connects to
every other, so N peers means N×(N−1) connections. Past a handful of
_publishers_ the upload bandwidth at each broadcaster becomes the bottleneck and
an SFU is required. Exceeding the cap returns `session_full` and closes the
socket, rather than letting a session degrade into unexplained stalls.

Relay is scoped to a session: a peer cannot signal into a session it has not
joined. Without that check any client could inject SDP into someone else's
stream.

## Not built

- **No SFU.** Mesh only, hence the peer cap.
- **No recording.** `LiveSession.recordingUrl` exists in the model but nothing
  writes to it from the WebRTC path.
- **No authentication on the signalling socket.** `services/collab` verifies a
  JWT on upgrade; `/ws/live` does not yet. Anyone who can reach the port can
  join a session if they know its id.
- **No bandwidth estimation or simulcast.**

## Testing

`tests/unit/webrtc-signaling.test.ts`, 26 tests. The server talks to a minimal
`SignalingSocket` interface rather than to `ws` directly, so the whole protocol
is exercised without opening a port.
