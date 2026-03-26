import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import {
  createSession,
  invalidateSession,
  isBlacklisted,
  getUserSessions,
  invalidateAllSessions,
  getSessionCount,
  clearSessionStore,
  forceInMemoryMode,
} from "../services/sessionService";
import { clearStore, createUser } from "../services/authService";

describe("sessionService", () => {
  beforeEach(() => {
    clearSessionStore();
    forceInMemoryMode();
  });

  it("should create a session and retrieve it", async () => {
    await createSession("user-1", "token-abc", 3600);
    const sessions = await getUserSessions("user-1");
    expect(sessions).toContain("token-abc");
  });

  it("should blacklist a token via invalidateSession", async () => {
    await invalidateSession("token-xyz", 3600);
    const result = await isBlacklisted("token-xyz");
    expect(result).toBe(true);
  });

  it("should return false for non-blacklisted tokens", async () => {
    const result = await isBlacklisted("token-clean");
    expect(result).toBe(false);
  });

  it("should list all active sessions for a user", async () => {
    await createSession("user-2", "tok-a", 3600);
    await createSession("user-2", "tok-b", 3600);
    await createSession("other-user", "tok-c", 3600);

    const sessions = await getUserSessions("user-2");
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain("tok-a");
    expect(sessions).toContain("tok-b");
  });

  it("should invalidate all sessions for a user", async () => {
    await createSession("user-3", "tok-1", 3600);
    await createSession("user-3", "tok-2", 3600);

    await invalidateAllSessions("user-3");

    const sessions = await getUserSessions("user-3");
    expect(sessions).toHaveLength(0);

    expect(await isBlacklisted("tok-1")).toBe(true);
    expect(await isBlacklisted("tok-2")).toBe(true);
  });

  it("should return the correct session count", async () => {
    await createSession("user-4", "t1", 3600);
    await createSession("user-4", "t2", 3600);
    await createSession("user-4", "t3", 3600);

    const count = await getSessionCount("user-4");
    expect(count).toBe(3);
  });
});

describe("session integration (routes)", () => {
  beforeEach(() => {
    clearSessionStore();
    forceInMemoryMode();
    clearStore();
  });

  it("login should create a session for the user", async () => {
    await createUser("sess@test.com", "Password123!", "SessUser");

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "sess@test.com", password: "Password123!" });

    expect(loginRes.status).toBe(200);
    const userId = loginRes.body.user.id;

    const sessions = await getUserSessions(userId);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions).toContain(loginRes.body.token);
  });

  it("logout should blacklist the token", async () => {
    await createUser("out@test.com", "Password123!", "OutUser");

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "out@test.com", password: "Password123!" });

    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(await isBlacklisted(token)).toBe(true);
  });
});
