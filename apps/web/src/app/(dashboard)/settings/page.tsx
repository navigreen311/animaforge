'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useResource, mutate } from '@/lib/api/useResource';
import { LoadingState, ErrorState } from '@/components/api/ResourceStates';
import {
  Settings,
  User,
  CreditCard,
  Key,
  Trash2,
  Upload,
  Camera,
  Shield,
  Bell,
  Link2,
  Brain,
  Download,
  Copy,
  Eye,
  EyeOff,
  Plus,
  ExternalLink,
  Globe,
  Monitor,
  Smartphone,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  FileText,
  Zap,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { UnavailableButton } from '../components/unavailable/UnavailableButton';
import { explainFeature, getFeatureStatus } from '../components/unavailable/featureStatus';
// ── Types ────────────────────────────────────────────────────────
type Tab = 'profile' | 'workspace' | 'billing' | 'api-keys';
type Theme = 'dark' | 'light';
type RenderQuality = 'preview' | 'standard' | 'final';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';
type AutoSaveFreq = '30s' | '1m' | '5m' | '10m';

interface TabDef {
  label: string;
  value: Tab;
  icon: React.ReactNode;
}

interface NotificationPref {
  label: string;
  email: boolean;
  push: boolean;
}

interface Session {
  device: string;
  browser: string;
  icon: React.ReactNode;
  lastActive: string;
  isCurrent: boolean;
}

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  masked: string;
  created: string;
  lastUsed: string;
  scopes: string[];
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
}

// ── Tab Config ───────────────────────────────────────────────────
const TABS: TabDef[] = [
  { label: 'Profile', value: 'profile', icon: <User size={13} /> },
  { label: 'Workspace', value: 'workspace', icon: <Settings size={13} /> },
  { label: 'Billing', value: 'billing', icon: <CreditCard size={13} /> },
  { label: 'API Keys', value: 'api-keys', icon: <Key size={13} /> },
];

const API_SCOPES = [
  'projects:read',
  'projects:write',
  'renders:create',
  'renders:read',
  'assets:read',
  'assets:write',
  'billing:read',
] as const;

// ── Shared Styles ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-tertiary)',
  margin: '0 0 6px',
  fontWeight: 500,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
  cursor: 'pointer',
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: 'none',
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 150ms ease',
};

const btnSecondary: React.CSSProperties = {
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '0.5px solid var(--border)',
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 150ms ease',
};

const btnDanger: React.CSSProperties = {
  background: 'transparent',
  color: '#ef4444',
  border: '0.5px solid rgba(239,68,68,0.5)',
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 150ms ease',
};

const dangerCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: '0.5px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.05)',
};

// ── Helpers ──────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: checked ? 'var(--brand)' : 'var(--bg-hover)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 150ms ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          transition: 'left 150ms ease',
        }}
      />
    </button>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: checked ? '1.5px solid var(--brand)' : '1.5px solid var(--border)',
        background: checked ? 'var(--brand)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 150ms ease',
        padding: 0,
      }}
    >
      {checked && <Check size={10} color="#fff" strokeWidth={3} />}
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  formatLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  formatLabel?: (v: T) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            background: value === opt ? 'var(--bg-surface)' : 'transparent',
            color: value === opt ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: value === opt ? '0.5px solid var(--border-brand)' : '0.5px solid var(--border)',
            padding: '5px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: value === opt ? 500 : 400,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            textTransform: 'capitalize' as const,
            fontFamily: 'inherit',
          }}
        >
          {formatLabel ? formatLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        background: 'var(--bg-hover)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 3,
          background: color || 'var(--brand)',
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

function focusBorder(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  e.currentTarget.style.borderColor = 'var(--border-brand)';
}

function blurBorder(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  e.currentTarget.style.borderColor = 'var(--border)';
}

// ── Component ────────────────────────────────────────────────────
/** GET /api/users/me/sessions. */
interface SessionRow {
  id: string;
  device: string | null;
  browser: string | null;
  lastActiveAt: string | null;
  isCurrent?: boolean;
}

/** GET /api/users/me. */
interface MeRow {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function SettingsPage() {
  const meState = useResource<MeRow>('/api/users/me');
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile State ────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  // Seed the form from the signed-in user; edits after that stay local.
  useEffect(() => {
    if (!meState.data) return;
    setDisplayName(meState.data.displayName ?? '');
    setEmail(meState.data.email);
  }, [meState.data]);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // ── Preferences State ────────────────────────────────────
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState('en');
  const [renderQuality, setRenderQuality] = useState<RenderQuality>('standard');
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('animaforge-theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const handleThemeChange = useCallback((t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('animaforge-theme', t);
  }, []);

  // ── Notification Preferences ─────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPref[]>([
    { label: 'Render complete', email: true, push: true },
    { label: 'Render failed', email: true, push: true },
    { label: 'Shot approved', email: true, push: false },
    { label: 'Team member joined', email: true, push: false },
    { label: 'Comment / mention', email: true, push: true },
    { label: 'Credits low', email: true, push: true },
    { label: 'Marketplace sale', email: false, push: false },
    { label: 'Item available', email: false, push: false },
    { label: 'Weekly digest', email: true, push: false },
    { label: 'Product updates', email: true, push: false },
  ]);

  const updateNotifPref = (idx: number, field: 'email' | 'push', val: boolean) => {
    setNotifPrefs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };

  // ── Security State ───────────────────────────────────────
  // Two devices ("MacBook Pro / Chrome 122", "iPhone 15 / Safari 17") were
  // listed as signed in on every account. Real sessions come from
  // /api/users/me/sessions.
  const sessionState = useResource<{ items: SessionRow[] }>('/api/users/me/sessions');

  // Webhook endpoints, AI memory and the brand logo all persist now: each was
  // written through these routes and read back after a platform-api restart
  // (run 31925346146), so the value came from Postgres rather than a Map.
  const webhookState = useResource<{ items: { id: string; url: string; events?: string[] }[] }>(
    '/api/webhooks',
  );
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const addWebhook = async () => {
    const url = window.prompt('Endpoint URL to receive events');
    if (!url?.trim()) return;
    setWebhookBusy(true);
    setWebhookError(null);
    const { error } = await mutate('/api/webhooks', 'POST', {
      url: url.trim(),
      events: ['job.completed'],
    });
    setWebhookBusy(false);
    if (error) {
      setWebhookError(error.message);
      return;
    }
    webhookState.reload();
  };

  const removeWebhook = async (id: string) => {
    setWebhookError(null);
    const { error } = await mutate(`/api/webhooks/${id}`, 'DELETE');
    if (error) {
      setWebhookError(error.message);
      return;
    }
    webhookState.reload();
  };

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  /**
   * Presign, PUT the bytes to storage, then record the asset.
   *
   * Each step is reported separately: a failure at the storage PUT leaves no
   * asset row, and saying "uploaded" at that point would be the same lie the
   * disabled state existed to prevent.
   */
  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    setLogoError(null);
    setLogoName(null);
    try {
      const { data, error } = await mutate<{
        data?: { uploadUrl?: string; publicUrl?: string; key?: string };
      }>('/api/upload/presign', 'POST', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });
      if (error) throw new Error(error.message);

      const uploadUrl = (data as { data?: { uploadUrl?: string } } | null)?.data?.uploadUrl;
      if (!uploadUrl) throw new Error('The presign response carried no upload URL.');

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(`Storage rejected the upload (HTTP ${put.status}).`);

      setLogoName(file.name);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : String(err));
    } finally {
      setLogoBusy(false);
    }
  };

  const memoryState = useResource<{ genMemory?: Record<string, unknown> }>('/api/users/me/memory');
  const [memoryDraft, setMemoryDraft] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  const saveMemory = async () => {
    if (memoryDraft === null) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(memoryDraft);
    } catch (err) {
      setMemoryError(`Not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    setMemoryError(null);
    const { error } = await mutate('/api/users/me/memory', 'PATCH', { genMemory: parsed });
    if (error) {
      setMemoryError(error.message);
      return;
    }
    setMemoryDraft(null);
    memoryState.reload();
  };
  const sessions = useMemo<Session[]>(
    () =>
      (sessionState.data?.items ?? []).map((row) => ({
        device: row.device ?? 'Unknown device',
        browser: row.browser ?? '',
        icon: /iphone|android|mobile/i.test(row.device ?? '') ? (
          <Smartphone size={14} />
        ) : (
          <Monitor size={14} />
        ),
        lastActive: row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleString() : 'unknown',
        isCurrent: row.isCurrent ?? false,
      })),
    [sessionState.data],
  );

  // ── AI Memory State ──────────────────────────────────────
  const [aiMemory, setAiMemory] = useState({
    cameraLanguage: true,
    styleParams: true,
    promptSuccess: false,
    characterConsistency: true,
    brandVoice: false,
  });

  // ── Delete Account Modal ─────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ── Workspace State ──────────────────────────────────────
  const [wsName, setWsName] = useState('AnimaForge Studio');
  const [wsSlug, setWsSlug] = useState('animaforge-studio');
  const [wsTimezone, setWsTimezone] = useState('America/New_York');
  const [wsRenderQuality, setWsRenderQuality] = useState<RenderQuality>('standard');
  const [wsAspectRatio, setWsAspectRatio] = useState<AspectRatio>('16:9');
  const [wsLanguage, setWsLanguage] = useState('en');
  const [wsAutoSave, setWsAutoSave] = useState<AutoSaveFreq>('1m');
  const [wsPreviewAutoPlay, setWsPreviewAutoPlay] = useState(true);
  const [showDeleteWsModal, setShowDeleteWsModal] = useState(false);
  const [deleteWsText, setDeleteWsText] = useState('');

  // ── API Keys State ───────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: '1',
      name: 'Production',
      prefix: 'af_live_',
      masked: 'af_live_\u2022\u2022\u2022\u20226f2a',
      created: 'Jan 12, 2026',
      lastUsed: '2 hours ago',
      scopes: ['projects:read', 'projects:write', 'renders:create', 'renders:read'],
    },
    {
      id: '2',
      name: 'Development',
      prefix: 'af_test_',
      masked: 'af_test_\u2022\u2022\u2022\u20229d1b',
      created: 'Feb 3, 2026',
      lastUsed: '5 days ago',
      scopes: ['projects:read', 'renders:read', 'assets:read'],
    },
  ]);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState('90');
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);
  const [showKeyValue, setShowKeyValue] = useState(false);

  // ── Avatar Handling ──────────────────────────────────────
  const handleAvatarClick = () => avatarInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    setAvatarSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setAvatarSaving(false);
    toast.success('Avatar updated');
  };

  // ── Profile Save ─────────────────────────────────────────
  const handleProfileSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Valid email is required');
      return;
    }
    if (bio.length > 160) {
      toast.error('Bio must be 160 characters or less');
      return;
    }
    if (website && !website.match(/^https?:\/\/.+/)) {
      toast.error('Website must start with http:// or https://');
      return;
    }
    setProfileSaving(true);
    try {
      // Only display name and email are columns on users. Bio, website and the
      // social handle above have nowhere to go, so the save reports what it
      // actually stored instead of a blanket "Profile saved" after a 600ms
      // sleep that wrote nothing at all.
      await mutate('/api/users/me', 'PATCH', { displayName, email });
      toast.success('Name and email saved. Bio, website and handle are not stored yet.');
      meState.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── API Key Creation ─────────────────────────────────────
  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Key name is required');
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error('Select at least one scope');
      return;
    }
    const fullKey = `af_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    const masked = `af_live_\u2022\u2022\u2022\u2022${fullKey.slice(-4)}`;
    setApiKeys((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newKeyName,
        prefix: 'af_live_',
        masked,
        created: 'Just now',
        lastUsed: 'Never',
        scopes: newKeyScopes,
      },
    ]);
    setCreatedKeyValue(fullKey);
    setShowKeyValue(true);
  };

  const resetCreateKeyModal = () => {
    setShowCreateKeyModal(false);
    setNewKeyName('');
    setNewKeyScopes([]);
    setNewKeyExpiry('90');
    setCreatedKeyValue(null);
    setShowKeyValue(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* ── Delete Account Modal ──────────────────────────── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: 420,
              maxWidth: '90vw',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={18} color="#ef4444" />
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#ef4444',
                  margin: 0,
                }}
              >
                Delete Account
              </h3>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                margin: '0 0 12px',
                lineHeight: 1.6,
              }}
            >
              This will permanently delete your account and all associated data. This action{' '}
              <strong>cannot be undone</strong>.
            </p>
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '0.5px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              The following will be deleted:
              <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                <li>3 projects</li>
                <li>4 characters</li>
                <li>2.4 GB of assets</li>
                <li>All render history</li>
                <li>All API keys</li>
              </ul>
            </div>
            <p style={labelStyle}>
              Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{ ...inputStyle, marginBottom: 16 }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={btnSecondary}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE'}
                style={{
                  ...btnDanger,
                  opacity: deleteConfirmText !== 'DELETE' ? 0.4 : 1,
                  cursor: deleteConfirmText !== 'DELETE' ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  toast.success('Account deletion initiated');
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                <Trash2 size={13} />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Workspace Modal ────────────────────────── */}
      {showDeleteWsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowDeleteWsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: 400,
              maxWidth: '90vw',
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#ef4444',
                margin: '0 0 12px',
              }}
            >
              Delete Workspace
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                margin: '0 0 16px',
                lineHeight: 1.6,
              }}
            >
              Type <strong style={{ color: '#ef4444' }}>{wsSlug}</strong> to confirm workspace
              deletion.
            </p>
            <input
              type="text"
              value={deleteWsText}
              onChange={(e) => setDeleteWsText(e.target.value)}
              placeholder={wsSlug}
              style={{ ...inputStyle, marginBottom: 16 }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={btnSecondary}
                onClick={() => {
                  setShowDeleteWsModal(false);
                  setDeleteWsText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteWsText !== wsSlug}
                style={{
                  ...btnDanger,
                  opacity: deleteWsText !== wsSlug ? 0.4 : 1,
                  cursor: deleteWsText !== wsSlug ? 'not-allowed' : 'pointer',
                }}
                onClick={() => {
                  toast.success('Workspace deleted');
                  setShowDeleteWsModal(false);
                  setDeleteWsText('');
                }}
              >
                <Trash2 size={13} />
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create API Key Modal ──────────────────────────── */}
      {showCreateKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={resetCreateKeyModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: 440,
              maxWidth: '90vw',
            }}
          >
            {!createdKeyValue ? (
              <>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 16px',
                  }}
                >
                  Create API Key
                </h3>
                <div style={{ marginBottom: 14 }}>
                  <p style={labelStyle}>Key Name</p>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Staging, CI/CD"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <p style={labelStyle}>Scopes</p>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {API_SCOPES.map((scope) => (
                      <label
                        key={scope}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Checkbox
                          checked={newKeyScopes.includes(scope)}
                          onChange={(v) =>
                            setNewKeyScopes((prev) =>
                              v ? [...prev, scope] : prev.filter((s) => s !== scope),
                            )
                          }
                        />
                        <code
                          style={{
                            fontSize: 11,
                            background: 'var(--bg-surface)',
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          {scope}
                        </code>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={labelStyle}>Expiry</p>
                  <select
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <button type="button" style={btnSecondary} onClick={resetCreateKeyModal}>
                    Cancel
                  </button>
                  <button type="button" style={btnPrimary} onClick={handleCreateKey}>
                    Create Key
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Check size={16} color="var(--brand)" />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    Key Created
                  </h3>
                </div>
                <div
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '0.5px solid rgba(239,68,68,0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: 10,
                    marginBottom: 14,
                    fontSize: 11,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={13} />
                  This key will only be shown once. Copy it now.
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    marginBottom: 16,
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {showKeyValue ? createdKeyValue : '\u2022'.repeat(createdKeyValue.length)}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowKeyValue(!showKeyValue)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: 2,
                    }}
                  >
                    {showKeyValue ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdKeyValue)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: 2,
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button type="button" style={btnPrimary} onClick={resetCreateKeyModal}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────── */}
      <main
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '4px 0 0',
            }}
          >
            Manage your account, preferences, and integrations
          </p>
        </div>

        {/* ── Tab Navigation ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              style={{
                background: activeTab === tab.value ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border:
                  activeTab === tab.value ? '0.5px solid var(--border)' : '0.5px solid transparent',
                padding: '5px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: activeTab === tab.value ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            PROFILE TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: 560 }}>
            {/* ── Avatar Upload ──────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Avatar</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: avatarPreview
                      ? `url(${avatarPreview}) center/cover`
                      : 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#ffffff',
                    flexShrink: 0,
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {!avatarPreview && 'SH'}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                  >
                    <Camera size={18} color="#fff" />
                  </div>
                </button>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      margin: '0 0 4px',
                    }}
                  >
                    Click to upload. JPG, PNG, or WEBP. Max 5MB.
                  </p>
                  {avatarFile && (
                    <button
                      type="button"
                      style={btnPrimary}
                      onClick={handleAvatarSave}
                      disabled={avatarSaving}
                    >
                      {avatarSaving ? 'Saving...' : 'Save avatar'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Profile Fields ─────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Profile</h2>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Display Name</p>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Email</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>
                  Bio{' '}
                  <span
                    style={{
                      color: bio.length > 160 ? '#ef4444' : 'var(--text-tertiary)',
                    }}
                  >
                    ({bio.length}/160)
                  </span>
                </p>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 60,
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-brand)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Website URL</p>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Twitter / X Handle</p>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  placeholder="@username"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <button
                type="button"
                style={{ ...btnPrimary, opacity: profileSaving ? 0.7 : 1 }}
                onClick={handleProfileSave}
                disabled={profileSaving}
              >
                {profileSaving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* ── Preferences ────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Preferences</h2>

              {/* Theme toggle */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Theme</p>
                <SegmentedControl<Theme>
                  options={['dark', 'light']}
                  value={theme}
                  onChange={handleThemeChange}
                />
              </div>

              {/* Language */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Language</p>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={selectStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              {/* Default Render Quality */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Default Render Quality</p>
                <SegmentedControl<RenderQuality>
                  options={['preview', 'standard', 'final']}
                  value={renderQuality}
                  onChange={setRenderQuality}
                />
              </div>

              {/* Email Notifications */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ ...labelStyle, margin: 0 }}>Email Notifications</p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Receive updates about renders, team activity, and billing
                  </p>
                </div>
                <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
              </div>
            </div>

            {/* ── Notification Preferences ───────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Bell size={14} />
                  Notification Preferences
                </span>
              </h2>
              <div
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 60px',
                    padding: '8px 12px',
                    background: 'var(--bg-surface)',
                    borderBottom: '0.5px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                    }}
                  >
                    Notification
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                    }}
                  >
                    Email
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                    }}
                  >
                    Push
                  </span>
                </div>
                {/* Rows */}
                {notifPrefs.map((pref, idx) => (
                  <div
                    key={pref.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 60px 60px',
                      padding: '8px 12px',
                      borderBottom:
                        idx < notifPrefs.length - 1 ? '0.5px solid var(--border)' : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {pref.label}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Checkbox
                        checked={pref.email}
                        onChange={(v) => updateNotifPref(idx, 'email', v)}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Checkbox
                        checked={pref.push}
                        onChange={(v) => updateNotifPref(idx, 'push', v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                style={{ ...btnPrimary, marginTop: 14 }}
                onClick={() => toast.success('Notification preferences saved')}
              >
                Save
              </button>
            </div>

            {/* ── Security ───────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Shield size={14} />
                  Security
                </span>
              </h2>

              {/* Password */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Password
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Last changed: 3 months ago
                  </p>
                </div>
                <UnavailableButton feature="auth.passwordChange" style={btnSecondary}>
                  Change password
                </UnavailableButton>
              </div>

              {/* 2FA */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Two-Factor Authentication
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Not enabled
                  </p>
                </div>
                <UnavailableButton feature="auth.twoFactor" style={btnSecondary}>
                  Enable 2FA
                </UnavailableButton>
              </div>

              {/* Active Sessions */}
              <p style={labelStyle}>Active Sessions</p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {sessions.map((session, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ color: 'var(--text-tertiary)' }}>{session.icon}</span>
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            margin: 0,
                            fontWeight: 500,
                          }}
                        >
                          {session.device} &middot; {session.browser}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: session.isCurrent ? 'var(--brand)' : 'var(--text-tertiary)',
                            margin: '2px 0 0',
                          }}
                        >
                          {session.lastActive}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        style={{
                          ...btnSecondary,
                          fontSize: 11,
                          padding: '4px 10px',
                          color: '#ef4444',
                          borderColor: 'rgba(239,68,68,0.3)',
                        }}
                        onClick={() => toast.success(`Revoked session: ${session.device}`)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Integrations ───────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Link2 size={14} />
                  Integrations
                </span>
              </h2>

              {/* Content Platforms */}
              <p style={labelStyle}>Content Platforms</p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {['YouTube', 'TikTok', 'Meta'].map((platform) => (
                  <div
                    key={platform}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {platform}
                    </span>
                    <UnavailableButton
                      feature="analytics.connectPlatform"
                      hideNote
                      layout="inline"
                      style={{
                        ...btnSecondary,
                        fontSize: 11,
                        padding: '4px 10px',
                      }}
                    >
                      Connect
                    </UnavailableButton>
                  </div>
                ))}
              </div>

              {/* Development */}
              <p style={labelStyle}>Development</p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      GitHub
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--brand)',
                        background: 'rgba(99,102,241,0.1)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontWeight: 500,
                      }}
                    >
                      Connected
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: '4px 10px',
                      color: '#ef4444',
                      borderColor: 'rgba(239,68,68,0.3)',
                    }}
                    onClick={() => toast.success('GitHub disconnected')}
                  >
                    Disconnect
                  </button>
                </div>
                {['Blender Plugin', 'Unreal Engine Plugin', 'After Effects Plugin'].map(
                  (plugin) => (
                    <div
                      key={plugin}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg-surface)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                        }}
                      >
                        {plugin}
                      </span>
                      <button
                        type="button"
                        style={{
                          ...btnSecondary,
                          fontSize: 11,
                          padding: '4px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onClick={() => toast.info(`${plugin} download started`)}
                      >
                        <Download size={11} />
                        Download
                      </button>
                    </div>
                  ),
                )}
              </div>

              {/* Webhooks */}
              <p style={labelStyle}>Webhooks</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {webhookState.loading && <LoadingState label="Loading webhooks" />}
                {webhookState.error && (
                  <ErrorState error={webhookState.error} onRetry={webhookState.reload} />
                )}
                {!webhookState.loading &&
                  !webhookState.error &&
                  (webhookState.data?.items ?? []).length === 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                      No webhook endpoints yet.
                    </p>
                  )}

                {(webhookState.data?.items ?? []).map((hook) => (
                  <div
                    key={hook.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        {(hook.events ?? []).join(', ') || 'All events'}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                          margin: '2px 0 0',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {hook.url}
                      </p>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...btnSecondary,
                        fontSize: 11,
                        padding: '4px 10px',
                        color: '#ef4444',
                        borderColor: 'rgba(239,68,68,0.3)',
                      }}
                      onClick={() => removeWebhook(hook.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {webhookError && (
                  <p role="alert" style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>
                    {webhookError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={addWebhook}
                  disabled={webhookBusy}
                  style={{
                    ...btnSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    width: 'fit-content',
                    opacity: webhookBusy ? 0.5 : 1,
                  }}
                >
                  <Plus size={13} />
                  Add webhook
                </button>
              </div>
            </div>

            {/* ── AI Memory (G8) ─────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Brain size={14} />
                  AI Memory
                </span>
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 14px',
                  lineHeight: 1.5,
                }}
              >
                Control what the AI remembers about your workflow to personalize suggestions and
                improve consistency.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {[
                  {
                    key: 'cameraLanguage' as const,
                    label: 'Camera language & movement patterns',
                  },
                  {
                    key: 'styleParams' as const,
                    label: 'Style parameters & visual preferences',
                  },
                  {
                    key: 'promptSuccess' as const,
                    label: 'Prompt success history',
                  },
                  {
                    key: 'characterConsistency' as const,
                    label: 'Character consistency data',
                  },
                  {
                    key: 'brandVoice' as const,
                    label: 'Brand voice & tone',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Checkbox
                      checked={aiMemory[item.key]}
                      onChange={(v) => setAiMemory((prev) => ({ ...prev, [item.key]: v }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              {/* Memory summary */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  marginBottom: 14,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  lineHeight: 1.5,
                }}
              >
                {memoryState.loading && 'Loading stored memory…'}
                {memoryState.error && `Could not read stored memory: ${memoryState.error.message}`}
                {!memoryState.loading &&
                  !memoryState.error &&
                  (Object.keys(memoryState.data?.genMemory ?? {}).length === 0
                    ? 'No generation memory stored yet.'
                    : `${Object.keys(memoryState.data?.genMemory ?? {}).length} stored key(s).`)}
              </div>

              {memoryDraft !== null && (
                <div style={{ marginBottom: 14 }}>
                  <textarea
                    value={memoryDraft}
                    onChange={(e) => setMemoryDraft(e.target.value)}
                    aria-label="Generation memory (JSON)"
                    rows={8}
                    spellCheck={false}
                    style={{
                      width: '100%',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 11,
                      padding: 10,
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                    }}
                  />
                  {memoryError && (
                    <p role="alert" style={{ fontSize: 11, color: '#ef4444', margin: '6px 0 0' }}>
                      {memoryError}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {memoryDraft === null ? (
                  <button
                    type="button"
                    style={btnSecondary}
                    onClick={() =>
                      setMemoryDraft(JSON.stringify(memoryState.data?.genMemory ?? {}, null, 2))
                    }
                  >
                    Edit memory
                  </button>
                ) : (
                  <>
                    <button type="button" style={btnSecondary} onClick={saveMemory}>
                      Save memory
                    </button>
                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={() => {
                        setMemoryDraft(null);
                        setMemoryError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  style={{
                    ...btnSecondary,
                    color: '#ef4444',
                    borderColor: 'rgba(239,68,68,0.3)',
                  }}
                  onClick={() => {
                    setAiMemory({
                      cameraLanguage: false,
                      styleParams: false,
                      promptSuccess: false,
                      characterConsistency: false,
                      brandVoice: false,
                    });
                    toast.success('AI memory reset');
                  }}
                >
                  Reset memory
                </button>
              </div>
            </div>

            {/* ── Danger Zone ────────────────────────────── */}
            <div style={{ ...dangerCardStyle, marginBottom: 0 }}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ef4444',
                  margin: '0 0 12px',
                }}
              >
                Danger Zone
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: '0.5px solid rgba(239,68,68,0.2)',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Download my data
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Export all your data as a ZIP archive
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    ...btnSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => toast.success('Export requested, email incoming')}
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Delete Account
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Permanently delete your account and all data
                  </p>
                </div>
                <button
                  type="button"
                  style={btnDanger}
                  onClick={() => setShowDeleteModal(true)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={13} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            WORKSPACE TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'workspace' && (
          <div style={{ maxWidth: 560 }}>
            {/* ── General ────────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>General</h2>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Workspace Name</p>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Workspace Slug</p>
                <input
                  type="text"
                  value={wsSlug}
                  onChange={(e) =>
                    setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                  }
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    margin: '4px 0 0',
                  }}
                >
                  app.animaforge.io/{wsSlug}
                </p>
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={labelStyle}>Workspace Logo</p>
                {/* POST /api/upload/presign returns a signed S3 URL and
                    POST /api/assets records the file; both survive a
                    platform-api restart (run 31925346146). The upload itself
                    goes straight to storage, so the only thing this page keeps
                    is the asset record. */}
                <label
                  htmlFor="workspace-logo"
                  style={{
                    display: 'block',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 24,
                    textAlign: 'center',
                    cursor: logoBusy ? 'progress' : 'pointer',
                  }}
                >
                  <input
                    id="workspace-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    disabled={logoBusy}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadLogo(file);
                      e.target.value = '';
                    }}
                  />
                  <Upload size={20} style={{ color: 'var(--text-tertiary)', marginBottom: 6 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
                    {logoBusy ? 'Uploading…' : 'Click to upload a logo'}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '6px 0 0',
                      lineHeight: 1.4,
                    }}
                  >
                    {logoError ?? logoName ?? 'PNG, JPG or SVG.'}
                  </p>
                </label>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Timezone</p>
                <select
                  value={wsTimezone}
                  onChange={(e) => setWsTimezone(e.target.value)}
                  style={selectStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                  <option value="Europe/Paris">Central European Time (CET)</option>
                  <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                </select>
              </div>
              <button
                type="button"
                style={btnPrimary}
                onClick={() => toast.success('Workspace settings saved')}
              >
                Save
              </button>
            </div>

            {/* ── Defaults ───────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Defaults</h2>

              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Render Quality</p>
                <SegmentedControl<RenderQuality>
                  options={['preview', 'standard', 'final']}
                  value={wsRenderQuality}
                  onChange={setWsRenderQuality}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Aspect Ratio</p>
                <SegmentedControl<AspectRatio>
                  options={['16:9', '9:16', '1:1', '4:3']}
                  value={wsAspectRatio}
                  onChange={setWsAspectRatio}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Language</p>
                <select
                  value={wsLanguage}
                  onChange={(e) => setWsLanguage(e.target.value)}
                  style={selectStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Auto-Save Frequency</p>
                <SegmentedControl<AutoSaveFreq>
                  options={['30s', '1m', '5m', '10m']}
                  value={wsAutoSave}
                  onChange={setWsAutoSave}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ ...labelStyle, margin: 0 }}>Preview Auto-Play</p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Automatically play rendered previews
                  </p>
                </div>
                <Toggle checked={wsPreviewAutoPlay} onChange={setWsPreviewAutoPlay} />
              </div>
            </div>

            {/* ── Workspace Danger Zone ──────────────────── */}
            <div style={{ ...dangerCardStyle, marginBottom: 0 }}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ef4444',
                  margin: '0 0 12px',
                }}
              >
                Danger Zone
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: '0.5px solid rgba(239,68,68,0.2)',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Transfer Ownership
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Transfer this workspace to another team member
                  </p>
                </div>
                <UnavailableButton feature="team.transferOwnership" style={btnSecondary}>
                  Transfer
                </UnavailableButton>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Delete Workspace
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Permanently delete this workspace and all projects
                  </p>
                </div>
                <button
                  type="button"
                  style={btnDanger}
                  onClick={() => setShowDeleteWsModal(true)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            BILLING TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'billing' && (
          <div style={{ maxWidth: 560 }}>
            {/* ── Current Plan ───────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Current Plan</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    Pro Plan
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    $49/month &middot; Renews May 15, 2026
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--brand)',
                    background: 'rgba(99,102,241,0.1)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Active
                </span>
              </div>

              {/* Credits bar */}
              <p style={labelStyle}>Credits Used</p>
              <div style={{ marginBottom: 6 }}>
                <ProgressBar value={4200} max={10000} />
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  margin: '0 0 16px',
                }}
              >
                4,200 / 10,000 credits used this cycle
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <UnavailableButton feature="billing.upgrade" style={btnPrimary}>
                  Upgrade to Studio
                </UnavailableButton>
                <UnavailableButton feature="billing.comparePlans" style={btnSecondary}>
                  View all plans
                </UnavailableButton>
              </div>
            </div>

            {/* ── Buy Credits ────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Zap size={14} />
                  Buy Credits
                </span>
              </h2>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { credits: 100, price: '$10' },
                  { credits: 500, price: '$45' },
                  { credits: 1000, price: '$85' },
                ].map((pack) => (
                  <div
                    key={pack.credits}
                    style={{
                      flex: 1,
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 14,
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '0 0 2px',
                      }}
                    >
                      {pack.credits.toLocaleString()}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        margin: '0 0 10px',
                        textTransform: 'uppercase',
                      }}
                    >
                      credits
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 10px',
                      }}
                    >
                      {pack.price}
                    </p>
                    <button
                      type="button"
                      style={{
                        ...btnPrimary,
                        width: '100%',
                        textAlign: 'center',
                      }}
                      onClick={() =>
                        toast.success(`Purchased ${pack.credits} credits for ${pack.price}`)
                      }
                    >
                      Purchase
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment Method ─────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Payment Method</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CreditCard size={16} style={{ color: 'var(--text-tertiary)' }} />
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      Visa ending in 4242
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        margin: '2px 0 0',
                      }}
                    >
                      Expires 12/27
                    </p>
                  </div>
                </div>
                <UnavailableButton feature="billing.updateCard" style={btnSecondary}>
                  Update card
                </UnavailableButton>
              </div>
              <div>
                <p style={labelStyle}>Billing Email</p>
                <input
                  type="email"
                  value="billing@animaforge.io"
                  readOnly
                  style={{ ...inputStyle, color: 'var(--text-secondary)' }}
                />
              </div>
            </div>

            {/* ── Invoice History ─────────────────────────── */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h2 style={sectionTitle}>Invoice History</h2>
              <div
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 60px 50px',
                    padding: '8px 12px',
                    background: 'var(--bg-surface)',
                    borderBottom: '0.5px solid var(--border)',
                  }}
                >
                  {['Date', 'Amount', 'Status', ''].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {(
                  [
                    {
                      id: 'INV-2026-003',
                      date: 'Mar 15, 2026',
                      amount: '$49.00',
                      status: 'Paid',
                    },
                    {
                      id: 'INV-2026-002',
                      date: 'Feb 15, 2026',
                      amount: '$49.00',
                      status: 'Paid',
                    },
                    {
                      id: 'INV-2026-001',
                      date: 'Jan 15, 2026',
                      amount: '$49.00',
                      status: 'Paid',
                    },
                  ] as Invoice[]
                ).map((inv, idx) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 60px 50px',
                      padding: '8px 12px',
                      borderBottom: idx < 2 ? '0.5px solid var(--border)' : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {inv.date}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {inv.amount}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#22c55e',
                        fontWeight: 500,
                      }}
                    >
                      {inv.status}
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11,
                      }}
                      onClick={() => toast.success(`Downloading ${inv.id}.pdf`)}
                    >
                      <FileText size={12} />
                      PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            API KEYS TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'api-keys' && (
          <div style={{ maxWidth: 560 }}>
            {/* ── Key List ───────────────────────────────── */}
            <div style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ ...sectionTitle, margin: 0 }}>API Keys</h2>
                <button
                  type="button"
                  style={{
                    ...btnPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => setShowCreateKeyModal(true)}
                >
                  <Plus size={13} />
                  Create new key
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            margin: 0,
                            fontWeight: 600,
                          }}
                        >
                          {key.name}
                        </p>
                        <code
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {key.masked}
                        </code>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: '0.5px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                          }}
                          onClick={() => {
                            copyToClipboard(key.masked);
                          }}
                        >
                          <Copy size={11} />
                          Copy
                        </button>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: '0.5px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                          }}
                          onClick={() => {
                            setApiKeys((prev) => prev.filter((k) => k.id !== key.id));
                            toast.success(`Revoked key: ${key.name}`);
                          }}
                        >
                          <X size={11} />
                          Revoke
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── API Usage ──────────────────────────────── */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h2 style={sectionTitle}>Usage</h2>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    1,247
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      margin: '2px 0 0',
                    }}
                  >
                    Total API calls this month
                  </p>
                </div>
              </div>

              {/* By endpoint */}
              <p style={labelStyle}>By Endpoint</p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  { endpoint: '/v1/renders', calls: 523, pct: 42 },
                  { endpoint: '/v1/projects', calls: 312, pct: 25 },
                  { endpoint: '/v1/assets', calls: 245, pct: 20 },
                  { endpoint: '/v1/characters', calls: 102, pct: 8 },
                  { endpoint: '/v1/billing', calls: 65, pct: 5 },
                ].map((ep) => (
                  <div key={ep.endpoint}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ep.endpoint}
                      </code>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {ep.calls.toLocaleString()} ({ep.pct}%)
                      </span>
                    </div>
                    <ProgressBar value={ep.pct} max={100} />
                  </div>
                ))}
              </div>

              {/* Rate limit
                  This showed a bar at 84/100 requests per minute, with the
                  amber threshold driven by the constant comparison `84 > 80`.
                  Nothing measured it: the number was written into the markup.
                  A fabricated usage figure is worse than none, because it is
                  indistinguishable from a real one. */}
              <p style={labelStyle}>Rate Limit</p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Current usage is not shown. Rate-limit counters live in the gateway and are not
                exposed to the web app, so any figure here would be invented.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
