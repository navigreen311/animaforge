import { describe, it, expect } from 'vitest';
import {
  createExportJob,
  processVideoExport,
  processAudioExport,
  processProjectExport,
  processAvatarExport,
  getExportFormats,
} from '../../services/export/src/services/exportService';
import { getBitrate, getDurationLimit, getEncodingPreset } from '../../services/export/src/services/formatSpecs';
import type { VideoExportInput, AudioExportInput, ProjectExportInput, AvatarExportInput } from '../../services/export/src/models/exportSchemas';

const UUID = '00000000-0000-4000-8000-000000000001';

// ---------------------------------------------------------------------------
// 1. Video export - mp4
// ---------------------------------------------------------------------------
describe('Export - Video (mp4)', () => {
  it('completes an mp4/h264 export with correct output URL', () => {
    const params: VideoExportInput = {
      projectId: UUID, shotIds: [UUID], format: 'mp4', codec: 'h264', resolution: '1080p', fps: 30,
    };
    const job = createExportJob('video', params);
    const result = processVideoExport(job);
    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
    expect(result.outputUrl).toContain('.mp4');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.completedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Video export - webm
// ---------------------------------------------------------------------------
describe('Export - Video (webm)', () => {
  it('completes a webm/vp9 export', () => {
    const params: VideoExportInput = {
      projectId: UUID, shotIds: [UUID], format: 'webm', codec: 'vp9', resolution: '720p', fps: 24,
    };
    const job = createExportJob('video', params);
    const result = processVideoExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('.webm');
  });

  it('fails when codec is incompatible with format', () => {
    const params: VideoExportInput = {
      projectId: UUID, shotIds: [UUID], format: 'webm', codec: 'h264', resolution: '1080p', fps: 30,
    };
    const job = createExportJob('video', params);
    const result = processVideoExport(job);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('not compatible');
  });
});

// ---------------------------------------------------------------------------
// 3. Audio export - wav
// ---------------------------------------------------------------------------
describe('Export - Audio (wav)', () => {
  it('completes a wav audio export', () => {
    const params: AudioExportInput = { projectId: UUID, shotIds: [UUID], format: 'wav' };
    const job = createExportJob('audio', params);
    const result = processAudioExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('.wav');
    expect(result.fileSize).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Audio export - mp3
// ---------------------------------------------------------------------------
describe('Export - Audio (mp3)', () => {
  it('completes an mp3 audio export with correct size calculation', () => {
    const params: AudioExportInput = { projectId: UUID, shotIds: [UUID, UUID], format: 'mp3' };
    const job = createExportJob('audio', params);
    const result = processAudioExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('.mp3');
    // 2 shots * 5s each * 320 kbps / 8 = 400
    expect(result.fileSize).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 5. Avatar export - gltf
// ---------------------------------------------------------------------------
describe('Export - Avatar (gltf)', () => {
  it('completes a gltf avatar export', () => {
    const params: AvatarExportInput = { characterId: UUID, format: 'gltf' };
    const job = createExportJob('avatar', params);
    const result = processAvatarExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('.gltf');
    expect(result.fileSize).toBe(15_000);
  });
});

// ---------------------------------------------------------------------------
// 6. Avatar export - fbx
// ---------------------------------------------------------------------------
describe('Export - Avatar (fbx)', () => {
  it('completes an fbx avatar export with correct size', () => {
    const params: AvatarExportInput = { characterId: UUID, format: 'fbx' };
    const job = createExportJob('avatar', params);
    const result = processAvatarExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('.fbx');
    expect(result.fileSize).toBe(25_000);
  });
});

// ---------------------------------------------------------------------------
// 7. Project bundle
// ---------------------------------------------------------------------------
describe('Export - Project Bundle', () => {
  it('exports a project bundle with assets', () => {
    const params: ProjectExportInput = { projectId: UUID, format: 'mp4', includeAssets: true };
    const job = createExportJob('project', params);
    const result = processProjectExport(job);
    expect(result.status).toBe('completed');
    expect(result.outputUrl).toContain('project.zip');
    expect(result.fileSize).toBe(250_000);
  });

  it('exports a project bundle without assets', () => {
    const params: ProjectExportInput = { projectId: UUID, format: 'mp4', includeAssets: false };
    const job = createExportJob('project', params);
    const result = processProjectExport(job);
    expect(result.fileSize).toBe(50_000);
  });
});

// ---------------------------------------------------------------------------
// 8. Format validation, bitrate, cost estimation
// ---------------------------------------------------------------------------
describe('Export - Format Validation & Bitrate', () => {
  it('getSupportedFormats returns video, audio, and 3d categories', () => {
    const formats = getExportFormats();
    const categories = new Set(formats.map((f) => f.category));
    expect(categories).toContain('video');
    expect(categories).toContain('audio');
    expect(categories).toContain('3d');
    expect(formats.length).toBeGreaterThanOrEqual(10);
  });

  it('getBitrate returns known bitrate for h264@1080p', () => {
    expect(getBitrate('h264', '1080p')).toBe(10_000);
  });

  it('getBitrate returns fallback for unknown codec', () => {
    expect(getBitrate('unknown-codec', '1080p')).toBe(10_000);
  });

  it('getDurationLimit returns correct tier limits', () => {
    expect(getDurationLimit('free')).toBe(300);
    expect(getDurationLimit('pro')).toBe(1800);
    expect(getDurationLimit('enterprise')).toBe(7200);
  });

  it('getEncodingPreset returns a complete preset object', () => {
    const preset = getEncodingPreset('h265', '4k');
    expect(preset.codec).toBe('h265');
    expect(preset.container).toBe('mp4');
    expect(preset.bitrate).toBe('18000 kbps');
    expect(preset.description).toContain('H.265');
  });
});
