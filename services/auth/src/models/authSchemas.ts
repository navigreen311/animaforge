import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(64, 'Display name must be at most 64 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type UserRole = 'user' | 'admin' | 'moderator';
export type UserTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  tier: UserTier;
  createdAt: Date;
}

/**
 * The claims this service signs.
 *
 * The subject is `sub`, the registered claim (RFC 7519 section 4.1.2). It used
 * to be a custom `userId`, which platform-api and services/realtime each read
 * differently -- platform-api looked for `sub` and found nothing, which is the
 * incompatibility filed as #82. Standardising on the registered name means one
 * claim, spelled the same way, in every service that reads a token.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}
