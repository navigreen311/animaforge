'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus, Shield, Mail, MoreHorizontal, Users, Lock, Key, Activity,
  ChevronDown, ChevronRight, X, Check, AlertTriangle, Pencil, Eye,
  Trash2, FolderOpen, CreditCard, Clock, Radio, Plus, Copy, RefreshCw,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type Role = 'Admin' | 'Editor' | 'Viewer';
type MemberStatus = 'Active' | 'Away' | 'Offline';
type LimitPolicy = 'block' | 'warn';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  joined: string;
  avatarColor: string;
  initials: string;
  creditLimit: number | null; // null = unlimited
  creditsUsed: number;
  shotsGenerated: number;
  shotsApproved: number;
  projects: string[];
  currentActivity?: string;
  limitPolicy: LimitPolicy;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  sentAt: string;
}

interface SubTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface InviteEntry {
  email: string;
  id: string;
}

interface ProjectAccessEntry {
  id: string;
  title: string;
  status: 'Active' | 'Draft' | 'Archived';
  dotColor: string;
  hasAccess: boolean;
  role: 'Editor' | 'Viewer';
}

// ══════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════

const CURRENT_USER_ID = '1';
const TOTAL_SEATS = 10;
const MONTHLY_CREDITS = 10_000;

const MOCK_PROJECTS = [
  'Cyber Samurai',
  'Brand Story',
  'Product Launch',
  'Holiday Campaign',
  'Client Reel',
];

const MOCK_PROJECT_ACCESS: ProjectAccessEntry[] = [
  { id: 'p1', title: 'Cyber Samurai', status: 'Active', dotColor: '#7c3aed', hasAccess: true, role: 'Editor' },
  { id: 'p2', title: 'Brand Story', status: 'Active', dotColor: '#06b6d4', hasAccess: true, role: 'Editor' },
  { id: 'p3', title: 'Product Launch', status: 'Draft', dotColor: '#f59e0b', hasAccess: false, role: 'Viewer' },
  { id: 'p4', title: 'Holiday Campaign', status: 'Active', dotColor: '#ef4444', hasAccess: false, role: 'Viewer' },
  { id: 'p5', title: 'Client Reel', status: 'Archived', dotColor: '#10b981', hasAccess: false, role: 'Viewer' },
];

const MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Alice Chen',
    email: 'alice@animaforge.io',
    role: 'Admin',
    status: 'Active',
    joined: 'Jan 2026',
    avatarColor: '#7c3aed',
    initials: 'AC',
    creditLimit: null,
    creditsUsed: 3200,
    shotsGenerated: 84,
    shotsApproved: 71,
    projects: ['Cyber Samurai', 'Brand Story', 'Product Launch'],
    currentActivity: 'Cyber Samurai / Shot 14',
    limitPolicy: 'block',
  },
  {
    id: '2',
    name: 'Bob Martinez',
    email: 'bob@example.com',
    role: 'Editor',
    status: 'Active',
    joined: 'Feb 2026',
    avatarColor: '#06b6d4',
    initials: 'BM',
    creditLimit: 2000,
    creditsUsed: 1450,
    shotsGenerated: 42,
    shotsApproved: 36,
    projects: ['Cyber Samurai', 'Holiday Campaign'],
    currentActivity: 'Brand Story / Timeline',
    limitPolicy: 'warn',
  },
  {
    id: '3',
    name: 'Carol Nakamura',
    email: 'carol@animaforge.io',
    role: 'Editor',
    status: 'Active',
    joined: 'Feb 2026',
    avatarColor: '#f59e0b',
    initials: 'CN',
    creditLimit: 2000,
    creditsUsed: 1820,
    shotsGenerated: 55,
    shotsApproved: 48,
    projects: ['Brand Story', 'Product Launch', 'Client Reel'],
    currentActivity: 'Browsing marketplace',
    limitPolicy: 'block',
  },
  {
    id: '4',
    name: 'Dave Okafor',
    email: 'dave@example.com',
    role: 'Viewer',
    status: 'Away',
    joined: 'Mar 2026',
    avatarColor: '#ef4444',
    initials: 'DO',
    creditLimit: 500,
    creditsUsed: 120,
    shotsGenerated: 3,
    shotsApproved: 2,
    projects: ['Holiday Campaign'],
    limitPolicy: 'block',
  },
  {
    id: '5',
    name: 'Eve Park',
    email: 'eve@example.com',
    role: 'Editor',
    status: 'Offline',
    joined: 'Mar 2026',
    avatarColor: '#10b981',
    initials: 'EP',
    creditLimit: 1500,
    creditsUsed: 890,
    shotsGenerated: 28,
    shotsApproved: 22,
    projects: ['Cyber Samurai', 'Client Reel'],
    limitPolicy: 'warn',
  },
];

const INITIAL_PENDING_INVITES: PendingInvite[] = [
  { id: 'inv-1', email: 'frank@example.com', role: 'Editor', sentAt: 'Mar 20, 2026' },
  { id: 'inv-2', email: 'grace@example.com', role: 'Viewer', sentAt: 'Mar 22, 2026' },
];

const SUB_TEAMS: SubTeam[] = [
  { id: 'st-1', name: 'Animation Team', memberIds: ['1', '2', '3'] },
  { id: 'st-2', name: 'Client Services', memberIds: ['4', '5'] },
];

// ══════════════════════════════════════════════════════════════
// STYLE HELPERS
// ══════════════════════════════════════════════════════════════

const ROLE_STYLES: Record<Role, { bg: string; color: string }> = {
  Admin: { bg: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' },
  Editor: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  Viewer: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  Active: '#22c55e',
  Away: '#eab308',
  Offline: '#64748b',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Admin: 'Full access to all settings, billing, and team management',
  Editor: 'Can create, edit, and render projects',
  Viewer: 'View-only access to assigned projects',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'visible',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  borderBottom: '0.5px solid var(--border)',
  gap: 6,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  margin: 0,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontWeight: 500,
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '4px 0 0',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '0.5px solid var(--border)',
  color: 'var(--text-secondary)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  border: '0.5px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--brand)',
  color: '#ffffff',
  border: 'none',
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 24,
  width: 480,
  maxHeight: '80vh',
  overflowY: 'auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

// ══════════════════════════════════════════════════════════════
// PROGRESS BAR COMPONENT
// ══════════════════════════════════════════════════════════════

function ProgressBar({
  value,
  max,
  height = 6,
  color,
  warnAt,
  dangerAt,
}: {
  value: number;
  max: number;
  height?: number;
  color?: string;
  warnAt?: number;
  dangerAt?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  let barColor = color || 'var(--brand)';
  if (warnAt !== undefined && dangerAt !== undefined) {
    if (pct >= dangerAt) barColor = '#ef4444';
    else if (pct >= warnAt) barColor = '#f59e0b';
  }
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: height,
        background: 'rgba(148,163,184,0.12)',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: height,
          background: barColor,
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AVATAR COMPONENT
// ══════════════════════════════════════════════════════════════

function Avatar({
  initials,
  color,
  size = 32,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: size * 0.34, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AVATAR STACK COMPONENT
// ══════════════════════════════════════════════════════════════

function AvatarStack({ memberIds }: { memberIds: string[] }) {
  const members = memberIds.map((id) => MEMBERS.find((m) => m.id === id)).filter(Boolean) as TeamMember[];
  return (
    <div style={{ display: 'flex', marginLeft: 4 }}>
      {members.slice(0, 4).map((m, i) => (
        <div
          key={m.id}
          style={{
            marginLeft: i > 0 ? -8 : 0,
            border: '2px solid var(--bg-elevated)',
            borderRadius: '50%',
            zIndex: members.length - i,
            position: 'relative',
          }}
        >
          <Avatar initials={m.initials} color={m.avatarColor} size={24} />
        </div>
      ))}
      {members.length > 4 && (
        <div
          style={{
            marginLeft: -8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--bg-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            border: '2px solid var(--bg-elevated)',
          }}
        >
          +{members.length - 4}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CREDIT LIMIT MODAL
// ══════════════════════════════════════════════════════════════

function CreditLimitModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (limit: number | null, policy: LimitPolicy) => void;
}) {
  const [mode, setMode] = useState<'unlimited' | 'custom'>(member.creditLimit === null ? 'unlimited' : 'custom');
  const [customValue, setCustomValue] = useState(member.creditLimit?.toString() || '1000');
  const [policy, setPolicy] = useState<LimitPolicy>(member.limitPolicy);

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <motion.div
        {...fadeIn}
        style={{ ...modalBoxStyle, width: 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Credit limit for {member.name}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Mode selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {(['unlimited', 'custom'] as const).map((m) => (
            <label
              key={m}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: `0.5px solid ${mode === m ? 'var(--brand)' : 'var(--border)'}`,
                background: mode === m ? 'rgba(124,58,237,0.06)' : 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            >
              <input
                type="radio"
                name="creditMode"
                checked={mode === m}
                onChange={() => setMode(m)}
                style={{ accentColor: 'var(--brand)' }}
              />
              {m === 'unlimited' ? 'Unlimited (workspace pool)' : 'Custom monthly limit'}
            </label>
          ))}
        </div>

        {mode === 'custom' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                style={{ ...inputStyle, paddingRight: 110 }}
                min={0}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              >
                credits / month
              </span>
            </div>
          </div>
        )}

        {/* When limit reached */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
            When limit is reached
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['block', 'warn'] as const).map((p) => (
              <label
                key={p}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-md)',
                  border: `0.5px solid ${policy === p ? 'var(--brand)' : 'var(--border)'}`,
                  background: policy === p ? 'rgba(124,58,237,0.06)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: policy === p ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="limitPolicy"
                  checked={policy === p}
                  onChange={() => setPolicy(p)}
                  style={{ accentColor: 'var(--brand)' }}
                />
                {p === 'block' ? 'Block generation' : 'Warn only'}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={smallBtnStyle}>Cancel</button>
          <button
            type="button"
            onClick={async () => {
              const limit = mode === 'unlimited' ? null : parseInt(customValue, 10) || 0;
              // mock API
              await new Promise((r) => setTimeout(r, 300));
              onSave(limit, policy);
              toast.success('Credit limit updated');
              onClose();
            }}
            style={primaryBtnStyle}
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// INVITE MEMBER MODAL
// ══════════════════════════════════════════════════════════════

function InviteMemberModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (email: string, role: Role) => void;
}) {
  const [entries, setEntries] = useState<InviteEntry[]>([{ email: '', id: crypto.randomUUID() }]);
  const [role, setRole] = useState<Role>('Editor');
  const [projectAccess, setProjectAccess] = useState<'all' | 'specific'>('all');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [creditMode, setCreditMode] = useState<'unlimited' | 'custom'>('unlimited');
  const [creditValue, setCreditValue] = useState('1000');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const addEntry = () => {
    if (entries.length >= 5) return;
    setEntries([...entries, { email: '', id: crypto.randomUUID() }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((e) => e.id !== id));
  };

  const updateEmail = (id: string, email: string) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, email } : e)));
  };

  const toggleProject = (p: string) => {
    setSelectedProjects((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSend = async () => {
    const validEmails = entries.filter((e) => e.email.includes('@'));
    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email');
      return;
    }
    setSending(true);
    // simulate API
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    validEmails.forEach((e) => {
      onInvited(e.email, role);
      toast.success(`Invitation sent to ${e.email}`);
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <motion.div
        {...fadeIn}
        style={{ ...modalBoxStyle, width: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Invite Member
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}>
            <X size={16} />
          </button>
        </div>

        {/* Email inputs */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
            Email addresses
          </label>
          {entries.map((entry, i) => (
            <div key={entry.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                type="email"
                placeholder="name@example.com"
                aria-label="Invitee email"
                value={entry.email}
                onChange={(e) => updateEmail(entry.id, e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              {entries.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove email"
                  onClick={() => removeEntry(entry.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {entries.length < 5 && (
            <button
              type="button"
              onClick={addEntry}
              style={{ ...smallBtnStyle, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
            >
              <Plus size={12} /> Add another
            </button>
          )}
        </div>

        {/* Role selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
            Role
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['Admin', 'Editor', 'Viewer'] as Role[]).map((r) => (
              <label
                key={r}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `0.5px solid ${role === r ? 'var(--brand)' : 'var(--border)'}`,
                  background: role === r ? 'rgba(124,58,237,0.06)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="inviteRole"
                  checked={role === r}
                  onChange={() => setRole(r)}
                  style={{ accentColor: 'var(--brand)', marginTop: 2 }}
                />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{r}</span>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    {ROLE_DESCRIPTIONS[r]}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Project access */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
            Project access
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['all', 'specific'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setProjectAccess(mode)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-md)',
                  border: `0.5px solid ${projectAccess === mode ? 'var(--brand)' : 'var(--border)'}`,
                  background: projectAccess === mode ? 'rgba(124,58,237,0.06)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: projectAccess === mode ? 600 : 400,
                }}
              >
                {mode === 'all' ? 'All projects' : 'Specific projects'}
              </button>
            ))}
          </div>
          {projectAccess === 'specific' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {MOCK_PROJECTS.map((p) => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(p)}
                    onChange={() => toggleProject(p)}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                  {p}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Credit limit */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
            Credit limit
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['unlimited', 'custom'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCreditMode(m)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: 12,
                  borderRadius: 'var(--radius-md)',
                  border: `0.5px solid ${creditMode === m ? 'var(--brand)' : 'var(--border)'}`,
                  background: creditMode === m ? 'rgba(124,58,237,0.06)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: creditMode === m ? 600 : 400,
                }}
              >
                {m === 'unlimited' ? 'Unlimited' : 'Custom'}
              </button>
            ))}
          </div>
          {creditMode === 'custom' && (
            <input
              type="number"
              aria-label="Monthly credit limit"
              value={creditValue}
              onChange={(e) => setCreditValue(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
              min={0}
              placeholder="Monthly credit limit"
            />
          )}
        </div>

        {/* Personal message */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
            Personal message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a welcome message..."
            aria-label="Personal message"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={smallBtnStyle}>Cancel</button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            style={{
              ...primaryBtnStyle,
              opacity: sending ? 0.7 : 1,
              pointerEvents: sending ? 'none' : 'auto',
            }}
          >
            {sending ? (
              <>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Sending...
              </>
            ) : (
              <>
                <Mail size={13} />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJECT ACCESS MODAL
// ══════════════════════════════════════════════════════════════

function ProjectAccessModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (entries: ProjectAccessEntry[]) => void;
}) {
  const [entries, setEntries] = useState<ProjectAccessEntry[]>(() =>
    MOCK_PROJECT_ACCESS.map((p) => ({
      ...p,
      hasAccess: member.projects.includes(p.title),
    })),
  );

  const toggleAccess = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, hasAccess: !e.hasAccess } : e)));
  };

  const setRole = (id: string, role: 'Editor' | 'Viewer') => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)));
  };

  const statusBadgeStyle = (status: ProjectAccessEntry['status']): React.CSSProperties => {
    const styles = {
      Active: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' },
      Draft: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
      Archived: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
    }[status];
    return {
      fontSize: 10,
      fontWeight: 500,
      padding: '1px 6px',
      borderRadius: 9999,
      background: styles.bg,
      color: styles.color,
    };
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <motion.div
        {...fadeIn}
        style={{ ...modalBoxStyle, width: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Project access &mdash; {member.name}
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2 }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
          Choose which projects {member.name} can access and their role in each.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: entry.dotColor,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                {entry.title}
              </span>
              <span style={statusBadgeStyle(entry.status)}>{entry.status}</span>
              {entry.hasAccess && (
                <select
                  value={entry.role}
                  onChange={(e) => setRole(entry.id, e.target.value as 'Editor' | 'Viewer')}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={entry.hasAccess}
                onClick={() => toggleAccess(entry.id)}
                style={{
                  width: 32,
                  height: 18,
                  borderRadius: 9999,
                  background: entry.hasAccess ? 'var(--brand)' : 'rgba(148,163,184,0.25)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: entry.hasAccess ? 16 : 2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.15s ease',
                  }}
                />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={smallBtnStyle}>Cancel</button>
          <button
            type="button"
            onClick={async () => {
              await new Promise((r) => setTimeout(r, 300));
              onSave(entries);
              toast.success('Project access updated');
              onClose();
            }}
            style={primaryBtnStyle}
          >
            Save access settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MEMBER DETAIL PANEL
// ══════════════════════════════════════════════════════════════

function MemberDetailPanel({
  member,
  onClose,
  onManageAccess,
}: {
  member: TeamMember;
  onClose: () => void;
  onManageAccess: (member: TeamMember) => void;
}) {
  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 360,
        height: '100vh',
        background: 'var(--bg-elevated)',
        borderLeft: '0.5px solid var(--border)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Close */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
        <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Profile header */}
      <div style={{ padding: '0 24px 20px', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
        <Avatar initials={member.initials} color={member.avatarColor} size={56} />
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 4px' }}>
          {member.name}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>{member.email}</p>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: 9999,
            background: ROLE_STYLES[member.role].bg,
            color: ROLE_STYLES[member.role].color,
            marginTop: 8,
          }}
        >
          {member.role}
        </span>
      </div>

      {/* This month stats */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          This Month
        </p>

        {/* Credits used */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            <span>Credits used</span>
            <span>
              {member.creditsUsed.toLocaleString()} / {member.creditLimit === null ? '∞' : member.creditLimit.toLocaleString()}
            </span>
          </div>
          <ProgressBar
            value={member.creditsUsed}
            max={member.creditLimit || MONTHLY_CREDITS}
            warnAt={80}
            dangerAt={100}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>Shots generated</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{member.shotsGenerated}</p>
          </div>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>Approved</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{member.shotsApproved}</p>
          </div>
        </div>
      </div>

      {/* Project access */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Project Access
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {member.projects.map((p) => (
            <div
              key={p}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            >
              <FolderOpen size={12} style={{ color: 'var(--text-tertiary)' }} />
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '16px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Quick Actions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { icon: <Shield size={12} />, label: 'Change role', onClick: () => toast.info('Change role') },
            { icon: <FolderOpen size={12} />, label: 'Manage project access', onClick: () => onManageAccess(member) },
            { icon: <CreditCard size={12} />, label: 'Set credit limit', onClick: () => toast.info('Set credit limit') },
            { icon: <Activity size={12} />, label: 'View activity log', onClick: () => toast.info('View activity log') },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-secondary)',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// CONFIRMATION MODAL
// ══════════════════════════════════════════════════════════════

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <motion.div {...fadeIn} style={{ ...modalBoxStyle, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel} style={smallBtnStyle}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...primaryBtnStyle,
              background: danger ? '#ef4444' : 'var(--brand)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROW CONTEXT MENU
// ══════════════════════════════════════════════════════════════

function RowContextMenu({
  member,
  anchorRect,
  onClose,
  onAction,
}: {
  member: TeamMember;
  anchorRect: DOMRect;
  onClose: () => void;
  onAction: (action: string, member: TeamMember, payload?: unknown) => void;
}) {
  const [roleSubmenu, setRoleSubmenu] = useState(false);
  const isOwnRow = member.id === CURRENT_USER_ID;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { key: 'changeRole', label: 'Change role', icon: <Shield size={12} />, hasSubmenu: true },
    { key: 'manageAccess', label: 'Manage project access', icon: <FolderOpen size={12} /> },
    { key: 'setCreditLimit', label: 'Set credit limit', icon: <CreditCard size={12} /> },
    { key: 'viewActivity', label: 'View activity log', icon: <Activity size={12} /> },
    { key: 'separator', separator: true } as const,
    { key: 'remove', label: 'Remove from workspace', icon: <UserMinus size={12} />, danger: true, disabledForSelf: true },
  ] as Array<{
    key: string;
    label?: string;
    icon?: React.ReactNode;
    hasSubmenu?: boolean;
    danger?: boolean;
    disabledForSelf?: boolean;
    separator?: boolean;
  }>;

  const top = anchorRect.bottom + 4;
  const left = Math.min(anchorRect.left, window.innerWidth - 240);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top,
        left,
        width: 220,
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        zIndex: 950,
        padding: '4px 0',
      }}
    >
      {items.map((item) => {
        if (item.separator) {
          return (
            <div
              key={item.key}
              style={{
                height: 1,
                background: 'var(--border)',
                margin: '4px 0',
              }}
            />
          );
        }
        const itemDisabled = !!item.disabledForSelf && isOwnRow;
        return (
        <div key={item.key} style={{ position: 'relative' }}>
          <button
            type="button"
            disabled={itemDisabled}
            onClick={() => {
              if (item.key === 'changeRole') {
                setRoleSubmenu(!roleSubmenu);
                return;
              }
              onAction(item.key, member);
              onClose();
            }}
            onMouseEnter={(e) => {
              if (!itemDisabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
              background: 'transparent',
              border: 'none',
              cursor: itemDisabled ? 'not-allowed' : 'pointer',
              fontSize: 12,
              color: itemDisabled ? 'var(--text-tertiary)' : item.danger ? '#f87171' : 'var(--text-secondary)',
              opacity: itemDisabled ? 0.4 : 1,
              textAlign: 'left',
            }}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.hasSubmenu && <ChevronRight size={11} />}
          </button>

          {/* Role submenu */}
          {item.key === 'changeRole' && roleSubmenu && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '100%',
                width: 160,
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                padding: '4px 0',
                zIndex: 951,
              }}
            >
              {(['Admin', 'Editor', 'Viewer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onAction('changeRole', member, r);
                    onClose();
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: ROLE_STYLES[r].color,
                    }}
                  />
                  {r}
                  {member.role === r && <Check size={12} style={{ marginLeft: 'auto', color: 'var(--brand)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function TeamPage() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredInvite, setHoveredInvite] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [creditLimitMember, setCreditLimitMember] = useState<TeamMember | null>(null);
  const [projectAccessMember, setProjectAccessMember] = useState<TeamMember | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ member: TeamMember; rect: DOMRect } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [members, setMembers] = useState(MEMBERS);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(INITIAL_PENDING_INVITES);
  const [livePolling, setLivePolling] = useState(0);
  const [showSsoGate, setShowSsoGate] = useState(false);

  // Polling for "Live Now" every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePolling((n) => {
        const next = n + 1;
        // eslint-disable-next-line no-console
        console.log('[TeamPage] Live presence polled (tick', next, ') at', new Date().toISOString());
        return next;
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const activeMembers = members.filter((m) => m.status === 'Active');
  const seatUsage = members.length;
  const seatPct = (seatUsage / TOTAL_SEATS) * 100;

  const totalAllocated = members.reduce((sum, m) => sum + (m.creditLimit ?? 0), 0);
  const unlimitedCount = members.filter((m) => m.creditLimit === null).length;
  const totalUsed = members.reduce((sum, m) => sum + m.creditsUsed, 0);
  const unallocated = MONTHLY_CREDITS - totalAllocated;

  const handleMenuAction = useCallback((action: string, member: TeamMember, payload?: unknown) => {
    switch (action) {
      case 'changeRole': {
        const newRole = payload as Role;
        if (newRole === member.role) return;
        // optimistic update + mock API
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
        void (async () => {
          await new Promise((r) => setTimeout(r, 250));
          toast.success(`${member.name}'s role changed to ${newRole}`);
        })();
        break;
      }
      case 'setCreditLimit':
        setCreditLimitMember(member);
        break;
      case 'viewActivity':
        toast.info(`Activity log for ${member.name} (coming soon)`);
        break;
      case 'manageAccess':
        setProjectAccessMember(member);
        break;
      case 'remove':
        setConfirmAction({
          title: 'Remove member',
          message: `Remove ${member.name} from workspace?`,
          confirmLabel: 'Remove',
          danger: true,
          onConfirm: async () => {
            // mock API
            await new Promise((r) => setTimeout(r, 250));
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
            toast.success(`${member.name} has been removed`);
            setConfirmAction(null);
            if (selectedMember?.id === member.id) setSelectedMember(null);
          },
        });
        break;
    }
  }, [selectedMember]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flex: 1 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Team
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
                Manage your workspace members, credits, and invitations
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              style={primaryBtnStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <UserPlus size={13} />
              Invite Member
            </button>
          </div>

          {/* ── Stats Row ─────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Members / seats */}
            <div style={{ flex: 1, ...cardStyle, padding: '14px 16px', overflow: 'visible' }}>
              <p style={labelStyle}>Members</p>
              <p style={bigNumberStyle}>{seatUsage} / {TOTAL_SEATS} seats</p>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  value={seatUsage}
                  max={TOTAL_SEATS}
                  height={4}
                  warnAt={80}
                  dangerAt={100}
                />
              </div>
            </div>

            {/* Active Now */}
            <div style={{ flex: 1, ...cardStyle, padding: '14px 16px', overflow: 'visible' }}>
              <p style={labelStyle}>Active Now</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <p style={{ ...bigNumberStyle, margin: 0 }}>{activeMembers.length}</p>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              </div>
            </div>

            {/* Pending Invites */}
            <div style={{ flex: 1, ...cardStyle, padding: '14px 16px', overflow: 'visible' }}>
              <p style={labelStyle}>Pending Invites</p>
              <p style={bigNumberStyle}>{pendingInvites.length}</p>
            </div>
          </div>

          {/* ── Live Now Section ──────────────────────────── */}
          {activeMembers.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <Radio size={13} style={{ color: '#22c55e' }} />
                <span style={sectionTitleStyle}>Live Now</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  polls every 30s
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, padding: 12, flexWrap: 'wrap' }}>
                {activeMembers.map((m) => (
                  <motion.div
                    key={m.id + livePolling}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '0.5px solid var(--border)',
                      minWidth: 200,
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar initials={m.initials} color={m.avatarColor} size={28} />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -1,
                          right: -1,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: '2px solid var(--bg-surface)',
                        }}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {m.name}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '1px 0 0' }}>
                        {m.currentActivity || 'Idle'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Credit Allocation (Collapsible) ──────────── */}
          <div style={cardStyle}>
            <button
              type="button"
              onClick={() => setCreditsOpen(!creditsOpen)}
              style={{
                ...sectionHeaderStyle,
                width: '100%',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                borderBottom: creditsOpen ? '0.5px solid var(--border)' : 'none',
              }}
            >
              <CreditCard size={13} style={{ color: 'var(--text-tertiary)' }} />
              <span style={sectionTitleStyle}>Credit Allocation</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                {MONTHLY_CREDITS.toLocaleString()} total this month
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                {creditsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>

            <AnimatePresence>
              {creditsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Summary bar */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 16, borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Used: <strong style={{ color: 'var(--text-primary)' }}>{totalUsed.toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Unallocated: <strong style={{ color: unallocated < 0 ? '#f87171' : 'var(--text-primary)' }}>
                        {unallocated.toLocaleString()}
                      </strong>
                      {unlimitedCount > 0 && (
                        <span style={{ fontSize: 10, marginLeft: 4 }}>
                          ({unlimitedCount} unlimited)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Per-member rows */}
                  {members.map((m) => {
                    const limit = m.creditLimit;
                    const pct = limit ? Math.min((m.creditsUsed / limit) * 100, 100) : (m.creditsUsed / MONTHLY_CREDITS) * 100;
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 16px',
                          borderBottom: '0.5px solid var(--border)',
                          gap: 12,
                        }}
                      >
                        <Avatar initials={m.initials} color={m.avatarColor} size={24} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', width: 120, flexShrink: 0 }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 80, flexShrink: 0 }}>
                          {limit === null ? 'Unlimited' : `${limit.toLocaleString()} credits`}
                        </span>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={m.creditsUsed}
                            max={limit || MONTHLY_CREDITS}
                            height={4}
                            warnAt={80}
                            dangerAt={100}
                          />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 50, textAlign: 'right', flexShrink: 0 }}>
                          {m.creditsUsed.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCreditLimitMember(m)}
                          style={{
                            ...smallBtnStyle,
                            padding: '3px 8px',
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <Pencil size={10} />
                          Edit
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Team Members List ─────────────────────────── */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <Shield size={13} style={{ color: 'var(--text-tertiary)' }} />
              <span style={sectionTitleStyle}>Team Members</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                ({members.length})
              </span>
            </div>

            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                onMouseEnter={() => setHoveredRow(member.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '0.5px solid var(--border)',
                  background: hoveredRow === member.id ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                {/* Avatar */}
                <Avatar initials={member.initials} color={member.avatarColor} />

                {/* Name + Email */}
                <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.email}
                  </p>
                </div>

                {/* Role Badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: ROLE_STYLES[member.role].bg,
                    color: ROLE_STYLES[member.role].color,
                    whiteSpace: 'nowrap',
                    marginLeft: 12,
                  }}
                >
                  {member.role}
                </span>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 20, minWidth: 70 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[member.status], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{member.status}</span>
                </div>

                {/* Joined */}
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 20, whiteSpace: 'nowrap', minWidth: 64 }}>
                  {member.joined}
                </span>

                {/* Menu Button */}
                <button
                  type="button"
                  aria-label={`More options for ${member.name}`}
                  aria-haspopup="menu"
                  aria-expanded={contextMenu?.member.id === member.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu(contextMenu?.member.id === member.id ? null : { member, rect });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    padding: 4,
                    marginLeft: 12,
                    borderRadius: 'var(--radius-sm, 4px)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* ── Pending Invites ───────────────────────────── */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <Mail size={13} style={{ color: 'var(--text-tertiary)' }} />
              <span style={sectionTitleStyle}>Pending Invites</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                ({pendingInvites.length})
              </span>
            </div>

            {pendingInvites.length === 0 && (
              <div style={{ padding: '16px', fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No pending invites
              </div>
            )}

            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                onMouseEnter={() => setHoveredInvite(invite.id)}
                onMouseLeave={() => setHoveredInvite(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '0.5px solid var(--border)',
                  background: hoveredInvite === invite.id ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(148,163,184,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={14} style={{ color: '#94a3b8' }} />
                </div>
                <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {invite.email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    Sent {invite.sentAt}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: ROLE_STYLES[invite.role].bg,
                    color: ROLE_STYLES[invite.role].color,
                    whiteSpace: 'nowrap',
                    marginLeft: 12,
                  }}
                >
                  {invite.role}
                </span>
                <div style={{ display: 'flex', gap: 8, marginLeft: 20 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      // mock API
                      await new Promise((r) => setTimeout(r, 200));
                      toast.success(`Invitation resent to ${invite.email}`);
                    }}
                    style={smallBtnStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({
                        title: 'Revoke invitation',
                        message: `Revoke the invitation to ${invite.email}? They will no longer be able to join with the current invite link.`,
                        confirmLabel: 'Revoke',
                        danger: true,
                        onConfirm: async () => {
                          await new Promise((r) => setTimeout(r, 200));
                          setPendingInvites((prev) => prev.filter((p) => p.id !== invite.id));
                          toast.success(`Invitation to ${invite.email} revoked`);
                          setConfirmAction(null);
                        },
                      });
                    }}
                    style={dangerBtnStyle}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Sub-Teams Section ─────────────────────────── */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} style={{ color: 'var(--text-tertiary)' }} />
                <span style={sectionTitleStyle}>Sub-Teams</span>
              </div>
              <button
                type="button"
                onClick={() => toast.info('Create team (coming soon)')}
                style={{
                  ...smallBtnStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Plus size={11} />
                Create team
              </button>
            </div>

            {SUB_TEAMS.map((team) => (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {team.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    {team.memberIds.length} members
                  </p>
                </div>
                <AvatarStack memberIds={team.memberIds} />
                <button
                  type="button"
                  onClick={() => toast.info(`Manage ${team.name} (coming soon)`)}
                  style={{ ...smallBtnStyle, marginLeft: 12 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  Manage
                </button>
              </div>
            ))}
          </div>

          {/* ── SSO Section (Enterprise) ──────────────────── */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <Lock size={13} style={{ color: 'var(--text-tertiary)' }} />
              <span style={sectionTitleStyle}>Single Sign-On (SSO)</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: 9999,
                  background: 'rgba(124,58,237,0.15)',
                  color: '#a78bfa',
                  marginLeft: 8,
                }}
              >
                Enterprise
              </span>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#64748b',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Status: <strong>Not configured</strong>
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
                  Identity provider
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['SAML', 'OIDC'].map((p) => (
                    <div
                      key={p}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        borderRadius: 'var(--radius-md)',
                        border: '0.5px solid var(--border)',
                        color: 'var(--text-tertiary)',
                        opacity: 0.5,
                        cursor: 'not-allowed',
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                    SCIM endpoint
                  </label>
                  <div style={{ ...inputStyle, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Key size={11} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Available on Enterprise plan</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                    SCIM token
                  </label>
                  <div style={{ ...inputStyle, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={11} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Available on Enterprise plan</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(124,58,237,0.06)',
                  border: '0.5px solid rgba(124,58,237,0.2)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Upgrade to Enterprise
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    Enable SSO, SCIM provisioning, and advanced security features
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('Contact sales for Enterprise pricing')}
                  style={primaryBtnStyle}
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>

        </main>

        {/* ── Member Detail Panel ─────────────────────────── */}
        <AnimatePresence>
          {selectedMember && (
            <MemberDetailPanel
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Context Menu ────────────────────────────────── */}
      {contextMenu && (
        <RowContextMenu
          member={contextMenu.member}
          anchorRect={contextMenu.rect}
          onClose={() => setContextMenu(null)}
          onAction={handleMenuAction}
        />
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteMemberModal onClose={() => setShowInviteModal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {projectAccessMember && (
          <ProjectAccessModal
            member={projectAccessMember}
            onClose={() => setProjectAccessMember(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creditLimitMember && (
          <CreditLimitModal
            member={creditLimitMember}
            onClose={() => setCreditLimitMember(null)}
            onSave={(limit, policy) => {
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === creditLimitMember.id ? { ...m, creditLimit: limit, limitPolicy: policy } : m
                )
              );
            }}
          />
        )}
      </AnimatePresence>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          danger={confirmAction.danger}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
