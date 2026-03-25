import { v4 as uuidv4 } from "uuid";
import { signToken, buildJwtPayload } from "./authService";
import type { User, UserRole, UserTier } from "../models/authSchemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SAMLConfig {
  orgId: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  createdAt: Date;
}

export interface OIDCConfig {
  orgId: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  redirectUri: string;
  createdAt: Date;
}

export interface SAMLAssertion {
  email: string;
  name: string;
  groups: string[];
  nameId: string;
  sessionIndex: string;
}

export interface OIDCUserInfo {
  email: string;
  name: string;
  sub: string;
  groups: string[];
}

export interface SSOUser extends User {
  orgId: string;
  ssoProvider: "saml" | "oidc";
  externalId?: string;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const samlConfigs = new Map<string, SAMLConfig>();
const oidcConfigs = new Map<string, OIDCConfig>();
const ssoUsers = new Map<string, SSOUser>();
const ssoUsersById = new Map<string, SSOUser>();

// ---------------------------------------------------------------------------
// Role mapping: IdP group name -> AnimaForge role
// ---------------------------------------------------------------------------

const GROUP_ROLE_MAP: Record<string, UserRole> = {
  admins: "admin",
  administrators: "admin",
  moderators: "moderator",
  mods: "moderator",
  users: "user",
  members: "user",
};

// ---------------------------------------------------------------------------
// Store accessors (for testing)
// ---------------------------------------------------------------------------

export function clearSSOStore(): void {
  samlConfigs.clear();
  oidcConfigs.clear();
  ssoUsers.clear();
  ssoUsersById.clear();
}

export function getSSOUsers(): Map<string, SSOUser> {
  return ssoUsers;
}

export function getSSOUsersById(): Map<string, SSOUser> {
  return ssoUsersById;
}

// ---------------------------------------------------------------------------
// SAML Configuration
// ---------------------------------------------------------------------------

export function configureSAML(
  orgId: string,
  config: { entityId: string; ssoUrl: string; certificate: string },
): SAMLConfig {
  const samlConfig: SAMLConfig = {
    orgId,
    entityId: config.entityId,
    ssoUrl: config.ssoUrl,
    certificate: config.certificate,
    createdAt: new Date(),
  };
  samlConfigs.set(orgId, samlConfig);
  return samlConfig;
}

export function getSAMLConfig(orgId: string): SAMLConfig | undefined {
  return samlConfigs.get(orgId);
}

// ---------------------------------------------------------------------------
// SAML Response Handling (mock parse/validate)
// ---------------------------------------------------------------------------

export function handleSAMLResponse(samlResponse: string): SAMLAssertion {
  try {
    const decoded = Buffer.from(samlResponse, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    return {
      email: parsed.email || "",
      name: parsed.name || "",
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      nameId: parsed.nameId || parsed.email || "",
      sessionIndex: parsed.sessionIndex || uuidv4(),
    };
  } catch {
    throw new Error("Invalid SAML response: unable to parse assertion");
  }
}

// ---------------------------------------------------------------------------
// OIDC Configuration
// ---------------------------------------------------------------------------

export function configureOIDC(
  orgId: string,
  config: {
    clientId: string;
    clientSecret: string;
    issuer: string;
    redirectUri: string;
  },
): OIDCConfig {
  const oidcConfig: OIDCConfig = {
    orgId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    issuer: config.issuer,
    redirectUri: config.redirectUri,
    createdAt: new Date(),
  };
  oidcConfigs.set(orgId, oidcConfig);
  return oidcConfig;
}

export function getOIDCConfig(orgId: string): OIDCConfig | undefined {
  return oidcConfigs.get(orgId);
}

// ---------------------------------------------------------------------------
// OIDC Callback Handling (mock token exchange)
// ---------------------------------------------------------------------------

export async function handleOIDCCallback(
  code: string,
  orgId: string,
): Promise<OIDCUserInfo> {
  const config = oidcConfigs.get(orgId);
  if (!config) {
    throw new Error("No OIDC configuration found for org " + orgId);
  }

  try {
    const decoded = Buffer.from(code, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    return {
      email: parsed.email || "",
      name: parsed.name || "",
      sub: parsed.sub || uuidv4(),
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
    };
  } catch {
    throw new Error("Invalid OIDC authorization code");
  }
}

// ---------------------------------------------------------------------------
// SSO User Management
// ---------------------------------------------------------------------------

export function findOrCreateSSOUser(
  email: string,
  orgId: string,
  attributes: {
    name: string;
    groups?: string[];
    provider: "saml" | "oidc";
    externalId?: string;
  },
): { user: SSOUser; created: boolean } {
  const existing = ssoUsers.get(email);
  if (existing) {
    existing.displayName = attributes.name || existing.displayName;
    existing.orgId = orgId;
    if (attributes.groups && attributes.groups.length > 0) {
      existing.role = mapGroupsToRoles(attributes.groups);
    }
    return { user: existing, created: false };
  }

  const role = attributes.groups
    ? mapGroupsToRoles(attributes.groups)
    : ("user" as UserRole);

  const user: SSOUser = {
    id: uuidv4(),
    email,
    passwordHash: "",
    displayName: attributes.name || email,
    role,
    tier: "enterprise" as UserTier,
    createdAt: new Date(),
    orgId,
    ssoProvider: attributes.provider,
    externalId: attributes.externalId,
  };

  ssoUsers.set(email, user);
  ssoUsersById.set(user.id, user);

  return { user, created: true };
}

// ---------------------------------------------------------------------------
// Group-to-Role Mapping
// ---------------------------------------------------------------------------

export function mapGroupsToRoles(groups: string[]): UserRole {
  const normalizedGroups = groups.map((g) => g.toLowerCase().trim());

  for (const group of normalizedGroups) {
    if (GROUP_ROLE_MAP[group] === "admin") return "admin";
  }
  for (const group of normalizedGroups) {
    if (GROUP_ROLE_MAP[group] === "moderator") return "moderator";
  }

  return "user";
}

// ---------------------------------------------------------------------------
// Session Token Generation for SSO Users
// ---------------------------------------------------------------------------

export function generateSSOToken(user: SSOUser): string {
  const payload = buildJwtPayload(user);
  return signToken(payload);
}
