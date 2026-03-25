import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearStore } from "../services/authService";

describe("Auth Service", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("POST /auth/register", () => {
    it("should register a new user and return JWT", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
      expect(res.body.user.displayName).toBe("Test User");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.tier).toBe("free");
      expect(res.body.user.id).toBeDefined();
    });

    it("should reject duplicate email", async () => {
      await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      });

      const res = await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password456",
        displayName: "Another User",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email already registered");
    });

    it("should reject invalid email", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "not-an-email",
        password: "password123",
        displayName: "Test User",
      });

      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "short",
        displayName: "Test User",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/auth/register").send({
        email: "user@example.com",
        password: "password123",
        displayName: "Login User",
      });
    });

    it("should login with valid credentials", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "user@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("user@example.com");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.tier).toBe("free");
    });

    it("should reject wrong password", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "user@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("should reject non-existent email", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "nobody@example.com",
        password: "password123",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user with valid token", async () => {
      const registerRes = await request(app).post("/auth/register").send({
        email: "me@example.com",
        password: "password123",
        displayName: "Me User",
      });

      const token = registerRes.body.token;

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("me@example.com");
      expect(res.body.displayName).toBe("Me User");
    });

    it("should reject request without token", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should return a new token and blacklist old one", async () => {
      const registerRes = await request(app).post("/auth/register").send({
        email: "refresh@example.com",
        password: "password123",
        displayName: "Refresh User",
      });

      const oldToken = registerRes.body.token;

      const refreshRes = await request(app)
        .post("/auth/refresh")
        .set("Authorization", `Bearer ${oldToken}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.token).toBeDefined();

      // Old token should be blacklisted
      const meWithOld = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${oldToken}`);

      expect(meWithOld.status).toBe(401);

      // New token should work
      const newToken = refreshRes.body.token;
      const meWithNew = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${newToken}`);

      expect(meWithNew.status).toBe(200);
      expect(meWithNew.body.email).toBe("refresh@example.com");
    });
  });

  describe("POST /auth/logout", () => {
    it("should blacklist the token", async () => {
      const registerRes = await request(app).post("/auth/register").send({
        email: "logout@example.com",
        password: "password123",
        displayName: "Logout User",
      });

      const token = registerRes.body.token;

      const logoutRes = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe("Logged out successfully");

      // Token should no longer work
      const meRes = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(401);
    });
  });

  describe("Role authorization", () => {
    it("should allow admin access to admin-only route concept", async () => {
      const { createUser, buildJwtPayload, signToken } = await import(
        "../services/authService"
      );

      const admin = await createUser(
        "admin@example.com",
        "password123",
        "Admin User",
        "admin",
        "enterprise"
      );

      const token = signToken(buildJwtPayload(admin));

      const meRes = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.role).toBe("admin");
      expect(meRes.body.tier).toBe("enterprise");
    });
  });

  describe("Health check", () => {
    it("should return ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });
});
