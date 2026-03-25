import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, type AuthRequest } from "../middleware/authenticate";
import {
  configureSAML,
  getSAMLConfig,
  handleSAMLResponse,
  configureOIDC,
  getOIDCConfig,
  handleOIDCCallback,
  findOrCreateSSOUser,
  generateSSOToken,
} from "../services/ssoService";

const router = Router();

// ---------------------------------------------------------------------------
// POST /auth/sso/saml/configure
// ---------------------------------------------------------------------------
router.post(
  "/saml/configure",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const { orgId, entityId, ssoUrl, certificate } = req.body;

      if (!orgId || !entityId || !ssoUrl || !certificate) {
        res.status(400).json({
          error: "Missing required fields: orgId, entityId, ssoUrl, certificate",
        });
        return;
      }

      const config = configureSAML(orgId, { entityId, ssoUrl, certificate });
      res.status(201).json({ message: "SAML configured", config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /auth/sso/saml/:orgId/metadata
// ---------------------------------------------------------------------------
router.get("/saml/:orgId/metadata", (req: Request, res: Response) => {
  const { orgId } = req.params;
  const config = getSAMLConfig(orgId);

  if (!config) {
    res.status(404).json({ error: "SAML not configured for this organization" });
    return;
  }

  const baseUrl = req.protocol + "://" + req.get("host");
  const metadata = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"' +
    ' entityID="' + baseUrl + '/auth/sso/saml/' + orgId + '/metadata">' +
    '<md:SPSSODescriptor' +
    ' AuthnRequestsSigned="false"' +
    ' WantAssertionsSigned="true"' +
    ' protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">' +
    '<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>' +
    '<md:AssertionConsumerService' +
    ' Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"' +
    ' Location="' + baseUrl + '/auth/sso/saml/' + orgId + '/acs"' +
    ' index="1" />' +
    '</md:SPSSODescriptor>' +
    '</md:EntityDescriptor>';

  res.set("Content-Type", "application/xml");
  res.send(metadata);
});

// ---------------------------------------------------------------------------
// POST /auth/sso/saml/:orgId/acs
// ---------------------------------------------------------------------------
router.post("/saml/:orgId/acs", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const config = getSAMLConfig(orgId);

    if (!config) {
      res.status(404).json({ error: "SAML not configured for this organization" });
      return;
    }

    const samlResponse = req.body.SAMLResponse;
    if (!samlResponse) {
      res.status(400).json({ error: "Missing SAMLResponse" });
      return;
    }

    const assertion = handleSAMLResponse(samlResponse);

    if (!assertion.email) {
      res.status(400).json({ error: "SAML assertion missing email attribute" });
      return;
    }

    const { user, created } = findOrCreateSSOUser(assertion.email, orgId, {
      name: assertion.name,
      groups: assertion.groups,
      provider: "saml",
      externalId: assertion.nameId,
    });

    const token = generateSSOToken(user);

    res.status(created ? 201 : 200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
        orgId: user.orgId,
        ssoProvider: user.ssoProvider,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "SAML authentication failed" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/sso/oidc/configure
// ---------------------------------------------------------------------------
router.post(
  "/oidc/configure",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      const { orgId, clientId, clientSecret, issuer, redirectUri } = req.body;

      if (!orgId || !clientId || !clientSecret || !issuer || !redirectUri) {
        res.status(400).json({
          error:
            "Missing required fields: orgId, clientId, clientSecret, issuer, redirectUri",
        });
        return;
      }

      const config = configureOIDC(orgId, {
        clientId,
        clientSecret,
        issuer,
        redirectUri,
      });

      res.status(201).json({ message: "OIDC configured", config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /auth/sso/oidc/:orgId/authorize
// ---------------------------------------------------------------------------
router.get("/oidc/:orgId/authorize", (req: Request, res: Response) => {
  const { orgId } = req.params;
  const config = getOIDCConfig(orgId);

  if (!config) {
    res.status(404).json({ error: "OIDC not configured for this organization" });
    return;
  }

  const state = Buffer.from(JSON.stringify({ orgId })).toString("base64");
  const authUrl = new URL(config.issuer + "/authorize");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email groups");
  authUrl.searchParams.set("state", state);

  res.redirect(authUrl.toString());
});

// ---------------------------------------------------------------------------
// GET /auth/sso/oidc/:orgId/callback
// ---------------------------------------------------------------------------
router.get("/oidc/:orgId/callback", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    const config = getOIDCConfig(orgId);
    if (!config) {
      res.status(404).json({ error: "OIDC not configured for this organization" });
      return;
    }

    const userInfo = await handleOIDCCallback(code, orgId);

    if (!userInfo.email) {
      res.status(400).json({ error: "OIDC response missing email" });
      return;
    }

    const { user, created } = findOrCreateSSOUser(userInfo.email, orgId, {
      name: userInfo.name,
      groups: userInfo.groups,
      provider: "oidc",
      externalId: userInfo.sub,
    });

    const token = generateSSOToken(user);

    res.status(created ? 201 : 200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
        orgId: user.orgId,
        ssoProvider: user.ssoProvider,
      },
    });
  } catch (err: any) {
    res
      .status(400)
      .json({ error: err.message || "OIDC authentication failed" });
  }
});

export default router;
