"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3002";

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  subscribe: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
  emit: (event: string, data?: unknown) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

/**
 * Core WebSocket hook.
 *
 * Connects to the realtime service on mount, provides helpers for
 * subscribing to events, emitting messages, and joining/leaving
 * project rooms.  Handles auto-reconnect and cleanup on unmount.
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sock = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      withCredentials: true,
    });

    socketRef.current = sock;

    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));
    sock.on("reconnect", () => setConnected(true));

    return () => {
      sock.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const subscribe = useCallback(
    <T = unknown>(event: string, handler: (data: T) => void) => {
      const sock = socketRef.current;
      if (!sock) return () => {};

      sock.on(event as any, handler as any);
      return () => {
        sock.off(event as any, handler as any);
      };
    },
    [],
  );

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const joinProject = useCallback((projectId: string) => {
    socketRef.current?.emit("collab:join", { projectId });
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socketRef.current?.emit("collab:leave", { projectId });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    subscribe,
    emit,
    joinProject,
    leaveProject,
  };
}
