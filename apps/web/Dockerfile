# Web (Next.js) image.
#
# Built from the REPO ROOT, not from apps/web:
#   docker build -f apps/web/Dockerfile .
#
# Three faults in the previous version:
#
#   1. `npm ci` with an apps/web context. There is no lockfile there — this is
#      an npm workspace — so the build died at the first install:
#        npm error code EUSAGE
#        npm error The `npm ci` command can only install with an existing
#        npm error package-lock.json ...
#   2. apps/web depends on the @animaforge/db workspace package, which an
#      apps/web-only context cannot see at all.
#   3. It copied .next/standalone, but next.config.js does not set
#      `output: 'standalone'`, so that directory is never produced. The copy
#      would have failed even with a working install.
#
# This runs the app with `next start` against a pruned node_modules instead of
# using standalone output. Switching to standalone would give a much smaller
# image, but it needs a one-line change to apps/web/next.config.js, which
# belongs to the web owner rather than to this CI track.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /repo

# Prisma's engines are linked against OpenSSL. Without it on Alpine, generate
# warns "failed to detect the libssl/openssl version to use, and may not work
# as expected. Defaulting to openssl-1.1.x" and can pick an engine that does
# not match the runtime image.
RUN apk add --no-cache openssl

COPY . .

RUN npm ci

# apps/web imports `prisma` from @animaforge/db (src/lib/email/triggers.ts),
# and that package re-exports @prisma/client. generate only reads the schema,
# but the datasource block requires the variable to be set for it to parse.
ENV DATABASE_URL=postgresql://unused:unused@localhost:5432/unused
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @animaforge/web

RUN npm prune --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /repo

# Prisma's query engine loads OpenSSL at run time.
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The repo-root layout is preserved deliberately: node_modules/@animaforge/db
# is a symlink into packages/db, and it only resolves if both keep the same
# relative positions they had at install time.
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/package.json ./package.json
COPY --from=build --chown=node:node /repo/packages ./packages
COPY --from=build --chown=node:node /repo/apps/web/.next ./apps/web/.next
# No `public/` copy: apps/web has no public directory. The previous Dockerfile
# copied one anyway, which fails the build outright —
#   ERROR: failed to compute cache key: "/repo/apps/web/public": not found
COPY --from=build --chown=node:node /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=node:node /repo/apps/web/next.config.js ./apps/web/next.config.js

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next start writes to .next/cache at runtime, so the app tree is owned by the
# unprivileged user rather than by root.
USER node

CMD ["npm", "run", "start", "--workspace", "@animaforge/web"]
