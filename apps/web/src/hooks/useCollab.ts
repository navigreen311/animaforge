'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuth } from './useAuth';

const WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:3012';

export interface CollabUser {
  userId: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedShot: string | null;
}

export interface ShotLockInfo {
  locked: boolean;
  lockedBy: string | null;
  expiresAt: number | null;
}

export interface UseCollabReturn {
  isConnected: boolean;
  connectedUsers: CollabUser[];
  lockShot: (shotId: string) => void;
  unlockShot: (shotId: string) => void;
  shotLocks: Map<string, ShotLockInfo>;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
}

export function useCollab(projectId: string | null): UseCollabReturn {
  const { token } = useAuth();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<CollabUser[]>([]);
  const [shotLocks, setShotLocks] = useState<Map<string, ShotLockInfo>>(new Map());

  useEffect(() => {
    if (!projectId || !token) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      WS_URL,
      projectId,
      ydoc,
      {
        params: { token, projectId },
        connect: true,
      },
    );
    providerRef.current = provider;

    provider.on('status', ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    });

    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();
      const users: CollabUser[] = [];

      states.forEach((state: Record<string, unknown>) => {
        if (state.user) {
          const u = state.user as CollabUser;
          users.push({
            userId: u.userId,
            displayName: u.displayName,
            color: u.color,
            cursor: u.cursor || null,
            selectedShot: u.selectedShot || null,
          });
        }
      });

      setConnectedUsers(users);
    });

    provider.ws?.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
        if (msg.type === 'shot-lock-update') {
          setShotLocks((prev) => {
            const next = new Map(prev);
            next.set(msg.shotId, {
              locked: msg.locked,
              lockedBy: msg.lockedBy,
              expiresAt: msg.expiresAt,
            });
            return next;
          });
        } else if (msg.type === 'awareness-update') {
          setConnectedUsers(msg.users);
        } else if (msg.type === 'locks-released') {
          setShotLocks((prev) => {
            const next = new Map(prev);
            for (const [shotId, info] of next.entries()) {
              if (info.lockedBy === msg.userId) {
                next.delete(shotId);
              }
            }
            return next;
          });
        }
      } catch {
        // Not a JSON message -- Yjs binary protocol
      }
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      setIsConnected(false);
      setConnectedUsers([]);
      setShotLocks(new Map());
    };
  }, [projectId, token]);

  const lockShot = useCallback((shotId: string) => {
    const ws = providerRef.current?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'lock-shot', shotId }));
    }
  }, []);

  const unlockShot = useCallback((shotId: string) => {
    const ws = providerRef.current?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unlock-shot', shotId }));
    }
  }, []);

  return {
    isConnected,
    connectedUsers,
    lockShot,
    unlockShot,
    shotLocks,
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
}
