# AnimaForge API Reference

> **Base URLs**
> - Platform API: `https://api.animaforge.ai/v1`
> - AI Inference API: `https://ai.animaforge.ai/v1`
> - WebSocket: `wss://ws.animaforge.ai`

All requests require a Bearer token in the `Authorization` header unless noted otherwise. Rate limits are 60 req/min (Starter), 300 req/min (Pro), 1000 req/min (Enterprise).

---

## Platform API (25 Endpoints)

### Projects

#### `GET /api/v1/projects`
List all projects for the authenticated user.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Items per page (default: 20, max: 100) |
| `phase` | string | Filter by phase: `draft`, `generating`, `review`, `published` |
| `sort` | string | Sort field: `created_at`, `updated_at`, `title` |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "proj_abc123",
      "title": "Cyber Samurai: Origin",
      "description": "A cyberpunk short film",
      "phase": "generating",
      "shot_count": 24,
      "total_duration_ms": 96000,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-25T07:30:00Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "per_page": 20 }
}
```

#### `POST /api/v1/projects`
Create a new animation project.

**Request**
```json
{
  "title": "My New Project",
  "description": "A stunning animation about...",
  "style_preset": "cinematic"
}
```

**Response** `201 Created`
```json
{
  "id": "proj_def456",
  "title": "My New Project",
  "description": "A stunning animation about...",
  "phase": "draft",
  "shot_count": 0,
  "created_at": "2026-03-25T08:00:00Z"
}
```

#### `GET /api/v1/projects/:id`
Retrieve a single project by ID.

**Response** `200 OK`
```json
{
  "id": "proj_abc123",
  "title": "Cyber Samurai: Origin",
  "description": "A cyberpunk short film",
  "phase": "generating",
  "shot_count": 24,
  "total_duration_ms": 96000,
  "style_preset": "cinematic",
  "characters": ["char_001", "char_002"],
  "created_at": "2026-03-01T10:00:00Z",
  "updated_at": "2026-03-25T07:30:00Z"
}
```

#### `PATCH /api/v1/projects/:id`
Update project metadata.

**Request**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response** `200 OK`
```json
{
  "id": "proj_abc123",
  "title": "Updated Title",
  "description": "Updated description",
  "phase": "generating",
  "updated_at": "2026-03-25T08:15:00Z"
}
```

#### `DELETE /api/v1/projects/:id`
Soft-delete a project and all associated resources.

**Response** `200 OK`
```json
{ "message": "Project deleted successfully." }
```

---

### Shots

#### `GET /api/v1/projects/:id/shots`
List all shots in a project.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: `pending`, `generating`, `completed`, `failed` |
| `sort` | string | Sort: `order`, `created_at`, `duration_ms` |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "shot_001",
      "project_id": "proj_abc123",
      "order": 1,
      "prompt": "Wide establishing shot of neon city",
      "negative_prompt": "blurry, distorted",
      "duration_ms": 4000,
      "status": "completed",
      "style_preset": "cinematic",
      "output_url": "https://cdn.animaforge.ai/outputs/shot_001.mp4",
      "created_at": "2026-03-01T10:05:00Z"
    }
  ],
  "meta": { "total": 24 }
}
```

#### `POST /api/v1/projects/:id/shots`
Add a new shot to the project timeline.

**Request**
```json
{
  "prompt": "Close-up of samurai drawing sword",
  "negative_prompt": "blurry",
  "duration_ms": 3000,
  "order": 2,
  "style_preset": "cinematic",
  "character_ids": ["char_001"]
}
```

**Response** `201 Created`
```json
{
  "id": "shot_002",
  "project_id": "proj_abc123",
  "order": 2,
  "prompt": "Close-up of samurai drawing sword",
  "duration_ms": 3000,
  "status": "pending",
  "created_at": "2026-03-25T08:20:00Z"
}
```

#### `PUT /api/v1/projects/:id/shots/:shotId`
Update shot parameters.

**Request**
```json
{
  "prompt": "Updated shot prompt",
  "duration_ms": 5000,
  "order": 3
}
```

**Response** `200 OK`
```json
{
  "id": "shot_002",
  "prompt": "Updated shot prompt",
  "duration_ms": 5000,
  "status": "pending",
  "updated_at": "2026-03-25T08:25:00Z"
}
```

#### `DELETE /api/v1/projects/:id/shots/:shotId`
Remove a shot from the project.

**Response** `200 OK`
```json
{ "message": "Shot deleted." }
```

#### `POST /api/v1/projects/:id/shots/reorder`
Reorder shots within a project timeline.

**Request**
```json
{
  "shot_order": ["shot_003", "shot_001", "shot_002"]
}
```

**Response** `200 OK`
```json
{ "message": "Shots reordered successfully." }
```

---

### Characters

#### `GET /api/v1/characters`
List all characters in the user's library.

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "char_001",
      "name": "Kira",
      "type": "humanoid",
      "style": "anime",
      "reference_images": 3,
      "consent_status": "approved",
      "created_at": "2026-02-15T14:00:00Z"
    }
  ],
  "meta": { "total": 5 }
}
```

#### `POST /api/v1/characters`
Create a new character entry.

**Request**
```json
{
  "name": "Ronin",
  "type": "humanoid",
  "style": "realistic",
  "description": "Tall figure with silver hair and cybernetic arm"
}
```

**Response** `201 Created`
```json
{
  "id": "char_002",
  "name": "Ronin",
  "type": "humanoid",
  "style": "realistic",
  "reference_images": 0,
  "consent_status": "pending",
  "created_at": "2026-03-25T08:30:00Z"
}
```

#### `GET /api/v1/characters/:id`
Retrieve a single character with full details.

**Response** `200 OK`
```json
{
  "id": "char_001",
  "name": "Kira",
  "type": "humanoid",
  "style": "anime",
  "description": "Young woman with neon-blue hair",
  "reference_images": [
    { "url": "https://cdn.animaforge.ai/refs/kira_front.png", "angle": "front" },
    { "url": "https://cdn.animaforge.ai/refs/kira_side.png", "angle": "side" }
  ],
  "embedding_vector": "[512-dim float array]",
  "consent_status": "approved",
  "created_at": "2026-02-15T14:00:00Z"
}
```

#### `PATCH /api/v1/characters/:id`
Update character metadata or reference data.

**Request**
```json
{
  "name": "Kira v2",
  "description": "Updated description"
}
```

**Response** `200 OK`
```json
{
  "id": "char_001",
  "name": "Kira v2",
  "updated_at": "2026-03-25T09:00:00Z"
}
```

#### `DELETE /api/v1/characters/:id`
Soft-delete a character.

**Response** `200 OK`
```json
{ "message": "Character deleted." }
```

#### `POST /api/v1/characters/:id/references`
Upload reference images for a character.

**Request** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `images` | file[] | Up to 10 reference images (PNG/JPG, max 10MB each) |
| `angles` | string[] | Corresponding angles: `front`, `side`, `back`, `three_quarter` |

**Response** `200 OK`
```json
{
  "character_id": "char_001",
  "reference_images": 5,
  "message": "References uploaded successfully."
}
```

---

### Review & Approval

#### `GET /api/v1/projects/:id/reviews`
List all shots under review for a project.

**Response** `200 OK`
```json
{
  "data": [
    {
      "shot_id": "shot_001",
      "status": "pending",
      "reviewer": null,
      "comments": 3,
      "submitted_at": "2026-03-25T08:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/projects/:id/reviews/:shotId/approve`
Approve a shot.

**Request**
```json
{ "comment": "Looks great, approved!" }
```

**Response** `200 OK`
```json
{
  "shot_id": "shot_001",
  "status": "approved",
  "reviewer": "sarah@acme.studio",
  "approved_at": "2026-03-25T09:30:00Z"
}
```

#### `POST /api/v1/projects/:id/reviews/:shotId/reject`
Reject a shot with feedback.

**Request**
```json
{
  "comment": "Motion too jerky in frames 24-48",
  "request_changes": true
}
```

**Response** `200 OK`
```json
{
  "shot_id": "shot_001",
  "status": "rejected",
  "reviewer": "sarah@acme.studio",
  "rejected_at": "2026-03-25T09:35:00Z"
}
```

#### `POST /api/v1/projects/:id/reviews/bulk`
Bulk approve or reject multiple shots.

**Request**
```json
{
  "shot_ids": ["shot_001", "shot_002", "shot_003"],
  "action": "approve",
  "comment": "Batch approved after review session"
}
```

**Response** `200 OK`
```json
{
  "updated": 3,
  "results": [
    { "shot_id": "shot_001", "status": "approved" },
    { "shot_id": "shot_002", "status": "approved" },
    { "shot_id": "shot_003", "status": "approved" }
  ]
}
```

---

### Assets

#### `GET /api/v1/projects/:id/assets`
List project assets with type filtering.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter: `image`, `video`, `audio`, `model` |
| `search` | string | Full-text search on asset name |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "ast_001",
      "name": "hero_pose_front.png",
      "type": "image",
      "size_bytes": 2516582,
      "url": "https://cdn.animaforge.ai/assets/ast_001.png",
      "dimensions": { "width": 2048, "height": 2048 },
      "uploaded_at": "2026-03-24T10:00:00Z"
    }
  ],
  "meta": { "total": 12 }
}
```

#### `POST /api/v1/projects/:id/assets`
Upload a new asset.

**Request** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | The asset file (max 500MB) |
| `name` | string | Display name (optional, defaults to filename) |
| `type` | string | Override auto-detection: `image`, `video`, `audio`, `model` |

**Response** `201 Created`
```json
{
  "id": "ast_013",
  "name": "new_asset.mp4",
  "type": "video",
  "size_bytes": 52428800,
  "url": "https://cdn.animaforge.ai/assets/ast_013.mp4",
  "uploaded_at": "2026-03-25T10:00:00Z"
}
```

#### `DELETE /api/v1/projects/:id/assets/:assetId`
Remove an asset from the project.

**Response** `200 OK`
```json
{ "message": "Asset deleted." }
```

---

### Marketplace

#### `GET /api/v1/marketplace`
Browse marketplace listings.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | `style-packs`, `templates`, `characters`, `audio-packs` |
| `sort` | string | `popular`, `newest`, `price_asc`, `price_desc` |
| `search` | string | Keyword search |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "mkt_001",
      "name": "Cyberpunk Neon Style Pack",
      "category": "style-packs",
      "creator": "alex_chen",
      "price": 9.99,
      "rating": 4.8,
      "downloads": 1240,
      "preview_images": ["https://cdn.animaforge.ai/marketplace/mkt_001_1.webp"]
    }
  ],
  "meta": { "total": 156 }
}
```

#### `POST /api/v1/marketplace/publish`
Submit a new item for marketplace review.

**Request**
```json
{
  "name": "Watercolor Dream Pack",
  "description": "Soft watercolor style with flowing transitions",
  "category": "style-packs",
  "price": 12.99,
  "preview_images": ["data:image/webp;base64,..."]
}
```

**Response** `201 Created`
```json
{
  "id": "mkt_042",
  "status": "pending_review",
  "submitted_at": "2026-03-25T10:00:00Z"
}
```

---

### Enterprise

#### `GET /api/v1/enterprise/users`
List organization users (admin only).

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "usr_001",
      "name": "Sarah Chen",
      "email": "sarah@acme.studio",
      "role": "admin",
      "tier": "Enterprise",
      "status": "active",
      "last_active": "2026-03-25T14:32:00Z"
    }
  ],
  "meta": { "total": 6 }
}
```

#### `POST /api/v1/enterprise/users/invite`
Invite a new user to the organization.

**Request**
```json
{
  "email": "new_user@acme.studio",
  "role": "editor",
  "team": "Animation"
}
```

**Response** `201 Created`
```json
{
  "id": "usr_007",
  "email": "new_user@acme.studio",
  "role": "editor",
  "status": "invited",
  "invited_at": "2026-03-25T10:00:00Z"
}
```

#### `GET /api/v1/enterprise/audit`
Query audit log entries.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `user` | string | Filter by user email |
| `action` | string | Filter: `create`, `update`, `delete`, `login`, `export`, `invite` |
| `resource` | string | Filter: `project`, `character`, `shot`, `asset`, `user`, `settings` |
| `from` | string | Start date (ISO 8601) |
| `to` | string | End date (ISO 8601) |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "aud_001",
      "timestamp": "2026-03-25T14:32:01Z",
      "user": "sarah@acme.studio",
      "action": "update",
      "resource": "project",
      "resource_id": "proj_8f2a",
      "ip": "192.168.1.42",
      "details": { "field": "title", "old": "Old Title", "new": "New Title" }
    }
  ],
  "meta": { "total": 248 }
}
```

---

## AI Inference API (11 Endpoints)

### Generation

#### `POST /ai/v1/generate/video`
Submit a video generation job.

**Request**
```json
{
  "project_id": "proj_abc123",
  "shot_ids": ["shot_001", "shot_002"],
  "model": "animaforge-v2",
  "quality": "high",
  "resolution": "1920x1080",
  "fps": 24,
  "c2pa_enabled": true,
  "style_fingerprint_id": "sf_neon_001"
}
```

**Response** `202 Accepted`
```json
{
  "job_id": "job_xyz789",
  "status": "queued",
  "estimated_duration_s": 120,
  "queue_position": 3,
  "created_at": "2026-03-25T08:35:00Z"
}
```

#### `GET /ai/v1/generate/:jobId/status`
Check generation job status.

**Response** `200 OK`
```json
{
  "job_id": "job_xyz789",
  "status": "processing",
  "progress": 0.45,
  "current_stage": "diffusion",
  "current_shot": "shot_001",
  "estimated_remaining_s": 65
}
```

#### `GET /ai/v1/generate/:jobId/result`
Retrieve completed generation outputs.

**Response** `200 OK`
```json
{
  "job_id": "job_xyz789",
  "status": "completed",
  "outputs": [
    {
      "shot_id": "shot_001",
      "output_url": "https://cdn.animaforge.ai/outputs/shot_001.mp4",
      "thumbnail_url": "https://cdn.animaforge.ai/thumbs/shot_001.webp",
      "c2pa_manifest_url": "https://cdn.animaforge.ai/manifests/shot_001.json",
      "verification_url": "https://animaforge.ai/verify/out_abc123",
      "quality_score": 94.2,
      "duration_ms": 4000
    }
  ],
  "credits_used": 12,
  "completed_at": "2026-03-25T08:37:00Z"
}
```

#### `POST /ai/v1/generate/:jobId/cancel`
Cancel a queued or in-progress job.

**Response** `200 OK`
```json
{
  "job_id": "job_xyz789",
  "status": "cancelled",
  "credits_refunded": 12
}
```

---

### Avatar Studio

#### `POST /ai/v1/avatar/reconstruct`
Start a 3D avatar reconstruction from reference images.

**Request**
```json
{
  "character_id": "char_001",
  "quality": "high",
  "output_format": "glb",
  "features": {
    "facial_rigging": true,
    "body_rigging": true,
    "hair_simulation": true
  }
}
```

**Response** `202 Accepted`
```json
{
  "job_id": "avatar_job_001",
  "status": "queued",
  "estimated_duration_s": 300,
  "created_at": "2026-03-25T09:00:00Z"
}
```

#### `GET /ai/v1/avatar/:jobId/status`
Check avatar reconstruction status.

**Response** `200 OK`
```json
{
  "job_id": "avatar_job_001",
  "status": "processing",
  "progress": 0.6,
  "current_step": "rigging",
  "steps_completed": ["mesh_generation", "texture_mapping", "uv_unwrap"],
  "steps_remaining": ["rigging", "blend_shapes", "hair_sim", "export"]
}
```

---

### Style Intelligence

#### `POST /ai/v1/style/analyze`
Analyze a reference image or video to extract a style fingerprint.

**Request**
```json
{
  "source_url": "https://cdn.animaforge.ai/refs/style_ref.png",
  "extract_palette": true,
  "extract_textures": true,
  "extract_lighting": true
}
```

**Response** `200 OK`
```json
{
  "fingerprint_id": "sf_abc123",
  "palette": ["#1a0a2e", "#ff007f", "#00ffff", "#ffd700"],
  "line_weight": 0.72,
  "texture_class": "cel_shade",
  "lighting_model": "dramatic_rim",
  "mood_vector": [0.8, 0.2, 0.6, 0.9],
  "confidence": 0.94
}
```

#### `POST /ai/v1/style/transfer`
Apply a style fingerprint to generated content.

**Request**
```json
{
  "job_id": "job_xyz789",
  "fingerprint_id": "sf_abc123",
  "intensity": 0.85,
  "preserve_identity": true
}
```

**Response** `202 Accepted`
```json
{
  "transfer_job_id": "st_job_001",
  "status": "queued",
  "estimated_duration_s": 45
}
```

---

### Governance

#### `POST /ai/v1/governance/verify`
Verify provenance and authenticity of generated content.

**Request**
```json
{ "output_id": "out_abc123" }
```

**Response** `200 OK`
```json
{
  "output_id": "out_abc123",
  "verified": true,
  "c2pa_valid": true,
  "watermark_detected": true,
  "generator": "animaforge-v2",
  "created_at": "2026-03-25T08:35:00Z",
  "consent_status": "all_approved",
  "chain_of_custody": [
    { "action": "generated", "timestamp": "2026-03-25T08:35:00Z", "actor": "system" },
    { "action": "signed", "timestamp": "2026-03-25T08:35:01Z", "actor": "c2pa_signer" },
    { "action": "watermarked", "timestamp": "2026-03-25T08:35:02Z", "actor": "watermark_engine" }
  ]
}
```

#### `GET /ai/v1/governance/consent/:characterId`
Check likeness consent status for a character.

**Response** `200 OK`
```json
{
  "character_id": "char_001",
  "name": "Kira",
  "consent_status": "approved",
  "consent_granted_at": "2026-02-15T14:00:00Z",
  "consent_type": "perpetual",
  "restrictions": [],
  "consent_chain": [
    { "action": "requested", "timestamp": "2026-02-15T10:00:00Z" },
    { "action": "approved", "timestamp": "2026-02-15T14:00:00Z", "approver": "rights_holder" }
  ]
}
```

#### `POST /ai/v1/governance/moderate`
Run content moderation on generated output.

**Request**
```json
{
  "output_id": "out_abc123",
  "checks": ["nsfw", "violence", "bias", "copyright"]
}
```

**Response** `200 OK`
```json
{
  "output_id": "out_abc123",
  "passed": true,
  "results": {
    "nsfw": { "score": 0.02, "passed": true },
    "violence": { "score": 0.15, "passed": true },
    "bias": { "score": 0.05, "passed": true },
    "copyright": { "score": 0.01, "passed": true }
  },
  "moderated_at": "2026-03-25T08:36:00Z"
}
```

---

## WebSocket Events

Connect to `wss://ws.animaforge.ai` with a valid JWT token.

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe:project` | `{ project_id: string }` | Subscribe to project updates |
| `unsubscribe:project` | `{ project_id: string }` | Unsubscribe from project |
| `subscribe:job` | `{ job_id: string }` | Subscribe to generation job updates |
| `timeline:lock` | `{ project_id: string, shot_id: string }` | Lock a shot for editing |
| `timeline:unlock` | `{ project_id: string, shot_id: string }` | Release shot lock |
| `timeline:move` | `{ project_id: string, shot_id: string, new_order: number }` | Move shot in timeline |
| `comment:send` | `{ shot_id: string, text: string, timestamp_ms?: number }` | Post a comment on a shot |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `job:progress` | `{ job_id, progress, stage, shot_id }` | Generation progress update |
| `job:completed` | `{ job_id, outputs[], credits_used }` | Generation complete |
| `job:failed` | `{ job_id, error, shot_id? }` | Generation failure |
| `shot:updated` | `{ project_id, shot_id, changes }` | Shot metadata changed |
| `shot:locked` | `{ project_id, shot_id, locked_by }` | Shot locked by another user |
| `shot:unlocked` | `{ project_id, shot_id }` | Shot lock released |
| `review:status` | `{ project_id, shot_id, status, reviewer }` | Review status changed |
| `comment:new` | `{ shot_id, comment_id, author, text, timestamp_ms }` | New comment posted |
| `asset:uploaded` | `{ project_id, asset }` | New asset available |
| `user:presence` | `{ project_id, users[] }` | Active users in project |

### Connection Example

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://ws.animaforge.ai', {
  auth: { token: 'Bearer <jwt>' },
});

socket.emit('subscribe:project', { project_id: 'proj_abc123' });

socket.on('job:progress', (data) => {
  console.log(`Job ${data.job_id}: ${Math.round(data.progress * 100)}%`);
});

socket.on('job:completed', (data) => {
  console.log('Generation complete:', data.outputs);
});
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project proj_xyz not found.",
    "status": 404,
    "request_id": "req_abc123"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for this action |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for this operation |
| `JOB_ALREADY_RUNNING` | 409 | A generation job is already in progress |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
