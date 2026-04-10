'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Users,
  Zap,
  MessageSquare,
  Square,
  Circle,
  ChevronDown,
  Smile,
  Frown,
  Angry,
  Heart,
  Sparkles,
  Flame,
  Meh,
  CloudRain,
  CheckCircle2,
  XCircle,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ───────────────────────────────────────────────────── */

type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Surprised' | 'Fear' | 'Disgust' | 'Neutral' | 'Excited';
type Pose = 'Idle' | 'Wave' | 'Point' | 'Sit' | 'Dance';
type LipSyncSource = 'Voice input' | 'Text-to-speech' | 'None';
type QualityPreset = 'Low/720p' | 'HD/1080p' | 'Studio/4K';

interface Destination {
  id: string;
  label: string;
  connected: boolean;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  color: string;
}

interface SceneBranch {
  id: string;
  title: string;
  description: string;
}

interface ReactionFloat {
  id: number;
  emoji: string;
  left: number;
}

/* ── Mock Data ───────────────────────────────────────────────── */

const AVATARS = ['Nova (Default)', 'Aria', 'Kai', 'Luna', 'Orion'];

const EMOTIONS: { name: Emotion; icon: React.ElementType; color: string }[] = [
  { name: 'Happy',     icon: Smile,     color: '#ffd460' },
  { name: 'Sad',       icon: CloudRain, color: '#5a9fd4' },
  { name: 'Angry',     icon: Angry,     color: '#e94560' },
  { name: 'Surprised', icon: Sparkles,  color: '#c77dff' },
  { name: 'Fear',      icon: Frown,     color: '#7b2ff7' },
  { name: 'Disgust',   icon: Meh,       color: '#7ec8a0' },
  { name: 'Neutral',   icon: Meh,       color: '#888888' },
  { name: 'Excited',   icon: Flame,     color: '#ff6b9d' },
];

const POSES: Pose[] = ['Idle', 'Wave', 'Point', 'Sit', 'Dance'];

const QUALITY_PRESETS: QualityPreset[] = ['Low/720p', 'HD/1080p', 'Studio/4K'];

const DESTINATIONS: Destination[] = [
  { id: 'twitch',  label: 'Twitch',       connected: true },
  { id: 'youtube', label: 'YouTube Live', connected: true },
  { id: 'rtmp',    label: 'Custom RTMP',  connected: false },
];

const MOCK_CHAT: ChatMessage[] = [
  { id: 'm1', user: 'pixelPanda',  text: 'This looks amazing!',          color: '#ff6b9d' },
  { id: 'm2', user: 'neonDrifter', text: 'How did you rig that?',        color: '#00d4ff' },
  { id: 'm3', user: 'kodaFrames',  text: 'Wave hello to chat!',          color: '#ffd460' },
  { id: 'm4', user: 'lumenArt',    text: 'Loving the lighting setup',    color: '#c77dff' },
  { id: 'm5', user: 'vectorVibe',  text: 'Do the dance pose next pls',   color: '#7ec8a0' },
];

const SCENE_BRANCHES: SceneBranch[] = [
  { id: 'b1', title: 'Interview Set',     description: 'Two-camera sit-down, warm lighting' },
  { id: 'b2', title: 'Outdoor Plaza',     description: 'Daylight exterior with crowd ambience' },
  { id: 'b3', title: 'Neon Alley',        description: 'Night scene, cyberpunk atmosphere' },
];

const REACTION_EMOJIS = ['❤️', '🔥', '✨', '😂', '👏', '🎉'];

/* ── Shared Styles ───────────────────────────────────────────── */

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  padding: 14,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 10px',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
  margin: '0 0 6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-sunken)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity 0.15s ease',
};

const btnSecondary: React.CSSProperties = {
  background: 'var(--bg-sunken)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity 0.15s ease',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-sunken)',
  border: '0.5px solid var(--border)',
  fontSize: 10,
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

/* ── Helpers ─────────────────────────────────────────────────── */

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── Component ───────────────────────────────────────────────── */

export default function LivePage() {
  /* ── Session state ───────────────────────────── */
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(2535); // 00:42:15
  const [viewers] = useState(247);
  const [latency] = useState('1.2s avg');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [avatarDropOpen, setAvatarDropOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [destinations, setDestinations] = useState<Record<string, boolean>>({
    twitch: true,
    youtube: false,
    rtmp: false,
  });
  const [quality, setQuality] = useState<QualityPreset>('HD/1080p');

  /* ── Viewport state ──────────────────────────── */
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(72);

  /* ── Reactive avatar state ───────────────────── */
  const [emotion, setEmotion] = useState<Emotion>('Happy');
  const [pose, setPose] = useState<Pose>('Idle');
  const [lipSync, setLipSync] = useState<LipSyncSource>('Voice input');

  /* ── Narrative state ─────────────────────────── */
  const [currentScene, setCurrentScene] = useState('Main Stage');

  /* ── Audience state ──────────────────────────── */
  const [chatPaused, setChatPaused] = useState(false);
  const [chatMuted, setChatMuted] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [reactions, setReactions] = useState<ReactionFloat[]>([]);
  const reactionIdRef = useRef(0);

  /* ── Duration counter ────────────────────────── */
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  /* ── Chat scroll simulation ──────────────────── */
  useEffect(() => {
    if (chatPaused || chatMuted) return;
    const t = setInterval(() => {
      setChatMessages((prev) => {
        const next = [...prev.slice(1), {
          ...prev[0],
          id: `m-${Date.now()}`,
        }];
        return next;
      });
    }, 2600);
    return () => clearInterval(t);
  }, [chatPaused, chatMuted]);

  /* ── Reaction float spawner ──────────────────── */
  useEffect(() => {
    const t = setInterval(() => {
      const id = ++reactionIdRef.current;
      const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
      const left = 20 + Math.random() * 60;
      setReactions((prev) => [...prev, { id, emoji, left }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    }, 900);
    return () => clearInterval(t);
  }, []);

  /* ── Handlers ─────────────────────────────────── */
  const toggleBroadcast = useCallback(() => {
    setIsLive((prev) => {
      const next = !prev;
      toast[next ? 'success' : 'info'](next ? 'Broadcast started' : 'Broadcast stopped');
      return next;
    });
  }, []);

  const toggleDestination = (id: string) => {
    setDestinations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const triggerBranch = (branch: SceneBranch) => {
    setCurrentScene(branch.title);
    toast.success(`Transitioning to "${branch.title}"`);
  };

  /* ── Render ───────────────────────────────────── */
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 320px',
        gap: 12,
        padding: 16,
        minHeight: '100vh',
        background: 'var(--bg-base)',
        boxSizing: 'border-box',
      }}
    >
      {/* ══════════════════════════════════════════ */}
      {/*  LEFT SIDEBAR — Session controls           */}
      {/* ══════════════════════════════════════════ */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        {/* Header */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={15} /> Live Session
            </h2>
            <span
              style={{
                ...badgeStyle,
                background: isLive ? 'rgba(233, 69, 96, 0.15)' : 'var(--bg-sunken)',
                borderColor: isLive ? 'rgba(233, 69, 96, 0.4)' : 'var(--border)',
                color: isLive ? '#ff5872' : 'var(--text-secondary)',
              }}
            >
              {isLive ? (
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: 9 }}
                >
                  ●
                </motion.span>
              ) : (
                <span style={{ fontSize: 9 }}>○</span>
              )}
              {isLive ? 'Live' : 'Off-air'}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleBroadcast}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: isLive ? '#e94560' : 'var(--brand)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              letterSpacing: '0.3px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {isLive ? <><Square size={14} /> Stop broadcast</> : <><Circle size={14} fill="#fff" /> Start broadcast</>}
          </button>
        </div>

        {/* Session info */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Session Info</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Duration"  value={formatDuration(duration)} mono />
            <InfoRow label="Viewers"   value={viewers.toLocaleString()} icon={Users} />
            <InfoRow label="Latency"   value={latency} icon={Zap} />
          </div>
        </div>

        {/* Avatar & inputs */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Avatar & Inputs</p>

          <p style={subLabelStyle}>Drive avatar</p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setAvatarDropOpen((o) => !o)}
              style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{avatar}</span>
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {avatarDropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 4,
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setAvatar(a); setAvatarDropOpen(false); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '7px 9px',
                        background: avatar === a ? 'var(--bg-hover)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: 11,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <ToggleTile
              active={micOn}
              onClick={() => setMicOn((v) => !v)}
              IconOn={Mic}
              IconOff={MicOff}
              label="Voice"
            />
            <ToggleTile
              active={camOn}
              onClick={() => setCamOn((v) => !v)}
              IconOn={Camera}
              IconOff={CameraOff}
              label="Camera"
            />
          </div>
        </div>

        {/* Destinations */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Output Destinations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DESTINATIONS.map((d) => (
              <label
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!destinations[d.id]}
                    onChange={() => toggleDestination(d.id)}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.label}</span>
                </span>
                {d.connected ? (
                  <CheckCircle2 size={12} color="#7ec8a0" />
                ) : (
                  <XCircle size={12} color="var(--text-tertiary)" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Quality preset */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Quality Preset</p>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
              border: '0.5px solid var(--border)',
            }}
          >
            {QUALITY_PRESETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  background: quality === q ? 'var(--brand)' : 'transparent',
                  color: quality === q ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════ */}
      {/*  CENTER — Live Preview Viewport            */}
      {/* ══════════════════════════════════════════ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ ...panelStyle, padding: 16 }}>
          {/* 16:9 preview area */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, #1a0a3e 0%, #0f3460 35%, #533483 70%, #e94560 100%)',
              border: '0.5px solid var(--border)',
            }}
          >
            {/* LIVE badge top-left */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: 'rgba(233, 69, 96, 0.92)',
                borderRadius: 'var(--radius-md)',
                fontSize: 11,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.8px',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
              LIVE
            </div>

            {/* REC indicator top-right */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)',
                fontSize: 11,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.5px',
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.85, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#e94560',
                  display: 'inline-block',
                }}
              />
              REC
            </div>

            {/* Bottom-left: avatar name + speaking */}
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)',
                fontSize: 11,
                color: '#ffffff',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e94560, #c77dff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {avatar[0]}
              </div>
              <span style={{ fontWeight: 600 }}>{avatar.split(' ')[0]}</span>
              <span style={{ color: '#7ec8a0', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#7ec8a0',
                    display: 'inline-block',
                  }}
                />
                Speaking
              </span>
            </div>

            {/* Bottom-right: audience reaction float area */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 120,
                height: '70%',
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              <AnimatePresence>
                {reactions.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -180, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: `${r.left}%`,
                      fontSize: 22,
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                    }}
                  >
                    {r.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Center overlay label */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                pointerEvents: 'none',
              }}
            >
              PREVIEW
            </div>
          </div>

          {/* Controls bar */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'var(--bg-sunken)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <IconButton
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </IconButton>

            <IconButton
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </IconButton>

            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{
                flex: '0 0 120px',
                accentColor: 'var(--brand)',
                cursor: 'pointer',
              }}
            />

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 8px',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Scenes
              </span>
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 2,
                }}
              >
                {[25, 55, 82].map((pct, i) => (
                  <div
                    key={i}
                    title={`Scene marker ${i + 1}`}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: -3,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      border: '2px solid var(--bg-sunken)',
                      transform: 'translateX(-50%)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <IconButton onClick={() => toast.info('Fullscreen (mock)')} aria-label="Fullscreen">
              <Maximize size={14} />
            </IconButton>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ */}
      {/*  RIGHT SIDEBAR — Reactive + audience       */}
      {/* ══════════════════════════════════════════ */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        {/* Reactive avatar */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Reactive Avatar</p>

          <p style={subLabelStyle}>Emotion</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              marginBottom: 12,
            }}
          >
            {EMOTIONS.map(({ name, icon: Icon, color }) => {
              const active = emotion === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setEmotion(name)}
                  title={name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '8px 4px',
                    background: active ? 'var(--bg-hover)' : 'var(--bg-sunken)',
                    border: `0.5px solid ${active ? color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: active ? color : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={13} />
                  <span style={{ fontSize: 9, fontWeight: 600 }}>{name}</span>
                </button>
              );
            })}
          </div>

          <p style={subLabelStyle}>Pose</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {POSES.map((p) => {
              const active = pose === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPose(p)}
                  style={{
                    padding: '7px 12px',
                    background: active ? 'var(--brand)' : 'var(--bg-sunken)',
                    color: active ? '#ffffff' : 'var(--text-primary)',
                    border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <p style={subLabelStyle}>Lip sync source</p>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
              border: '0.5px solid var(--border)',
            }}
          >
            {(['Voice input', 'Text-to-speech', 'None'] as LipSyncSource[]).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setLipSync(src)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  background: lipSync === src ? 'var(--brand)' : 'transparent',
                  color: lipSync === src ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {/* Branching narrative */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Branching Narrative</p>

          <div
            style={{
              padding: '8px 10px',
              background: 'var(--bg-sunken)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Current Scene
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>
                {currentScene}
              </div>
            </div>
            <span style={badgeStyle}>Active</span>
          </div>

          <p style={subLabelStyle}>Next Scene Options</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCENE_BRANCHES.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-sunken)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.4 }}>
                  {b.description}
                </div>
                <button
                  type="button"
                  onClick={() => triggerBranch(b)}
                  style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}
                >
                  Trigger transition <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Audience interaction */}
        <div style={panelStyle}>
          <p style={sectionLabelStyle}>Audience Interaction</p>

          <p style={subLabelStyle}>
            <MessageSquare size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Live Chat
          </p>
          <div
            style={{
              height: 140,
              overflow: 'hidden',
              background: 'var(--bg-sunken)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 8,
              marginBottom: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              opacity: chatMuted ? 0.4 : 1,
            }}
          >
            <AnimatePresence initial={false}>
              {chatMessages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 11, lineHeight: 1.4 }}
                >
                  <span style={{ color: m.color, fontWeight: 600 }}>{m.user}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{m.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <p style={subLabelStyle}>Reaction Stream</p>
          <div
            style={{
              position: 'relative',
              height: 42,
              background: 'var(--bg-sunken)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 10,
              overflow: 'hidden',
            }}
          >
            <AnimatePresence>
              {reactions.slice(0, 6).map((r) => (
                <motion.span
                  key={`rs-${r.id}`}
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -30, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.4, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: `${r.left}%`,
                    fontSize: 18,
                  }}
                >
                  {r.emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setChatPaused((p) => !p);
                toast.info(chatPaused ? 'Stream resumed' : 'Stream paused');
              }}
              style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
            >
              {chatPaused ? <Play size={11} /> : <Pause size={11} />}
              {chatPaused ? 'Resume' : 'Pause'} stream
            </button>
            <button
              type="button"
              onClick={() => {
                setChatMuted((m) => !m);
                toast.info(chatMuted ? 'Chat unmuted' : 'Chat muted');
              }}
              style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
            >
              {chatMuted ? <Volume2 size={11} /> : <VolumeX size={11} />}
              {chatMuted ? 'Unmute' : 'Mute'} chat
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── Subcomponents ───────────────────────────────────────────── */

function InfoRow({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
      }}
    >
      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon ? <Icon size={11} /> : null}
        {label}
      </span>
      <span
        style={{
          color: 'var(--text-primary)',
          fontWeight: 600,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ToggleTile({
  active,
  onClick,
  IconOn,
  IconOff,
  label,
}: {
  active: boolean;
  onClick: () => void;
  IconOn: React.ElementType;
  IconOff: React.ElementType;
  label: string;
}) {
  const Icon = active ? IconOn : IconOff;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '10px 6px',
        background: active ? 'var(--bg-hover)' : 'var(--bg-sunken)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={14} />
      {label}: {active ? 'On' : 'Off'}
    </button>
  );
}

function IconButton({
  onClick,
  children,
  'aria-label': ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        background: 'transparent',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
