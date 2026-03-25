const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface UserPayload { userId: string; displayName: string; }

export function verifyToken(token: string | null): UserPayload | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { userId: payload.sub || payload.userId, displayName: payload.displayName || payload.name || 'Anonymous' };
  } catch { return null; }
}

export { JWT_SECRET, type UserPayload };
