# AnimaForge Live Streaming Runtime

The AnimaForge Live Runtime enables real-time interactive animation sessions where hosts can generate, modify, and broadcast animated content to viewers in real time.

---

## Session Management

### Creating a Session

```
POST /api/v1/live/sessions
{
  "project_id": "proj_abc123",
  "title": "Live Animation Session",
  "visibility": "public",       // public, private, unlisted
  "max_viewers": 1000,
  "recording_enabled": true
}
```

### Session Lifecycle

```
CREATED  -->  WARMUP  -->  LIVE  -->  ENDED
                             |
                          PAUSED
```

| State | Description |
|-------|-------------|
| `CREATED` | Session initialized, resources being allocated |
| `WARMUP` | Host can preview and configure before going live |
| `LIVE` | Broadcasting to viewers, inputs accepted |
| `PAUSED` | Temporarily paused, viewers see a holding screen |
| `ENDED` | Session terminated, recording finalized |

### Session Controls

| Action | Endpoint | Description |
|--------|----------|-------------|
| Start | `POST /api/v1/live/sessions/:id/start` | Transition from WARMUP to LIVE |
| Pause | `POST /api/v1/live/sessions/:id/pause` | Pause the live session |
| Resume | `POST /api/v1/live/sessions/:id/resume` | Resume from PAUSED |
| End | `POST /api/v1/live/sessions/:id/end` | End the session |

---

## Input Types

During a live session, the host and authorized participants can send creative inputs that are processed in real time.

### Supported Inputs

| Input Type | Description | Latency Target |
|------------|-------------|---------------|
| **Text prompt** | Natural language description of the next scene | < 3s to start |
| **Style change** | Apply a different style fingerprint | < 2s |
| **Character swap** | Switch active characters in the scene | < 2s |
| **Camera control** | Pan, zoom, rotate, or change camera angle | < 500ms |
| **Audio trigger** | Play a sound effect or music cue | < 200ms |
| **Audience poll** | Let viewers vote on the next action | N/A (async) |
| **Sketch overlay** | Draw on screen to guide composition | Real-time |

### Input Permissions

| Role | Allowed Inputs |
|------|---------------|
| Host | All inputs |
| Co-host | All inputs except session controls |
| Participant | Text prompts, audience polls |
| Viewer | Audience polls only |

---

## Recording

### Automatic Recording

When `recording_enabled` is set to `true`, the session is recorded continuously.

- **Format**: MP4 (H.264 + AAC)
- **Resolution**: Matches the session output resolution (up to 1920x1080)
- **Storage**: Recordings are saved to the project's asset library
- **Availability**: Recording is available within 5 minutes of session end

### Recording Segments

For long sessions, recordings are automatically split into segments:

| Duration | Segment Size |
|----------|-------------|
| < 30 min | Single file |
| 30 min - 2 hr | 30-minute segments |
| > 2 hr | 1-hour segments |

### Post-Session

After a session ends:

1. Recording is finalized and encoded
2. Thumbnails are generated for each segment
3. A highlights reel is auto-generated (top viewer engagement moments)
4. The recording appears in the project's asset library
5. The host can edit, trim, and publish the recording

---

## Viewer Management

### Viewer Limits

| Tier | Max Viewers | Max Co-hosts |
|------|-------------|-------------|
| Starter | 50 | 1 |
| Pro | 500 | 5 |
| Enterprise | 10,000 | 25 |

### Viewer Features

- **Live chat**: Text chat alongside the stream (moderated)
- **Reactions**: Emoji reactions that appear as overlays
- **Polls**: Vote on creative decisions presented by the host
- **Q&A**: Submit questions for the host (moderated queue)

### Moderation

- Chat messages pass through the content moderation pipeline
- Hosts can mute or ban viewers
- Auto-moderation flags spam, profanity, and abusive messages
- Banned viewers are blocked by user ID (not just session)

---

## WebSocket Protocol

Live sessions use WebSocket connections through the AnimaForge real-time service.

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://ws.animaforge.ai', {
  auth: { token: 'Bearer <jwt>' },
});

socket.emit('live:join', { session_id: 'live_abc123' });
```

### Client-to-Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `live:join` | `{ session_id }` | Join a live session as a viewer |
| `live:leave` | `{ session_id }` | Leave the session |
| `live:input` | `{ session_id, type, data }` | Send a creative input (host/co-host) |
| `live:chat` | `{ session_id, message }` | Send a chat message |
| `live:react` | `{ session_id, emoji }` | Send an emoji reaction |
| `live:poll:vote` | `{ session_id, poll_id, option }` | Vote in an audience poll |
| `live:control` | `{ session_id, action }` | Session control (host only) |

### Server-to-Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `live:frame` | `{ session_id, frame_url, timestamp }` | New frame rendered |
| `live:audio` | `{ session_id, audio_chunk, timestamp }` | Audio chunk for playback |
| `live:state` | `{ session_id, state, metadata }` | Session state change |
| `live:chat:new` | `{ session_id, user, message, timestamp }` | New chat message |
| `live:react:burst` | `{ session_id, reactions[] }` | Batched emoji reactions |
| `live:poll:update` | `{ session_id, poll_id, results }` | Poll results update |
| `live:viewer:count` | `{ session_id, count }` | Viewer count update |
| `live:error` | `{ session_id, code, message }` | Error notification |

### Frame Delivery

- Frames are delivered as JPEG images at 10-15 FPS for the preview stream
- A parallel HLS/DASH stream provides the full-quality video with 3-5 second latency
- The WebSocket frame stream is used for the interactive preview (lower latency, lower quality)
- Viewers automatically switch to the HLS stream if WebSocket latency exceeds 2 seconds
