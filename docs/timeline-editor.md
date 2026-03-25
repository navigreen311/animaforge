# Timeline Editor

## Overview

The Timeline Editor is AnimaForge's primary interface for arranging, editing, and previewing shots within a project. It provides a visual, drag-and-drop timeline with real-time collaboration support via WebSocket events.

---

## Component Hierarchy

```
TimelineEditor (root)
├── TimelineToolbar
│   ├── PlaybackControls (play, pause, stop, skip)
│   ├── ZoomControls (zoom in/out, fit to view)
│   ├── SnapToggle (snap to grid on/off)
│   └── ExportButton
├── TimelineRuler
│   ├── TimeMarkers (seconds/frames)
│   └── Playhead (draggable current position)
├── TrackContainer
│   ├── VideoTrack
│   │   ├── ShotClip[] (draggable, resizable)
│   │   │   ├── ClipThumbnail
│   │   │   ├── ClipLabel (shot number, scene)
│   │   │   ├── ClipDuration
│   │   │   ├── ClipStatus (badge)
│   │   │   ├── ResizeHandle (left)
│   │   │   └── ResizeHandle (right)
│   │   └── GapIndicator[] (empty spaces)
│   ├── AudioTrack
│   │   ├── AudioClip[] (music, SFX, dialogue)
│   │   │   ├── Waveform
│   │   │   ├── ClipLabel
│   │   │   └── VolumeControl
│   │   └── GapIndicator[]
│   └── TransitionTrack
│       └── TransitionMarker[] (cut, dissolve, fade, wipe)
├── TimelinePanel (bottom detail view)
│   ├── ShotProperties (selected shot details)
│   ├── TransitionProperties (selected transition details)
│   └── AudioProperties (selected audio details)
└── CollaborationOverlay
    ├── UserCursor[] (other users' positions)
    └── LockIndicator[] (locked shots)
```

---

## User Interactions

### Shot Management

| Interaction | Behavior |
|-------------|----------|
| **Click shot** | Select shot, show properties in panel |
| **Double-click shot** | Open shot editor (full-screen edit view) |
| **Drag shot** | Move shot position on timeline (auto-snaps if enabled) |
| **Drag resize handle** | Adjust shot duration (minimum 500ms) |
| **Right-click shot** | Context menu: duplicate, delete, split, add transition |
| **Ctrl+Click shots** | Multi-select shots |
| **Drag to empty area** | Create selection rectangle for multi-select |
| **Delete key** | Remove selected shot(s) from timeline |
| **Ctrl+D** | Duplicate selected shot(s) |
| **Ctrl+Z / Ctrl+Y** | Undo / Redo |

### Playback

| Interaction | Behavior |
|-------------|----------|
| **Space** | Toggle play/pause |
| **Left/Right arrow** | Step back/forward one frame |
| **Shift+Left/Right** | Step back/forward one shot |
| **Home / End** | Jump to timeline start/end |
| **Click ruler** | Move playhead to clicked position |
| **Drag playhead** | Scrub through timeline |
| **L key** | Toggle loop playback |
| **I / O keys** | Set in-point / out-point for region playback |

### Zoom & Navigation

| Interaction | Behavior |
|-------------|----------|
| **Scroll wheel** | Horizontal scroll along timeline |
| **Ctrl+Scroll** | Zoom in/out on timeline |
| **Ctrl+0** | Fit all shots in viewport |
| **Ctrl+= / Ctrl+-** | Zoom in / Zoom out |
| **Middle mouse drag** | Pan timeline view |

### Transitions

| Interaction | Behavior |
|-------------|----------|
| **Drag shot to overlap** | Auto-create crossfade transition |
| **Click transition marker** | Select and show transition properties |
| **Transition type dropdown** | Switch between: cut, dissolve, fade-to-black, fade-from-black, wipe-left, wipe-right |
| **Duration slider** | Adjust transition duration (100ms - 2000ms) |

### Audio

| Interaction | Behavior |
|-------------|----------|
| **Drag audio clip** | Move audio position on audio track |
| **Drag audio resize** | Trim audio clip start/end |
| **Volume slider** | Adjust individual clip volume (0-200%) |
| **Mute button** | Toggle clip mute |
| **Waveform click** | Set audio playback position |

---

## WebSocket Events

The timeline uses WebSocket connections for real-time multi-user collaboration.

### Client to Server Events

```typescript
// Lock a shot for exclusive editing
socket.emit('timeline:lock', {
  project_id: 'proj_abc123',
  shot_id: 'shot_001',
});

// Release a shot lock
socket.emit('timeline:unlock', {
  project_id: 'proj_abc123',
  shot_id: 'shot_001',
});

// Move a shot to a new position
socket.emit('timeline:move', {
  project_id: 'proj_abc123',
  shot_id: 'shot_001',
  new_order: 3,
  new_start_ms: 12000,
});

// Resize a shot (change duration)
socket.emit('timeline:resize', {
  project_id: 'proj_abc123',
  shot_id: 'shot_001',
  new_duration_ms: 5000,
});

// Add a transition between shots
socket.emit('timeline:transition', {
  project_id: 'proj_abc123',
  from_shot_id: 'shot_001',
  to_shot_id: 'shot_002',
  type: 'dissolve',
  duration_ms: 500,
});

// Update playhead position (throttled to 5Hz)
socket.emit('timeline:playhead', {
  project_id: 'proj_abc123',
  position_ms: 8500,
});

// Report cursor position for collaboration overlay
socket.emit('timeline:cursor', {
  project_id: 'proj_abc123',
  x: 0.45,  // normalized 0-1
  y: 0.3,
});
```

### Server to Client Events

```typescript
// Another user locked a shot
socket.on('shot:locked', (data) => {
  // data: { project_id, shot_id, locked_by, locked_by_name, locked_at }
  // Show lock icon on the shot, disable editing
});

// Another user unlocked a shot
socket.on('shot:unlocked', (data) => {
  // data: { project_id, shot_id }
  // Remove lock icon, re-enable editing
});

// Shot order or position changed by another user
socket.on('shot:updated', (data) => {
  // data: { project_id, shot_id, changes: { order?, start_ms?, duration_ms? } }
  // Animate shot to new position
});

// Transition added or modified
socket.on('transition:updated', (data) => {
  // data: { project_id, from_shot_id, to_shot_id, type, duration_ms }
  // Update transition marker
});

// Another user's cursor position
socket.on('user:cursor', (data) => {
  // data: { user_id, user_name, avatar_url, x, y }
  // Show colored cursor with user name label
});

// User presence update
socket.on('user:presence', (data) => {
  // data: { project_id, users: [{ id, name, avatar_url, color }] }
  // Update collaboration overlay showing active users
});

// Generation completed for a shot
socket.on('job:completed', (data) => {
  // data: { job_id, outputs: [{ shot_id, output_url, thumbnail_url }] }
  // Update shot thumbnail and status badge
});
```

---

## State Management

The timeline uses a Zustand store for local state with optimistic updates:

```typescript
interface TimelineState {
  // Data
  shots: Shot[];
  audioClips: AudioClip[];
  transitions: Transition[];

  // Selection
  selectedShotIds: Set<string>;
  selectedTransitionId: string | null;
  selectedAudioId: string | null;

  // Playback
  isPlaying: boolean;
  playheadMs: number;
  loopEnabled: boolean;
  inPointMs: number | null;
  outPointMs: number | null;

  // View
  zoomLevel: number;       // pixels per second
  scrollOffsetMs: number;  // horizontal scroll position
  snapToGrid: boolean;
  gridIntervalMs: number;  // snap grid size

  // Collaboration
  lockedShots: Map<string, { userId: string; userName: string }>;
  activeCursors: Map<string, { x: number; y: number; name: string; color: string }>;

  // Undo/Redo
  undoStack: TimelineAction[];
  redoStack: TimelineAction[];

  // Actions
  moveShot: (shotId: string, newOrder: number, newStartMs: number) => void;
  resizeShot: (shotId: string, newDurationMs: number) => void;
  selectShot: (shotId: string, multi?: boolean) => void;
  deleteSelectedShots: () => void;
  duplicateSelectedShots: () => void;
  setPlayhead: (ms: number) => void;
  togglePlay: () => void;
  undo: () => void;
  redo: () => void;
  setZoom: (level: number) => void;
}
```

### Optimistic Updates
1. User performs an action (e.g., move shot)
2. Local state updates immediately for responsive UI
3. WebSocket event sent to server
4. Server validates and broadcasts to all clients
5. If server rejects, local state reverts (undo the optimistic update)

### Conflict Resolution
When two users simultaneously modify the same shot:
1. Server applies the first received event
2. Second user receives a `shot:updated` event with the server's authoritative state
3. Client detects the conflict and smoothly animates to the correct position
4. A toast notification informs the user: "Shot moved by [other user]"

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Left` / `Right` | Step frame back / forward |
| `Shift+Left` / `Shift+Right` | Jump to previous / next shot |
| `Home` / `End` | Go to start / end |
| `Delete` | Delete selected |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all shots |
| `Escape` | Deselect all |
| `Ctrl+0` | Fit to view |
| `Ctrl+=` / `Ctrl+-` | Zoom in / out |
| `I` | Set in-point |
| `O` | Set out-point |
| `L` | Toggle loop |
| `S` | Toggle snap to grid |
| `M` | Mute selected audio |
| `T` | Add transition at playhead |
