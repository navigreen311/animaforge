import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type {
  User,
  JwtPayload,
  UserRole,
  UserTier,
} from "../models/authSchemas";
import prisma from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "animaforge-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// In-memory fallback stores (used when Prisma is unavailable)
// ---------------------------------------------------------------------------
const users = new Map<string, User>();
const emailIndex = new Map<string, string>(); // email -> userId
const tokenBlacklist = new Set<string>();

// Flag to track if Prisma is reachable
let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaAvailable = true;
  } catch {
    console.warn("Prisma unavailable — falling back to in-memory store");
    prismaAvailable = false;
  }
  return prismaAvailable;
}

/** Reset Prisma availability check (useful for testing). */
export function resetPrismaCheck(): void {
  prismaAvailable = null;
}

export function getUsers(): Map<string, User> {
  return users;
}

export function clearStore(): void {
  users.clear();
  emailIndex.clear();
  tokenBlacklist.clear();
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: uuidv4() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  if (tokenBlacklist.has(token)) {
    throw new Error("Token has been revoked");
  }
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ---------------------------------------------------------------------------
// Token blacklist — Redis when available, in-memory Set as fallback
// ---------------------------------------------------------------------------

export function blacklistToken(token: string): void {
  // TODO: integrate Redis for distributed token blacklist
  tokenBlacklist.add(token);
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

// ---------------------------------------------------------------------------
// User CRUD — Prisma first, in-memory fallback
// ---------------------------------------------------------------------------

/**
 * The Prisma User model stores auth credentials inside the `genMemory` JSON
 * field under the key `passwordHash`. This avoids modifying the shared schema
 * while keeping password data co-located with the user row.
 */

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "user",
  tier: UserTier = "free",
): Promise<User> {
  const passwordHash = await hashPassword(password);

  if (await isPrismaAvailable()) {
    try {
      // Check for existing user in Prisma
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error("Email already registered");

      const dbUser = await prisma.user.create({
        data: {
          email,
          displayName,
          role,
          tier,
          genMemory: { passwordHash },
        },
      });

      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash,
        displayName: dbUser.displayName ?? displayName,
        role: dbUser.role as UserRole,
        tier: dbUser.tier as UserTier,
        createdAt: dbUser.createdAt,
      };

      // Mirror into in-memory for fast lookups during this process lifetime
      users.set(user.id, user);
      emailIndex.set(user.email, user.id);

      return user;
    } catch (err: any) {
      if (err.message === "Email already registered") throw err;
      // Unique constraint from Prisma
      if (err.code === "P2002") throw new Error("Email already registered");
      console.warn("Prisma createUser failed, falling back to in-memory:", err.message);
    }
  }

  // In-memory fallback
  if (emailIndex.has(email)) {
    throw new Error("Email already registered");
  }

  const id = uuidv4();
  const user: User = {
    id,
    email,
    passwordHash,
    displayName,
    role,
    tier,
    createdAt: new Date(),
  };

  users.set(id, user);
  emailIndex.set(email, id);

  return user;
}

export async function findUserByEmail(
  email: string,
): Promise<User | undefined> {
  if (await isPrismaAvailable()) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser) return undefined;

      const genMemory = (dbUser.genMemory as Record<string, any>) ?? {};
      return {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: genMemory.passwordHash ?? "",
        displayName: dbUser.displayName ?? "",
        role: dbUser.role as UserRole,
        tier: dbUser.tier as UserTier,
        createdAt: dbUser.createdAt,
      };
    } catch (err: any) {
      console.warn("Prisma findUserByEmail failed, falling back:", err.message);
    }
  }

  // In-memory fallback
  const userId = emailIndex.get(email);
  if (!userId) return undefined;
  return users.get(userId);
}

export async function findUserById(id: string): Promise<User | undefined> {
  if (await isPrismaAvailable()) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id } });
      if (!dbUser) return undefined;

      const genMemory = (dbUser.genMemory as Record<string, any>) ?? {};
      return {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: genMemory.passwordHash ?? "",
        displayName: dbUser.displayName ?? "",
        role: dbUser.role as UserRole,
        tier: dbUser.tier as UserTier,
        createdAt: dbUser.createdAt,
      };
    } catch (err: any) {
      console.warn("Prisma findUserById failed, falling back:", err.message);
    }
  }

  return users.get(id);
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "displayName" | "role" | "tier">>,
): Promise<User | undefined> {
  if (await isPrismaAvailable()) {
    try {
      const dbUser = await prisma.user.update({
        where: { id },
        data: {
          ...(data.displayName !== undefined && {
            displayName: data.displayName,
          }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.tier !== undefined && { tier: data.tier }),
        },
      });

      const genMemory = (dbUser.genMemory as Record<string, any>) ?? {};
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: genMemory.passwordHash ?? "",
        displayName: dbUser.displayName ?? "",
        role: dbUser.role as UserRole,
        tier: dbUser.tier as UserTier,
        createdAt: dbUser.createdAt,
      };

      // Sync in-memory
      users.set(user.id, user);
      return user;
    } catch (err: any) {
      console.warn("Prisma updateUser failed, falling back:", err.message);
    }
  }

  const existing = users.get(id);
  if (!existing) return undefined;

  const updated: User = { ...existing, ...data };
  users.set(id, updated);
  return updated;
}

export function buildJwtPayload(user: User): JwtPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  };
}
