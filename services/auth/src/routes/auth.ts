import { Router } from "express";
import type { Response } from "express";
import { registerSchema, loginSchema } from "../models/authSchemas";
import {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
  signToken,
  buildJwtPayload,
  blacklistToken,
} from "../services/authService";
import { authenticate, type AuthRequest } from "../middleware/authenticate";

const router = Router();

// POST /auth/register
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password, displayName } = parsed.data;

    const user = await createUser(email, password, displayName);
    const payload = buildJwtPayload(user);
    const token = signToken(payload);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
      },
    });
  } catch (err: any) {
    if (err.message === "Email already registered") {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parsed.data;
    const user = findUserByEmail(email);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const payload = buildJwtPayload(user);
    const token = signToken(payload);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
      },
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/refresh
router.post("/refresh", authenticate, (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Blacklist old token
    if (req.token) {
      blacklistToken(req.token);
    }

    // Issue new token with same payload
    const user = findUserById(req.user.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const payload = buildJwtPayload(user);
    const token = signToken(payload);

    res.json({ token });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me
router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tier: user.tier,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/logout", authenticate, (req: AuthRequest, res: Response) => {
  try {
    if (req.token) {
      blacklistToken(req.token);
    }
    res.json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
