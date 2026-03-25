import { Router } from "express";
import type { Request, Response } from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  patchUser,
  deleteUser,
  buildSCIMError,
  SCIM_SCHEMAS,
} from "../services/scimService";

const router = Router();

// ---------------------------------------------------------------------------
// SCIM Bearer Token Auth Middleware
// ---------------------------------------------------------------------------

function extractOrgId(req: Request): string | null {
  return (
    (req.headers["x-scim-org-id"] as string) ||
    (req.query.orgId as string) ||
    null
  );
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function scimAuth(req: Request, res: Response): string | null {
  const token = extractBearerToken(req);
  if (!token) {
    res
      .status(401)
      .set("Content-Type", "application/scim+json")
      .json(buildSCIMError(401, "Missing or invalid bearer token"));
    return null;
  }

  const orgId = extractOrgId(req);
  if (!orgId) {
    res
      .status(400)
      .set("Content-Type", "application/scim+json")
      .json(buildSCIMError(400, "Missing organization identifier (x-scim-org-id header)"));
    return null;
  }

  return orgId;
}

// ---------------------------------------------------------------------------
// SCIM Content-Type helper
// ---------------------------------------------------------------------------
function scimResponse(res: Response): Response {
  return res.set("Content-Type", "application/scim+json");
}

// ---------------------------------------------------------------------------
// GET /scim/v2/Users
// ---------------------------------------------------------------------------
router.get("/Users", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  const filter = req.query.filter as string | undefined;
  const startIndex = parseInt(req.query.startIndex as string, 10) || 1;
  const count = parseInt(req.query.count as string, 10) || 100;
  const baseUrl = req.protocol + "://" + req.get("host");

  const result = listUsers(orgId, filter, startIndex, count, baseUrl);
  scimResponse(res).status(200).json(result);
});

// ---------------------------------------------------------------------------
// GET /scim/v2/Users/:id
// ---------------------------------------------------------------------------
router.get("/Users/:id", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  const baseUrl = req.protocol + "://" + req.get("host");
  const user = getUser(orgId, req.params.id, baseUrl);

  if (!user) {
    scimResponse(res).status(404).json(buildSCIMError(404, "User not found"));
    return;
  }

  scimResponse(res).status(200).json(user);
});

// ---------------------------------------------------------------------------
// POST /scim/v2/Users
// ---------------------------------------------------------------------------
router.post("/Users", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  try {
    if (!req.body.userName && !req.body.emails?.[0]?.value) {
      scimResponse(res)
        .status(400)
        .json(buildSCIMError(400, "userName or emails is required"));
      return;
    }

    const user = createUser(orgId, req.body);
    scimResponse(res).status(201).json(user);
  } catch (err: any) {
    if (err.message?.includes("already exists")) {
      scimResponse(res).status(409).json(buildSCIMError(409, err.message));
    } else {
      scimResponse(res)
        .status(500)
        .json(buildSCIMError(500, err.message || "Internal server error"));
    }
  }
});

// ---------------------------------------------------------------------------
// PUT /scim/v2/Users/:id
// ---------------------------------------------------------------------------
router.put("/Users/:id", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  const user = updateUser(orgId, req.params.id, req.body);

  if (!user) {
    scimResponse(res).status(404).json(buildSCIMError(404, "User not found"));
    return;
  }

  scimResponse(res).status(200).json(user);
});

// ---------------------------------------------------------------------------
// PATCH /scim/v2/Users/:id
// ---------------------------------------------------------------------------
router.patch("/Users/:id", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  const schemas = req.body.schemas as string[] | undefined;
  if (
    !schemas ||
    !schemas.includes(SCIM_SCHEMAS.PatchOp)
  ) {
    scimResponse(res)
      .status(400)
      .json(buildSCIMError(400, "Invalid SCIM PATCH request - missing PatchOp schema"));
    return;
  }

  const user = patchUser(orgId, req.params.id, req.body);

  if (!user) {
    scimResponse(res).status(404).json(buildSCIMError(404, "User not found"));
    return;
  }

  scimResponse(res).status(200).json(user);
});

// ---------------------------------------------------------------------------
// DELETE /scim/v2/Users/:id
// ---------------------------------------------------------------------------
router.delete("/Users/:id", (req: Request, res: Response) => {
  const orgId = scimAuth(req, res);
  if (!orgId) return;

  const deleted = deleteUser(orgId, req.params.id);

  if (!deleted) {
    scimResponse(res).status(404).json(buildSCIMError(404, "User not found"));
    return;
  }

  res.status(204).send();
});

export default router;
