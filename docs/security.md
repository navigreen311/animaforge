# AnimaForge Security Documentation

This document describes the security architecture, policies, and compliance posture of the AnimaForge platform.

---

## Authentication Architecture

### JWT + RBAC

AnimaForge uses JSON Web Tokens (JWT) for stateless authentication across all services.

- **Token issuer**: Auth service (`services/auth`)
- **Algorithm**: RS256 (asymmetric key pair)
- **Access token TTL**: 15 minutes
- **Refresh token TTL**: 7 days (30 days for "remember me")
- **Token storage**: Access token in memory, refresh token in HttpOnly secure cookie

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| `admin` | Full access: user management, billing, audit, all CRUD |
| `creator` | Create/edit/delete own projects, characters, assets; generate content |
| `editor` | Edit assigned projects, review/approve shots, post comments |
| `viewer` | Read-only access to assigned projects |

Roles are enforced at the API Gateway (Kong/Express middleware) and verified again at the service level. Permission checks use a deny-by-default policy.

### Token Validation Flow

1. Client sends `Authorization: Bearer <token>` header
2. Gateway validates JWT signature against the public key
3. Gateway extracts `sub`, `role`, `org_id`, `permissions` claims
4. Request is forwarded with validated claims in `X-User-*` headers
5. Downstream service applies route-level permission checks

---

## SSO and SCIM

### Single Sign-On (SSO)

Enterprise tier organizations can configure SAML 2.0 or OIDC-based SSO:

- **SAML 2.0**: Supports Okta, Azure AD, OneLogin, PingFederate
- **OIDC**: Supports any compliant provider (Google Workspace, Auth0, Keycloak)
- **Just-in-Time (JIT) provisioning**: New users are auto-created on first SSO login with a default role
- **Forced SSO**: Admins can require SSO for all org members (password login disabled)

### SCIM 2.0 Provisioning

- Automated user provisioning and deprovisioning from the identity provider
- Supports `Users` and `Groups` resources
- Group-to-role mapping is configurable per organization
- Deprovisioned users are immediately disabled (active sessions revoked)

---

## API Security

### Rate Limiting

Redis-backed sliding window rate limiting applied at the Gateway:

| Tier | Limit | Burst |
|------|-------|-------|
| Starter | 60 req/min | 10 |
| Pro | 300 req/min | 50 |
| Enterprise | 1000 req/min | 200 |

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1711357200
```

### Request Validation

- All request bodies are validated against Zod schemas (TypeScript) or Pydantic models (Python)
- Path and query parameters are type-checked and sanitized
- File uploads are scanned for malware and validated against allowed MIME types
- Maximum request body size: 50 MB (500 MB for asset uploads via pre-signed URLs)

### CORS

- Allowed origins are configured per environment
- Credentials are only allowed from registered origins
- Preflight responses are cached for 1 hour

### API Keys

- Server-to-server and plugin integrations use `X-API-Key` header authentication
- API keys are hashed (SHA-256) before storage
- Keys can be scoped to specific endpoints and rate-limited independently
- Keys are rotatable without downtime (dual-key support during rotation)

---

## Data Encryption

### In Transit

- All external traffic is TLS 1.3 (minimum TLS 1.2)
- Internal service-to-service communication uses mTLS within the Kubernetes cluster
- WebSocket connections require TLS (`wss://`)

### At Rest

- PostgreSQL: AES-256 encryption via AWS RDS or equivalent managed service
- S3/R2 object storage: AES-256 server-side encryption (SSE-S3)
- Redis: Encrypted at rest when using managed Redis (ElastiCache, Upstash)
- Backups: Encrypted with a separate KMS key

### Field-Level Encryption

Sensitive fields are encrypted at the application level before database storage:

- User email addresses (for GDPR right to erasure)
- API keys and webhook secrets
- SSO configuration secrets
- Payment method tokens

---

## Secrets Management

- **Runtime secrets**: Injected via environment variables from AWS Secrets Manager or HashiCorp Vault
- **Build secrets**: Managed through GitHub Actions encrypted secrets
- **Rotation policy**: All secrets are rotated every 90 days
- **No secrets in code**: Pre-commit hooks scan for accidental secret commits (using gitleaks)
- **Access audit**: All secret access is logged to the audit trail

---

## Consent Model

AnimaForge implements a comprehensive consent framework for AI-generated content involving likenesses:

### Consent Types

| Type | Description |
|------|-------------|
| `perpetual` | Unlimited use with no expiry |
| `time_limited` | Valid for a specified date range |
| `project_scoped` | Limited to a specific project |
| `revocable` | Can be withdrawn at any time |

### Consent Flow

1. Creator uploads character reference images
2. If the character represents a real person, a consent request is generated
3. Rights holder receives a consent request via email with a unique signed link
4. Rights holder reviews the terms and approves or denies
5. Consent record is stored immutably with a timestamp and cryptographic signature
6. Every generation job validates consent status before processing
7. Revocation triggers immediate blocking of new generations for that character

### Consent Chain

Every consent action is recorded in an append-only log:
```json
[
  { "action": "requested", "timestamp": "2026-02-15T10:00:00Z", "actor": "creator" },
  { "action": "approved", "timestamp": "2026-02-15T14:00:00Z", "actor": "rights_holder" }
]
```

---

## Audit Trail

All significant actions are recorded in an immutable audit log:

### Audited Events

- Authentication: login, logout, SSO, token refresh, failed attempts
- Authorization: permission denied events
- Data access: project/character/asset create, read, update, delete
- Generation: job start, complete, fail, cancel
- Governance: moderation results, consent changes, C2PA signing
- Administration: user invite, role change, settings update, billing events

### Audit Entry Structure

| Field | Description |
|-------|-------------|
| `id` | Unique audit entry ID |
| `timestamp` | ISO 8601 timestamp |
| `user` | Acting user email or system actor |
| `action` | Action type (create, update, delete, login, etc.) |
| `resource` | Resource type (project, character, shot, etc.) |
| `resource_id` | Resource identifier |
| `ip` | Source IP address |
| `user_agent` | Client user agent |
| `details` | JSON payload with action-specific data |

### Retention

- Standard tier: 90 days
- Pro tier: 1 year
- Enterprise tier: 7 years (configurable)
- Audit logs are stored in a separate, append-only database partition
- Logs are exportable in JSON or CSV format via the Enterprise API

---

## GDPR and CCPA Compliance

### Data Subject Rights

| Right | Implementation |
|-------|---------------|
| **Right to access** | Users can export all their data via Settings > Privacy > Download My Data |
| **Right to erasure** | Account deletion removes all personal data within 30 days; generation outputs are anonymized |
| **Right to rectification** | Users can update all profile and character data at any time |
| **Right to portability** | Data export in standard JSON format |
| **Right to restriction** | Users can disable their account without deletion |
| **Right to object** | Users can opt out of analytics and marketing communications |

### Data Processing

- **Legal basis**: Contract performance (for service delivery), legitimate interest (for analytics), consent (for marketing)
- **Data Processing Agreement (DPA)**: Available for Enterprise customers
- **Sub-processors**: Listed at animaforge.com/legal/sub-processors and updated with 30-day notice
- **Data residency**: EU customers can select EU-only data processing (Frankfurt region)

### Cookie Policy

- **Strictly necessary**: Session, authentication, CSRF (no consent required)
- **Functional**: User preferences, language (opt-in)
- **Analytics**: Usage metrics (opt-in, anonymized by default)
- **Marketing**: None (AnimaForge does not use marketing cookies)

### CCPA Specifics

- "Do Not Sell My Personal Information" link in footer and settings
- Annual CCPA metrics report published at animaforge.com/legal/ccpa
- Verified consumer requests processed within 45 days

---

## Penetration Testing Schedule

| Activity | Frequency | Provider |
|----------|-----------|----------|
| Automated vulnerability scanning | Weekly | Dependabot + Snyk |
| SAST (Static Application Security Testing) | Every PR | GitHub CodeQL |
| DAST (Dynamic Application Security Testing) | Monthly | OWASP ZAP |
| Third-party penetration test | Annually | Independent security firm |
| Bug bounty program | Ongoing | Coordinated via security@animaforge.com |
| Dependency audit | Weekly | `npm audit` + `pip-audit` |
| Container image scanning | Every build | Trivy |
| Infrastructure security review | Quarterly | Internal + external |

### Vulnerability Disclosure

- Security issues should be reported to security@animaforge.com
- We follow a 90-day coordinated disclosure policy
- Critical vulnerabilities are patched within 24 hours of confirmation
- Security advisories are published at animaforge.com/security/advisories
