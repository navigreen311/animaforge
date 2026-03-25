import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";
import type { AuthPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

/**
 * Socket.IO middleware that verifies a JWT passed as a `token` query parameter
 * during the handshake. On success the decoded payload is attached to
 * `socket.data.user`.
 */
export function socketAuth(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.query.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication error: token missing"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error("Authentication error: invalid token"));
  }
}
