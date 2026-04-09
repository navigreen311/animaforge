'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type ExportScope = 'full' | 'selected' | 'single';
type Container = 'MP4' | 'MOV' | 'WEBM';
type VideoCodec = 'H.264' | 'H.265' | 'AV1';
type Resolution = '720p' | '1080p' | '4K';
type FPS = '24' | '30' | '60';
type AudioCodec = 'AAC' | 'Opus';
type AudioBitrate = '128' | '192' | '320';
type DeliveryPreset = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'custom';
type Pacing = 'fast' | 'moderate' | 'slow';
type AutoStyle = 'montage' | 'narrative' | 'documentary';

interface QCCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

const PRESETS: Record<DeliveryPreset, { container: Container; codec: VideoCodec; resolution: Resolution; fps: FPS }> = {
  youtube: { container: 'MP4', codec: 'H.264', resolution: '1080p', fps: '30' },
  tiktok: { container: 'MP4', codec: 'H.264', resolution: '1080p', fps: '30' },
  instagram: { container: 'MP4', codec: 'H.264', resolution: '1080p', fps: '30' },
  twitter: { container: 'MP4', codec: 'H.264', resolution: '720p', fps: '30' },
  custom: { container: 'MP4', codec: 'H.264', resolution: '1080p', fps: '24' },
};

const MOCK_QC: QCCheck[] = [
  { label: 'Resolution match', status: 'pass', detail: '1920x1080 matches target' },
  { label: 'Frame rate consistency', status: 'pass', detail: 'Stable 30fps across all shots' },
  { label: 'Audio levels', status: 'warn', detail: 'Shot 4 peak at -1.2dB — consider limiting' },
  { label: 'Color space', status: 'pass', detail: 'Rec. 709 consistent' },
  { label: 'Aspect ratio', status: 'pass', detail: '16:9 uniform' },
  { label: 'Codec compatibility', status: 'pass', detail: 'H.264 Level 4.1 — universal playback' },
  { label: 'Duration', status: 'pass', detail: '3m 12s within target range' },
];

const EXPORT_STAGES = ['Preparing', 'Encoding video', 'Encoding audio', 'Muxing', 'Applying watermark', 'Finalizing'];

const REPURPOSE_PLATFORMS = ['YouTube Shorts', 'TikTok', 'Instagram Reels', 'Twitter/X', 'LinkedIn'];
const PUBLISH_PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Twitter/X'];

const MUSIC_TRACKS = ['None', 'Ambient Pulse', 'Neon Drive', 'Cinematic Tension', 'Lo-Fi Drift', 'Epic Orchestral'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExportPage() {
  const params = useParams<{ id: string }>();

  // Export scope
  const [scope, setScope] = useState<ExportScope>('full');

  // Video
  const [container, setContainer] = useState<Container>('MP4');
  const [videoCodec, setVideoCodec] = useState<VideoCodec>('H.264');
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [fps, setFps] = useState<FPS>('30');

  // Audio
  const [audioCodec, setAudioCodec] = useState<AudioCodec>('AAC');
  const [audioBitrate, setAudioBitrate] = useState<AudioBitrate>('192');
  const [includeDialogue, setIncludeDialogue] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeSfx, setIncludeSfx] = useState(true);

  // Delivery preset
  const [preset, setPreset] = useState<DeliveryPreset>('custom');

  // Extras
  const [watermark, setWatermark] = useState(false);
  const [lowerThird, setLowerThird] = useState(false);
  const [endCard, setEndCard] = useState(false);
  const [brandSound, setBrandSound] = useState(false);
  const [c2pa, setC2pa] = useState(true);

  // QC & progress
  const [qcRun, setQcRun] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStage, setExportStage] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);

  // Repurpose (P2-2)
  const [repurposePlatforms, setRepurposePlatforms] = useState<Set<string>>(new Set());

  // Publish (P2-3)
  const [publishToggles, setPublishToggles] = useState<Set<string>>(new Set());
  const [publishTitle, setPublishTitle] = useState('Neon Odyssey — Official Teaser');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishTags, setPublishTags] = useState('animation, cyberpunk, ai, short-film');
  const [publishSchedule, setPublishSchedule] = useState('');

  // Auto-edit (P2-1)
  const [autoMusicTrack, setAutoMusicTrack] = useState('None');
  const [autoPacing, setAutoPacing] = useState<Pacing>('moderate');
  const [autoStyle, setAutoStyle] = useState<AutoStyle>('narrative');

  // Apply preset
  const applyPreset = (p: DeliveryPreset) => {
    setPreset(p);
    const s = PRESETS[p];
    setContainer(s.container);
    setVideoCodec(s.codec);
    setResolution(s.resolution);
    setFps(s.fps);
  };

  // Mock export animation
  useEffect(() => {
    if (!exporting) return;
    const interval = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setExporting(false);
          setExportDone(true);
          return 100;
        }
        const next = p + 2;
        setExportStage(Math.min(Math.floor(next / (100 / EXPORT_STAGES.length)), EXPORT_STAGES.length - 1));
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [exporting]);

  // Estimated size
  const sizeMap: Record<Resolution, number> = { '720p': 85, '1080p': 210, '4K': 820 };
  const codecMult: Record<VideoCodec, number> = { 'H.264': 1, 'H.265': 0.7, AV1: 0.6 };
  const estimatedMB = Math.round(sizeMap[resolution] * codecMult[videoCodec]);

  /* shared styles */
  const card = 'rounded-xl border border-gray-800 bg-gray-900 p-5';
  const label = 'block text-xs font-medium text-gray-400 mb-1.5';
  const input = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none';
  const btnPrimary = 'rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors';
  const btnSecondary = 'rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 transition-colors';

  const radioBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
      active ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`;

  const toggleRepurpose = (p: string) => {
    setRepurposePlatforms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const togglePublish = (p: string) => {
    setPublishToggles((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Export &amp; Delivery</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Project {params.id} &mdash; Configure output, run QC, and deliver
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================== */}
        {/*  LEFT COLUMN                                               */}
        {/* ========================================================== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Export scope */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Export Scope</h2>
            <div className="flex gap-2">
              {([['full', 'Full Project'], ['selected', 'Selected Shots'], ['single', 'Single Shot']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setScope(v)} className={radioBtn(scope === v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Video settings */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Video</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={label}>Container</label>
                <select value={container} onChange={(e) => setContainer(e.target.value as Container)} className={input}>
                  {(['MP4', 'MOV', 'WEBM'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Codec</label>
                <select value={videoCodec} onChange={(e) => setVideoCodec(e.target.value as VideoCodec)} className={input}>
                  {(['H.264', 'H.265', 'AV1'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Resolution</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className={input}>
                  {(['720p', '1080p', '4K'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>FPS</label>
                <select value={fps} onChange={(e) => setFps(e.target.value as FPS)} className={input}>
                  {(['24', '30', '60'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Audio settings */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Audio</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={label}>Codec</label>
                <select value={audioCodec} onChange={(e) => setAudioCodec(e.target.value as AudioCodec)} className={input}>
                  {(['AAC', 'Opus'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Bitrate (kbps)</label>
                <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value as AudioBitrate)} className={input}>
                  {(['128', '192', '320'] as const).map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              {[
                { label: 'Dialogue', value: includeDialogue, set: setIncludeDialogue },
                { label: 'Music', value: includeMusic, set: setIncludeMusic },
                { label: 'SFX', value: includeSfx, set: setIncludeSfx },
              ].map((ch) => (
                <label key={ch.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ch.value} onChange={() => ch.set(!ch.value)} className="rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500" />
                  <span className="text-xs text-gray-300">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery presets */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Delivery Presets</h2>
            <div className="flex flex-wrap gap-2">
              {(['youtube', 'tiktok', 'instagram', 'twitter', 'custom'] as const).map((p) => (
                <button key={p} type="button" onClick={() => applyPreset(p)} className={radioBtn(preset === p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Extras</h2>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Watermark', value: watermark, set: setWatermark },
                { label: 'Lower third', value: lowerThird, set: setLowerThird },
                { label: 'End card', value: endCard, set: setEndCard },
                { label: 'Brand sound', value: brandSound, set: setBrandSound },
                { label: 'C2PA provenance', value: c2pa, set: setC2pa },
              ].map((ch) => (
                <label key={ch.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ch.value} onChange={() => ch.set(!ch.value)} className="rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500" />
                  <span className="text-xs text-gray-300">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Estimated size + actions */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500">Estimated file size</span>
                <p className="text-lg font-bold text-gray-100">{estimatedMB} MB</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setQcRun(true)} className={btnSecondary}>Run QC Check</button>
                <button
                  type="button"
                  onClick={() => { setExporting(true); setExportProgress(0); setExportStage(0); setExportDone(false); }}
                  disabled={exporting}
                  className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  P2-1: Auto-Edit / Auto-Assemble                        */}
          {/* -------------------------------------------------------- */}
          <div className={`${card} border-violet-800/30`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600/30 text-violet-300 uppercase tracking-wider">Phase 2</span>
              <h2 className="text-sm font-semibold text-gray-200">Auto-Assemble</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={label}>Music Track</label>
                <select value={autoMusicTrack} onChange={(e) => setAutoMusicTrack(e.target.value)} className={input}>
                  {MUSIC_TRACKS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Pacing</label>
                <select value={autoPacing} onChange={(e) => setAutoPacing(e.target.value as Pacing)} className={input}>
                  {(['fast', 'moderate', 'slow'] as const).map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Style</label>
                <select value={autoStyle} onChange={(e) => setAutoStyle(e.target.value as AutoStyle)} className={input}>
                  {(['montage', 'narrative', 'documentary'] as const).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <button type="button" className={btnPrimary}>Auto-Assemble Rough Cut</button>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  P2-2: Repurpose                                         */}
          {/* -------------------------------------------------------- */}
          <div className={`${card} border-violet-800/30`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600/30 text-violet-300 uppercase tracking-wider">Phase 2</span>
              <h2 className="text-sm font-semibold text-gray-200">Repurpose</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Generate platform-optimised variants automatically.</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {REPURPOSE_PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={repurposePlatforms.has(p)} onChange={() => toggleRepurpose(p)} className="rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500" />
                  <span className="text-xs text-gray-300">{p}</span>
                </label>
              ))}
            </div>
            <button type="button" disabled={repurposePlatforms.size === 0} className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}>
              Generate Variants
            </button>
          </div>

          {/* -------------------------------------------------------- */}
          {/*  P2-3: Publish                                           */}
          {/* -------------------------------------------------------- */}
          <div className={`${card} border-violet-800/30`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600/30 text-violet-300 uppercase tracking-wider">Phase 2</span>
              <h2 className="text-sm font-semibold text-gray-200">Publish</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {PUBLISH_PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-gray-300">{p}</span>
                    <button
                      type="button"
                      onClick={() => togglePublish(p)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${publishToggles.has(p) ? 'bg-violet-600' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${publishToggles.has(p) ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                ))}
              </div>
              <div>
                <label className={label}>Title</label>
                <input type="text" value={publishTitle} onChange={(e) => setPublishTitle(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Description</label>
                <textarea rows={3} value={publishDesc} onChange={(e) => setPublishDesc(e.target.value)} className={`${input} resize-none`} placeholder="Enter description..." />
              </div>
              <div>
                <label className={label}>Tags</label>
                <input type="text" value={publishTags} onChange={(e) => setPublishTags(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Schedule</label>
                <input type="datetime-local" value={publishSchedule} onChange={(e) => setPublishSchedule(e.target.value)} className={input} />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/*  RIGHT COLUMN                                              */}
        {/* ========================================================== */}
        <div className="space-y-5">
          {/* QC Report */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">QC Report</h2>
            {!qcRun ? (
              <p className="text-xs text-gray-600 text-center py-6">Run a QC check to see results.</p>
            ) : (
              <div className="space-y-2">
                {MOCK_QC.map((check) => (
                  <div key={check.label} className="flex items-start gap-2 p-2 rounded-lg bg-gray-800">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      check.status === 'pass' ? 'bg-green-400' : check.status === 'warn' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <p className="text-xs font-medium text-gray-300">{check.label}</p>
                      <p className="text-[10px] text-gray-500">{check.detail}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-400">
                    <span className="text-green-400 font-medium">6 passed</span>
                    {' '}&middot;{' '}
                    <span className="text-yellow-400 font-medium">1 warning</span>
                    {' '}&middot;{' '}
                    <span className="text-gray-600">0 failed</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Export progress */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Export Progress</h2>
            {!exporting && !exportDone ? (
              <p className="text-xs text-gray-600 text-center py-6">Start an export to track progress.</p>
            ) : (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{EXPORT_STAGES[exportStage]}</span>
                  <span className="text-xs font-medium text-gray-300">{exportProgress}%</span>
                </div>

                {/* Stage list */}
                <div className="space-y-1.5 pt-2">
                  {EXPORT_STAGES.map((stage, i) => {
                    const done = i < exportStage || exportDone;
                    const active = i === exportStage && exporting;
                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-400' : active ? 'bg-violet-400 animate-pulse' : 'bg-gray-700'}`} />
                        <span className={`text-[11px] ${done ? 'text-gray-400' : active ? 'text-violet-300' : 'text-gray-600'}`}>{stage}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Download / share */}
                {exportDone && (
                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <button type="button" className={`${btnPrimary} flex-1`}>Download</button>
                    <button type="button" className={`${btnSecondary} flex-1`}>Share Link</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
