import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";
import type { JwtPayload } from "../models/authSchemas";

export interface AuthRequest extends Request {
  user?: JwtPayload;
  token?: string;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
