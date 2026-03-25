import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { clearStore, createUser, signToken, buildJwtPayload } from "../services/authService";
import { clearSSOStore } from "../services/ssoService";
import { clearSCIMStore } from "../services/scimService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminToken(): Promise<string> {
  const admin = await createUser("admin@animaforge.io", "password123", "Admin", "admin", "enterprise");
  return signToken(buildJwtPayload(admin));
}

function encodeMockPayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// ---------------------------------------------------------------------------
// SSO + SCIM Tests
// ---------------------------------------------------------------------------

describe("SSO & SCIM", () => {
  beforeEach(() => {
    clearStore();
    clearSSOStore();
    clearSCIMStore();
  });

  // -------------------------------------------------------------------------
  // 1. SAML Configuration
  // -------------------------------------------------------------------------
  it("should configure SAML for an org (admin only)", async () => {
    const token = await getAdminToken();

    const res = await request(app)
      .post("/auth/sso/saml/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-1",
        entityId: "https://idp.example.com/saml",
        ssoUrl: "https://idp.example.com/saml/sso",
        certificate: "MIIC...fake-cert",
      });

    expect(res.status).toBe(201);
    expect(res.body.config.orgId).toBe("org-1");
    expect(res.body.config.entityId).toBe("https://idp.example.com/saml");
  });

  // -------------------------------------------------------------------------
  // 2. SAML Callback (ACS)
  // -------------------------------------------------------------------------
  it("should handle SAML callback and create SSO user", async () => {
    const token = await getAdminToken();

    // First configure SAML
    await request(app)
      .post("/auth/sso/saml/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-1",
        entityId: "https://idp.example.com/saml",
        ssoUrl: "https://idp.example.com/saml/sso",
        certificate: "MIIC...fake-cert",
      });

    // Now hit ACS with mock SAML response
    const samlPayload = encodeMockPayload({
      email: "alice@corp.com",
      name: "Alice Smith",
      groups: ["admins"],
      nameId: "alice@corp.com",
    });

    const res = await request(app)
      .post("/auth/sso/saml/org-1/acs")
      .send({ SAMLResponse: samlPayload });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("alice@corp.com");
    expect(res.body.user.displayName).toBe("Alice Smith");
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.ssoProvider).toBe("saml");
  });

  // -------------------------------------------------------------------------
  // 3. OIDC Configuration
  // -------------------------------------------------------------------------
  it("should configure OIDC for an org (admin only)", async () => {
    const token = await getAdminToken();

    const res = await request(app)
      .post("/auth/sso/oidc/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-2",
        clientId: "animaforge-client",
        clientSecret: "super-secret",
        issuer: "https://auth.example.com",
        redirectUri: "https://animaforge.io/auth/sso/oidc/org-2/callback",
      });

    expect(res.status).toBe(201);
    expect(res.body.config.orgId).toBe("org-2");
    expect(res.body.config.clientId).toBe("animaforge-client");
  });

  // -------------------------------------------------------------------------
  // 4. OIDC Callback
  // -------------------------------------------------------------------------
  it("should handle OIDC callback and create SSO user", async () => {
    const token = await getAdminToken();

    // Configure OIDC first
    await request(app)
      .post("/auth/sso/oidc/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-2",
        clientId: "animaforge-client",
        clientSecret: "super-secret",
        issuer: "https://auth.example.com",
        redirectUri: "https://animaforge.io/auth/sso/oidc/org-2/callback",
      });

    // Mock OIDC code with user info
    const oidcCode = encodeMockPayload({
      email: "bob@corp.com",
      name: "Bob Jones",
      sub: "oidc-user-123",
      groups: ["moderators"],
    });

    const res = await request(app)
      .get(`/auth/sso/oidc/org-2/callback?code=${oidcCode}`);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("bob@corp.com");
    expect(res.body.user.role).toBe("moderator");
    expect(res.body.user.ssoProvider).toBe("oidc");
  });

  // -------------------------------------------------------------------------
  // 5. SSO User Creation (find-or-create, returning existing)
  // -------------------------------------------------------------------------
  it("should return existing SSO user on subsequent logins", async () => {
    const token = await getAdminToken();

    await request(app)
      .post("/auth/sso/saml/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-1",
        entityId: "https://idp.example.com/saml",
        ssoUrl: "https://idp.example.com/saml/sso",
        certificate: "MIIC...fake-cert",
      });

    const samlPayload = encodeMockPayload({
      email: "alice@corp.com",
      name: "Alice Smith",
      groups: ["users"],
    });

    // First login — creates user
    const first = await request(app)
      .post("/auth/sso/saml/org-1/acs")
      .send({ SAMLResponse: samlPayload });

    expect(first.status).toBe(201);

    // Second login — finds existing user
    const second = await request(app)
      .post("/auth/sso/saml/org-1/acs")
      .send({ SAMLResponse: samlPayload });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  // -------------------------------------------------------------------------
  // 6. Group-to-Role Mapping
  // -------------------------------------------------------------------------
  it("should map IdP groups to AnimaForge roles correctly", async () => {
    const token = await getAdminToken();

    await request(app)
      .post("/auth/sso/saml/configure")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: "org-1",
        entityId: "https://idp.example.com/saml",
        ssoUrl: "https://idp.example.com/saml/sso",
        certificate: "MIIC...fake-cert",
      });

    // User with moderator group
    const modPayload = encodeMockPayload({
      email: "mod@corp.com",
      name: "Mod User",
      groups: ["moderators", "members"],
    });

    const res = await request(app)
      .post("/auth/sso/saml/org-1/acs")
      .send({ SAMLResponse: modPayload });

    expect(res.body.user.role).toBe("moderator");

    // User with no recognized groups defaults to 'user'
    const defaultPayload = encodeMockPayload({
      email: "regular@corp.com",
      name: "Regular",
      groups: ["engineering"],
    });

    const res2 = await request(app)
      .post("/auth/sso/saml/org-1/acs")
      .send({ SAMLResponse: defaultPayload });

    expect(res2.body.user.role).toBe("user");
  });

  // -------------------------------------------------------------------------
  // 7. SCIM List Users
  // -------------------------------------------------------------------------
  it("should list users via SCIM endpoint", async () => {
    // Create some users via SCIM first
    await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        userName: "user1@corp.com",
        displayName: "User One",
        emails: [{ value: "user1@corp.com", primary: true }],
      });

    await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        userName: "user2@corp.com",
        displayName: "User Two",
        emails: [{ value: "user2@corp.com", primary: true }],
      });

    const res = await request(app)
      .get("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1");

    expect(res.status).toBe(200);
    expect(res.body.totalResults).toBe(2);
    expect(res.body.Resources).toHaveLength(2);
    expect(res.body.schemas).toContain(
      "urn:ietf:params:scim:api:messages:2.0:ListResponse",
    );
  });

  // -------------------------------------------------------------------------
  // 8. SCIM Create User
  // -------------------------------------------------------------------------
  it("should create a user via SCIM", async () => {
    const res = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
        userName: "newuser@corp.com",
        name: { givenName: "New", familyName: "User", formatted: "New User" },
        displayName: "New User",
        emails: [{ value: "newuser@corp.com", type: "work", primary: true }],
        active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.userName).toBe("newuser@corp.com");
    expect(res.body.displayName).toBe("New User");
    expect(res.body.active).toBe(true);
    expect(res.body.id).toBeDefined();
    expect(res.body.meta.resourceType).toBe("User");
  });

  // -------------------------------------------------------------------------
  // 9. SCIM Update User (PUT)
  // -------------------------------------------------------------------------
  it("should update a user via SCIM PUT", async () => {
    // Create user first
    const createRes = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        userName: "update-me@corp.com",
        displayName: "Original Name",
        emails: [{ value: "update-me@corp.com", primary: true }],
      });

    const userId = createRes.body.id;

    // Update via PUT
    const res = await request(app)
      .put(`/scim/v2/Users/${userId}`)
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        userName: "update-me@corp.com",
        displayName: "Updated Name",
        name: { givenName: "Updated", familyName: "User" },
        emails: [{ value: "update-me@corp.com", primary: true }],
        active: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Updated Name");
    expect(res.body.name.givenName).toBe("Updated");
  });

  // -------------------------------------------------------------------------
  // 10. SCIM Delete (Deactivate) User
  // -------------------------------------------------------------------------
  it("should deactivate a user via SCIM DELETE", async () => {
    // Create user first
    const createRes = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1")
      .send({
        userName: "delete-me@corp.com",
        displayName: "Delete Me",
        emails: [{ value: "delete-me@corp.com", primary: true }],
      });

    const userId = createRes.body.id;

    // Delete (deactivate)
    const deleteRes = await request(app)
      .delete(`/scim/v2/Users/${userId}`)
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1");

    expect(deleteRes.status).toBe(204);

    // Verify user is no longer in active list
    const listRes = await request(app)
      .get("/scim/v2/Users")
      .set("Authorization", "Bearer scim-token-123")
      .set("x-scim-org-id", "org-1");

    expect(listRes.body.totalResults).toBe(0);
  });
});
