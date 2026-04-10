# AnimaForge — Launch Completion Status

## Audit Items: Final Status

### Launch Blockers ✅
- Legal pages (Terms, Privacy, AI Policy) — built (DRAFT, needs lawyer review)
- GDPR/CCPA cookie consent — built
- Public landing page — built
- Pricing page — built
- Custom 404, 500, maintenance — built + /api/health
- Email sequences — 9 templates built (needs RESEND_API_KEY for production)

### Pre-Launch Essentials ✅
- Sentry monitoring — stub built (needs @sentry/nextjs install + DSN)
- Feedback widget — built
- Help center — built
- In-app changelog — built
- Batch generation — built
- Webhook delivery logs — built
- API rate limit headers — built

### Growth Features ✅
- Referral program — built
- Feature flags — built
- Milestone emails — built
- Community feed (/explore) — built
- Custom domains — built (this sprint)
- Localization (en/es/fr) — built

### Platform Infrastructure ✅
- Mobile app (React Native + Expo) — initialized this sprint
- Desktop app (Electron) — initialized this sprint
- Multi-region — region lib + UI built this sprint (real GPU clusters require AWS work)
- Backup & DR — script + runbook built
- Status page — built
- API versioning (/api/v1/* rewrites) — built this sprint

## Production Deployment Checklist

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis for queues + sessions
- `JWT_SECRET` — auth token signing
- `RESEND_API_KEY` — transactional email
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` — error monitoring
- `NEXT_PUBLIC_POSTHOG_KEY` — analytics
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AWS_CLOUDFRONT_DOMAIN`
- `REPLICATE_API_TOKEN` — video/audio generation
- `ELEVENLABS_API_KEY` — voice TTS
- `ANTHROPIC_API_KEY` — Claude API
- `C2PA_SIGNING_KEY` — content provenance

### DNS Records
- A record: `animaforge.com` → load balancer
- CNAME: `app.animaforge.com` → main app
- CNAME: `api.animaforge.com` → API gateway
- CNAME: `status.animaforge.com` → Statuspage.io (or in-app /status)
- CNAME: `*.review.animaforge.com` → wildcard for custom domains
- MX records for `@animaforge.com` email

### SSL Certificates
- Wildcard cert for `*.animaforge.com` (Let's Encrypt or AWS ACM)
- Per-tenant SSL provisioning for custom domains (Cloudflare for SaaS recommended)

### Third-Party Services
- Stripe webhooks: `invoice.payment_succeeded`, `customer.subscription.updated`
- Resend: verify sending domain, configure SPF/DKIM
- Sentry: create project, install integration
- PostHog: create project, configure event ingestion
- AWS S3: create primary bucket + replica bucket in different region
- Replicate / Fal.ai: provision GPU inference endpoints in 2+ regions

## Multi-Region Setup Guide
1. Provision regional clusters in: us-east-1, us-west-2, eu-west-1, eu-central-1, ap-southeast-1, ap-northeast-1
2. Set up GeoDNS routing via Cloudflare or AWS Route 53
3. Replicate PostgreSQL via logical replication or Aurora Global Database
4. Enable S3 cross-region replication
5. Deploy regional API gateways with shared session store (Redis cluster)
6. Configure latency-aware routing

## Custom Domain Setup
1. Customer adds domain via /settings/domains
2. App generates CNAME target + verification token
3. Customer adds CNAME record at their DNS provider
4. App polls DNS for verification (or webhook)
5. SSL provisioned via Cloudflare for SaaS (or certbot)
6. Subdomain mapped to /review/[projectId] route via host header

## Mobile App Submission
- iOS App Store: requires Apple Developer account ($99/yr), TestFlight beta, App Store review (1-3 days)
- Google Play: requires Google Play Console ($25 one-time), internal testing, production review (1-2 days)
- Privacy nutrition labels required for both stores
- Push notification certificates (APNs for iOS, FCM for Android)

## Desktop App Code Signing
- macOS: Apple Developer ID certificate ($99/yr), notarization required
- Windows: EV code signing certificate ($300-500/yr) for SmartScreen reputation
- Linux: optional GPG signing for AppImage/deb

## Rollback Procedure
1. Revert deployment via blue/green or canary
2. Roll back database migrations if schema changed
3. Invalidate CDN cache
4. Notify users via status page if user-facing impact
5. Post-mortem within 48 hours

## First 24h Monitoring
- Error rate < 0.5% (Sentry)
- p95 API latency < 500ms (PostHog/Datadog)
- Successful generation rate > 95%
- Email delivery rate > 99% (Resend)
- Stripe payment success > 98%
- Watch login funnel for drop-offs
- Monitor #incidents Slack channel
