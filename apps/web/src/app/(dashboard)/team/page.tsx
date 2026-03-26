'use client';

import { useState } from 'react';
import { UserPlus, Mail, MoreHorizontal, Shield } from 'lucide-react';

// ── Sample Data ──────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'Active' | 'Away' | 'Offline';
  joined: string;
  avatarColor: string;
  initials: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'Editor' | 'Viewer';
  sentAt: string;
}

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
  },
];

const PENDING_INVITES: PendingInvite[] = [
  { id: 'inv-1', email: 'frank@example.com', role: 'Editor', sentAt: 'Mar 20, 2026' },
  { id: 'inv-2', email: 'grace@example.com', role: 'Viewer', sentAt: 'Mar 22, 2026' },
];

// ── Helpers ──────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  Admin: { bg: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' },
  Editor: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  Viewer: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
};

const STATUS_COLORS: Record<string, string> = {
  Active: '#22c55e',
  Away: '#eab308',
  Offline: '#64748b',
};

// ── Component ────────────────────────────────────────────────

export default function TeamPage() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredInvite, setHoveredInvite] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
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
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Team
            </h1>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0',
              }}
            >
              Manage your workspace members and invitations
            </p>
          </div>

          <button
            type="button"
            style={{
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
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            <UserPlus size={13} />
            Invite Member
          </button>
        </div>

        {/* ── Stats Row ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Members */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 500,
              }}
            >
              Members
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '4px 0 0',
              }}
            >
              5
            </p>
          </div>

          {/* Active Now */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 500,
              }}
            >
              Active Now
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                3
              </p>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                }}
              />
            </div>
          </div>

          {/* Pending Invites */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 500,
              }}
            >
              Pending Invites
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '4px 0 0',
              }}
            >
              2
            </p>
          </div>
        </div>

        {/* ── Team Members List ─────────────────────────── */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {/* List Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: '0.5px solid var(--border)',
              gap: 6,
            }}
          >
            <Shield size={13} style={{ color: 'var(--text-tertiary)' }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Team Members
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginLeft: 4,
              }}
            >
              ({MEMBERS.length})
            </span>
          </div>

          {/* Member Rows */}
          {MEMBERS.map((member) => (
            <div
              key={member.id}
              onMouseEnter={() => setHoveredRow(member.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--border)',
                background: hoveredRow === member.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.15s ease',
                cursor: 'default',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: member.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#ffffff',
                    lineHeight: 1,
                  }}
                >
                  {member.initials}
                </span>
              </div>

              {/* Name + Email */}
              <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {member.name}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    margin: '2px 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
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

              {/* Status Dot + Label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: 20,
                  minWidth: 70,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: STATUS_COLORS[member.status],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {member.status}
                </span>
              </div>

              {/* Joined Date */}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginLeft: 20,
                  whiteSpace: 'nowrap',
                  minWidth: 64,
                }}
              >
                {member.joined}
              </span>

              {/* Menu Button */}
              <button
                type="button"
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
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Pending Invites ───────────────────────────── */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: '0.5px solid var(--border)',
              gap: 6,
            }}
          >
            <Mail size={13} style={{ color: 'var(--text-tertiary)' }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Pending Invites
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginLeft: 4,
              }}
            >
              ({PENDING_INVITES.length})
            </span>
          </div>

          {/* Invite Rows */}
          {PENDING_INVITES.map((invite) => (
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
              {/* Envelope Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(148, 163, 184, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mail size={14} style={{ color: '#94a3b8' }} />
              </div>

              {/* Email + Sent date */}
              <div style={{ marginLeft: 12, minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {invite.email}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    margin: '2px 0 0',
                  }}
                >
                  Sent {invite.sentAt}
                </p>
              </div>

              {/* Role Badge */}
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginLeft: 20 }}>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '0.5px solid var(--border)',
                    color: 'var(--text-secondary)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  Resend
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '0.5px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
