import { v4 as uuidv4 } from "uuid";
import type { UserRole, UserTier } from "../models/authSchemas";

// ---------------------------------------------------------------------------
// SCIM 2.0 Schema URIs
// ---------------------------------------------------------------------------

export const SCIM_SCHEMAS = {
  User: "urn:ietf:params:scim:schemas:core:2.0:User",
  EnterpriseUser: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
  Group: "urn:ietf:params:scim:schemas:core:2.0:Group",
  ListResponse: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  PatchOp: "urn:ietf:params:scim:api:messages:2.0:PatchOp",
  Error: "urn:ietf:params:scim:api:messages:2.0:Error",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SCIMName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
}

export interface SCIMEmail {
  value: string;
  type?: string;
  primary?: boolean;
}

export interface SCIMUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: SCIMName;
  displayName?: string;
  emails?: SCIMEmail[];
  active: boolean;
  groups?: Array<{ value: string; display: string }>;
  meta: {
    resourceType: string;
    created: string;
    lastModified: string;
    location?: string;
  };
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"?: {
    organization?: string;
    department?: string;
  };
}

export interface SCIMListResponse {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: SCIMUser[];
}

export interface SCIMError {
  schemas: string[];
  status: string;
  detail: string;
}

export interface SCIMPatchOp {
  schemas: string[];
  Operations: Array<{
    op: "add" | "replace" | "remove";
    path?: string;
    value?: any;
  }>;
}

// ---------------------------------------------------------------------------
// Internal user record
// ---------------------------------------------------------------------------

interface InternalSCIMUser {
  id: string;
  orgId: string;
  externalId?: string;
  userName: string;
  givenName?: string;
  familyName?: string;
  displayName: string;
  email: string;
  active: boolean;
  role: UserRole;
  tier: UserTier;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// In-memory store  (orgId -> userId -> InternalSCIMUser)
// ---------------------------------------------------------------------------

const scimStore = new Map<string, Map<string, InternalSCIMUser>>();

function getOrgStore(orgId: string): Map<string, InternalSCIMUser> {
  let store = scimStore.get(orgId);
  if (!store) {
    store = new Map();
    scimStore.set(orgId, store);
  }
  return store;
}

export function clearSCIMStore(): void {
  scimStore.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSCIMUser(user: InternalSCIMUser, baseUrl?: string): SCIMUser {
  const scimUser: SCIMUser = {
    schemas: [SCIM_SCHEMAS.User, SCIM_SCHEMAS.EnterpriseUser],
    id: user.id,
    externalId: user.externalId,
    userName: user.userName,
    name: {
      formatted: user.displayName,
      givenName: user.givenName,
      familyName: user.familyName,
    },
    displayName: user.displayName,
    emails: [
      {
        value: user.email,
        type: "work",
        primary: true,
      },
    ],
    active: user.active,
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: baseUrl ? `${baseUrl}/scim/v2/Users/${user.id}` : undefined,
    },
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
      organization: user.orgId,
      department: user.department,
    },
  };

  return scimUser;
}

function applyFilter(
  users: InternalSCIMUser[],
  filter?: string,
): InternalSCIMUser[] {
  if (!filter) return users;

  // Basic SCIM filter support: userName eq "value" or emails.value eq "value"
  const eqMatch = filter.match(
    /^(\w+(?:\.\w+)?)\s+eq\s+"([^"]+)"$/i,
  );
  if (!eqMatch) return users;

  const [, field, value] = eqMatch;

  return users.filter((u) => {
    switch (field.toLowerCase()) {
      case "username":
        return u.userName === value;
      case "emails.value":
      case "email":
        return u.email === value;
      case "displayname":
        return u.displayName === value;
      case "externalid":
        return u.externalId === value;
      default:
        return true;
    }
  });
}

export function buildSCIMError(status: number, detail: string): SCIMError {
  return {
    schemas: [SCIM_SCHEMAS.Error],
    status: String(status),
    detail,
  };
}

// ---------------------------------------------------------------------------
// SCIM 2.0 User Operations
// ---------------------------------------------------------------------------

export function listUsers(
  orgId: string,
  filter?: string,
  startIndex: number = 1,
  count: number = 100,
  baseUrl?: string,
): SCIMListResponse {
  const store = getOrgStore(orgId);
  let allUsers = Array.from(store.values()).filter((u) => u.active);
  allUsers = applyFilter(allUsers, filter);

  const totalResults = allUsers.length;
  // SCIM uses 1-based indexing
  const start = Math.max(0, startIndex - 1);
  const page = allUsers.slice(start, start + count);

  return {
    schemas: [SCIM_SCHEMAS.ListResponse],
    totalResults,
    startIndex,
    itemsPerPage: page.length,
    Resources: page.map((u) => toSCIMUser(u, baseUrl)),
  };
}

export function getUser(
  orgId: string,
  userId: string,
  baseUrl?: string,
): SCIMUser | null {
  const store = getOrgStore(orgId);
  const user = store.get(userId);
  if (!user) return null;
  return toSCIMUser(user, baseUrl);
}

export function createUser(
  orgId: string,
  scimPayload: Partial<SCIMUser>,
): SCIMUser {
  const store = getOrgStore(orgId);

  const email =
    scimPayload.emails?.[0]?.value || scimPayload.userName || "";
  const userName = scimPayload.userName || email;

  // Check for duplicate userName within org
  for (const existing of store.values()) {
    if (existing.userName === userName && existing.active) {
      throw new Error(`User with userName "${userName}" already exists`);
    }
  }

  const now = new Date();
  const user: InternalSCIMUser = {
    id: uuidv4(),
    orgId,
    externalId: scimPayload.externalId,
    userName,
    givenName: scimPayload.name?.givenName,
    familyName: scimPayload.name?.familyName,
    displayName:
      scimPayload.displayName ||
      scimPayload.name?.formatted ||
      userName,
    email,
    active: scimPayload.active !== false,
    role: "user",
    tier: "enterprise",
    createdAt: now,
    updatedAt: now,
  };

  store.set(user.id, user);
  return toSCIMUser(user);
}

export function updateUser(
  orgId: string,
  userId: string,
  scimPayload: Partial<SCIMUser>,
): SCIMUser | null {
  const store = getOrgStore(orgId);
  const existing = store.get(userId);
  if (!existing) return null;

  // Apply full replacement (PUT semantics)
  if (scimPayload.userName) existing.userName = scimPayload.userName;
  if (scimPayload.displayName) existing.displayName = scimPayload.displayName;
  if (scimPayload.name) {
    if (scimPayload.name.givenName !== undefined)
      existing.givenName = scimPayload.name.givenName;
    if (scimPayload.name.familyName !== undefined)
      existing.familyName = scimPayload.name.familyName;
    if (scimPayload.name.formatted)
      existing.displayName = scimPayload.name.formatted;
  }
  if (scimPayload.emails?.[0]?.value) {
    existing.email = scimPayload.emails[0].value;
  }
  if (scimPayload.active !== undefined) {
    existing.active = scimPayload.active;
  }
  if (scimPayload.externalId !== undefined) {
    existing.externalId = scimPayload.externalId;
  }

  existing.updatedAt = new Date();
  store.set(userId, existing);

  return toSCIMUser(existing);
}

export function patchUser(
  orgId: string,
  userId: string,
  patchOp: SCIMPatchOp,
): SCIMUser | null {
  const store = getOrgStore(orgId);
  const existing = store.get(userId);
  if (!existing) return null;

  for (const op of patchOp.Operations) {
    switch (op.op) {
      case "replace":
        if (op.path === "active" || op.path === "active") {
          existing.active = Boolean(op.value);
        } else if (op.path === "displayName") {
          existing.displayName = String(op.value);
        } else if (op.path === "userName") {
          existing.userName = String(op.value);
        } else if (op.path === "name.givenName") {
          existing.givenName = String(op.value);
        } else if (op.path === "name.familyName") {
          existing.familyName = String(op.value);
        } else if (!op.path && typeof op.value === "object") {
          // Bulk replace without path
          if (op.value.active !== undefined)
            existing.active = Boolean(op.value.active);
          if (op.value.displayName)
            existing.displayName = String(op.value.displayName);
        }
        break;
      case "add":
        if (op.path === "emails" && Array.isArray(op.value)) {
          existing.email = op.value[0]?.value || existing.email;
        }
        break;
      case "remove":
        // SCIM remove operations — typically used for multi-valued attrs
        break;
    }
  }

  existing.updatedAt = new Date();
  store.set(userId, existing);

  return toSCIMUser(existing);
}

export function deleteUser(orgId: string, userId: string): boolean {
  const store = getOrgStore(orgId);
  const existing = store.get(userId);
  if (!existing) return false;

  // SCIM DELETE = soft-deactivate
  existing.active = false;
  existing.updatedAt = new Date();
  store.set(userId, existing);

  return true;
}
