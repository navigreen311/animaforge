export interface LiveSession {
  id: string;
  status: 'live' | 'offline';
  duration: number;
  viewers: number;
  startedAt?: string;
}

export const mockSession: LiveSession = {
  id: 'session_001',
  status: 'offline',
  duration: 0,
  viewers: 0,
};

export async function startBroadcast(): Promise<LiveSession> {
  return { ...mockSession, status: 'live', startedAt: new Date().toISOString() };
}

export async function stopBroadcast(): Promise<LiveSession> {
  return { ...mockSession, status: 'offline' };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
