# AnimaForge Plugin System

The AnimaForge plugin system allows third-party developers to extend the platform with custom features, integrations, and tools.

---

## Plugin Manifest

Every plugin requires an `animaplugin.json` manifest file at its root.

```json
{
  "id": "com.example.my-plugin",
  "name": "My AnimaForge Plugin",
  "version": "1.0.0",
  "description": "A brief description of what this plugin does",
  "author": {
    "name": "Example Developer",
    "email": "dev@example.com",
    "url": "https://example.com"
  },
  "license": "MIT",
  "engines": {
    "animaforge": ">=1.0.0"
  },
  "main": "dist/index.js",
  "permissions": [
    "project:read",
    "shot:read",
    "shot:write",
    "character:read",
    "ui:panel"
  ],
  "hooks": [
    "onShotCreated",
    "onGenerationComplete",
    "onProjectOpen"
  ],
  "ui": {
    "panels": [
      {
        "id": "my-panel",
        "title": "My Plugin Panel",
        "icon": "assets/icon.svg",
        "location": "sidebar"
      }
    ]
  },
  "settings": [
    {
      "key": "apiEndpoint",
      "type": "string",
      "label": "API Endpoint",
      "default": "https://api.example.com"
    },
    {
      "key": "autoRun",
      "type": "boolean",
      "label": "Run automatically on generation",
      "default": false
    }
  ]
}
```

---

## Permissions

Plugins operate under a least-privilege model. Each capability must be explicitly declared in the manifest.

### Available Permissions

| Permission | Description |
|-----------|-------------|
| `project:read` | Read project metadata and settings |
| `project:write` | Modify project metadata |
| `shot:read` | Read shot data, prompts, and outputs |
| `shot:write` | Create or modify shots |
| `character:read` | Read character data and references |
| `character:write` | Modify character data |
| `asset:read` | Access project assets |
| `asset:write` | Upload or modify assets |
| `generation:trigger` | Start generation jobs |
| `generation:read` | Read generation job status and results |
| `style:read` | Access style fingerprints |
| `style:write` | Create or modify style fingerprints |
| `ui:panel` | Register a UI panel in the interface |
| `ui:menu` | Add items to the application menu |
| `ui:overlay` | Render overlays on the canvas |
| `network:outbound` | Make HTTP requests to external URLs |
| `storage:local` | Store plugin-specific data locally |
| `notification:send` | Send notifications to the user |

### Permission Prompts

When a user installs a plugin, they are shown a clear summary of what the plugin can access. Sensitive permissions (`network:outbound`, `generation:trigger`, `*:write`) display a warning icon.

---

## Hooks

Hooks allow plugins to react to platform events. Plugins declare which hooks they use in the manifest and implement the corresponding handler functions.

### Available Hooks

| Hook | Trigger | Payload |
|------|---------|---------|
| `onProjectOpen` | User opens a project | `{ projectId, project }` |
| `onProjectClose` | User closes a project | `{ projectId }` |
| `onShotCreated` | A new shot is added | `{ projectId, shotId, shot }` |
| `onShotUpdated` | Shot metadata changes | `{ projectId, shotId, changes }` |
| `onShotDeleted` | A shot is removed | `{ projectId, shotId }` |
| `onGenerationStart` | A generation job begins | `{ jobId, projectId, shotIds }` |
| `onGenerationProgress` | Generation progress update | `{ jobId, progress, stage }` |
| `onGenerationComplete` | Generation finishes | `{ jobId, outputs[] }` |
| `onGenerationFailed` | Generation fails | `{ jobId, error }` |
| `onReviewSubmitted` | A shot is submitted for review | `{ projectId, shotId }` |
| `onReviewDecision` | A review is approved/rejected | `{ projectId, shotId, decision }` |
| `onAssetUploaded` | A new asset is uploaded | `{ projectId, assetId, asset }` |
| `onExportComplete` | An export finishes | `{ projectId, exportId, url }` |

### Hook Implementation

```typescript
import { AnimaForgePlugin, HookContext } from '@animaforge/plugin-sdk';

export default class MyPlugin extends AnimaForgePlugin {
  async onGenerationComplete(ctx: HookContext) {
    const { jobId, outputs } = ctx.payload;

    for (const output of outputs) {
      // Example: run custom quality analysis
      const score = await this.analyzeQuality(output.output_url);
      await ctx.api.shots.addComment(output.shot_id, {
        text: `Plugin QC Score: ${score}/100`,
        author: this.manifest.name,
      });
    }
  }
}
```

---

## Certification Process

All plugins must pass certification before they can be distributed on the AnimaForge Marketplace.

### Certification Steps

1. **Automated validation**
   - Manifest schema validation
   - Dependency vulnerability scan
   - Static analysis for malicious patterns
   - Permission usage audit (declared vs. actually used)

2. **Sandbox testing**
   - Plugin is installed in an isolated test environment
   - All declared hooks are triggered with test data
   - Performance is measured (startup time, memory usage, hook latency)
   - Network requests are logged and reviewed

3. **Manual review**
   - AnimaForge team reviews the plugin's functionality
   - UI panels are tested for usability and consistency
   - Privacy and data handling practices are verified
   - Documentation and support channels are confirmed

4. **Certification decision**
   - **Approved**: Plugin is published to the marketplace
   - **Changes requested**: Specific issues must be addressed and resubmitted
   - **Rejected**: Plugin violates policies (with explanation)

### Certification Requirements

| Requirement | Threshold |
|-------------|-----------|
| Startup time | < 500 ms |
| Memory usage | < 50 MB |
| Hook handler latency | < 200 ms (p95) |
| No eval() or dynamic code execution | Required |
| Content Security Policy compliance | Required |
| Error handling (no unhandled exceptions) | Required |

### Re-certification

- Major version updates (e.g., 1.x to 2.x) require full re-certification
- Minor and patch updates undergo automated validation only
- AnimaForge reserves the right to revoke certification if a plugin is found to violate policies after publication

---

## Distribution

### Marketplace Distribution

Certified plugins are listed on the AnimaForge Marketplace under the "Plugins" category. The same revenue split applies (70% seller / 30% platform). Free plugins are also supported.

### Private Distribution

Enterprise organizations can distribute plugins privately within their organization:

- Upload the plugin package to the organization's private plugin registry
- Organization admins control which plugins are available to members
- Private plugins do not require marketplace certification but must pass automated validation
- SCIM groups can be used to control plugin access per team

### Plugin SDK

The official plugin SDK is available as an npm package:

```bash
npm install @animaforge/plugin-sdk
```

The SDK provides:

- TypeScript types for all hooks, API methods, and UI components
- A local development server with hot reload
- A test harness for simulating platform events
- CLI tools for packaging and submitting plugins

```bash
# Initialize a new plugin project
npx @animaforge/plugin-sdk init my-plugin

# Start the development server
npx @animaforge/plugin-sdk dev

# Run the test harness
npx @animaforge/plugin-sdk test

# Package for submission
npx @animaforge/plugin-sdk build

# Submit to marketplace
npx @animaforge/plugin-sdk submit
```
