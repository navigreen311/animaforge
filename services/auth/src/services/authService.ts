import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { User, JwtPayload, UserRole, UserTier } from "../models/authSchemas";

const JWT_SECRET = process.env.JWT_SECRET || "animaforge-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const SALT_ROUNDS = 10;

// In-memory stores
const users = new Map<string, User>();
const emailIndex = new Map<string, string>(); // email -> userId
const tokenBlacklist = new Set<string>();

export function getUsers(): Map<string, User> {
  return users;
}

export function clearStore(): void {
  users.clear();
  emailIndex.clear();
  tokenBlacklist.clear();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

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

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "user",
  tier: UserTier = "free"
): Promise<User> {
  if (emailIndex.has(email)) {
    throw new Error("Email already registered");
  }

  const id = uuidv4();
  const passwordHash = await hashPassword(password);

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

export function findUserByEmail(email: string): User | undefined {
  const userId = emailIndex.get(email);
  if (!userId) return undefined;
  return users.get(userId);
}

export function findUserById(id: string): User | undefined {
  return users.get(id);
}

export function buildJwtPayload(user: User): JwtPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  };
}
