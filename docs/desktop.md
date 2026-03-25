# AnimaForge Desktop App

The AnimaForge desktop app provides a full-featured production environment with native system access, GPU acceleration, and offline capabilities. It is built with Electron.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 30+ |
| Renderer | Same Next.js codebase as the web app |
| IPC | Electron IPC with typed channels (electron-trpc) |
| Build | electron-builder with auto-update |
| Native Modules | Native Node.js addons for GPU and file system |

### Process Model

```
Main Process (Node.js)
  - Window management
  - File system access
  - GPU detection and routing
  - Auto-update manager
  - System tray / menu bar
  - IPC bridge to renderer

Renderer Process (Chromium)
  - Next.js web app (same codebase)
  - Enhanced with desktop-specific features via IPC
  - Local file picker / drag-and-drop
  - Native notification integration

Utility Process (optional)
  - Background export encoding
  - Local cache management
```

### Project Structure

```
apps/desktop/
  src/
    main/              # Electron main process
      index.ts
      ipc/             # IPC handler definitions
      gpu/             # GPU detection and management
      updater/         # Auto-update logic
      tray/            # System tray management
    preload/           # Preload scripts for secure IPC
    renderer/          # Symlink or build of apps/web
  resources/           # App icons, installer assets
  electron-builder.yml # Build configuration
```

---

## Native Features

### File System Access

The desktop app provides direct file system access for:

- **Asset import**: Drag-and-drop or file picker for images, video, audio, and 3D models. Files are uploaded via the pre-signed URL flow but with local path support.
- **Export to disk**: Generated videos can be saved directly to a local directory without downloading through the browser.
- **Watch folders**: Configure a folder to auto-import new assets when files are added.
- **Project backup**: Export entire projects (metadata + assets) as a `.animaforge` archive.

### GPU Acceleration

- **Detection**: On launch, the app detects available GPUs (NVIDIA, AMD, Apple Silicon) and their VRAM.
- **Local preview**: Low-resolution previews can be generated locally using the GPU for instant feedback before submitting to the cloud.
- **Hardware-accelerated video playback**: Uses native codecs for smooth timeline scrubbing.
- **WebGL/WebGPU**: Three.js avatar previews leverage the dedicated GPU.

### System Integration

- **System tray**: Minimizes to tray with generation progress indicators.
- **Native menus**: Application menu with keyboard shortcuts for common actions.
- **File associations**: `.animaforge` project files open directly in the app.
- **Protocol handler**: `animaforge://` deep links open projects and shots.
- **Notifications**: Native OS notifications for generation complete, review requests, etc.

---

## Auto-Update

The desktop app uses Electron's built-in auto-update mechanism.

### Update Flow

1. On launch and every 4 hours, the app checks the update server for new versions.
2. If an update is available, it downloads in the background.
3. A non-intrusive banner appears: "Update available. Restart to apply."
4. The user can restart immediately or defer until the next natural restart.
5. Critical security updates display a more prominent prompt.

### Update Channels

| Channel | Audience | Cadence |
|---------|----------|---------|
| `stable` | All users | Every 2-4 weeks |
| `beta` | Opt-in testers | Weekly |
| `alpha` | Internal team | On every merge to develop |

### Configuration

- Update server: Hosted on AnimaForge CDN with signed releases
- Code signing: All binaries are code-signed (Windows: EV certificate, macOS: Apple Developer ID)
- Differential updates: Only changed files are downloaded (electron-updater NSIS delta)

---

## Offline Mode

The desktop app has extended offline capabilities compared to the mobile and web apps.

### Available Offline

- Full project browsing and editing (metadata, shot order, comments)
- Timeline editor with cached shot thumbnails and previews
- Character library with cached reference images
- Asset management for locally cached files
- Draft reviews and comments (queued for sync)
- Local GPU preview generation (if supported hardware is available)

### Sync on Reconnection

- All offline changes are queued in a local SQLite database
- On reconnection, changes are synced with conflict detection
- Conflicts present a diff view for the user to resolve
- Large asset uploads resume from where they left off (chunked uploads)

---

## Supported Platforms

| Platform | Minimum Version | Architecture |
|----------|----------------|-------------|
| Windows | Windows 10 (1903+) | x64, arm64 |
| macOS | macOS 12 (Monterey) | x64 (Intel), arm64 (Apple Silicon) |
| Linux | Ubuntu 20.04+ / Fedora 36+ | x64, arm64 |

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 8 GB | 16 GB |
| Storage | 500 MB (app) + 2 GB (cache) | 500 MB (app) + 10 GB (cache) |
| GPU | Integrated graphics | NVIDIA RTX 3060+ / Apple M1+ |
| Display | 1280x720 | 1920x1080+ |
| Internet | Required for generation and sync | Broadband recommended |

### Installation

- **Windows**: NSIS installer (`.exe`) or MSIX for Microsoft Store
- **macOS**: DMG with drag-to-Applications, or Homebrew cask (`brew install --cask animaforge`)
- **Linux**: AppImage, `.deb` (Ubuntu/Debian), `.rpm` (Fedora/RHEL), or Snap
