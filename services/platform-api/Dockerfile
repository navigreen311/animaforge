# Platform API image.
#
# Built from the REPO ROOT, not from services/platform-api:
#   docker build -f services/platform-api/Dockerfile .
#
# The previous version used a services/platform-api context and ran
# `npm ci --production`. There is no package-lock.json in that directory —
# this is an npm workspace and the lockfile lives at the repo root — so the
# build died immediately:
#
#   npm error code EUSAGE
#   npm error The `npm ci` command can only install with an existing
#   npm error package-lock.json ...
#
# It also had no build step at all while its CMD pointed at dist/index.js, and
# `--production` would have omitted the TypeScript needed to produce it.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /repo

# Prisma's engines are linked against OpenSSL. Without it on Alpine, generate
# warns "failed to detect the libssl/openssl version to use, and may not work
# as expected. Defaulting to openssl-1.1.x" and can pick an engine that does
# not match the runtime image.
RUN apk add --no-cache openssl

# The whole repo, minus everything in .dockerignore. npm ci needs the root
# lockfile and every workspace manifest it references, so a partial copy would
# fail lockfile validation.
COPY . .

RUN npm ci

# services/platform-api/src/db.ts imports @prisma/client. Without generate it
# resolves to the ungenerated stub, whose models are all `{}`, and tsc fails
# with "Namespace 'Prisma' has no exported member 'CharacterUncheckedCreateInput'".
# generate only reads the schema, but the datasource block requires the
# variable to be set for the config to parse.
ENV DATABASE_URL=postgresql://unused:unused@localhost:5432/unused
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

RUN npm run build --workspace @animaforge/platform-api

# Drop devDependencies now that dist/ exists. Done here rather than with a
# second `npm ci --omit=dev` so the generated Prisma client survives.
RUN npm prune --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Prisma's query engine loads OpenSSL at run time.
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# node_modules keeps the repo-root layout it was installed with; dist/ resolves
# imports up to /app/node_modules.
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/services/platform-api/dist ./dist
COPY --from=build --chown=node:node /repo/services/platform-api/package.json ./package.json

EXPOSE 3001

# Unprivileged user shipped with the base image (uid 1000).
USER node

CMD ["node", "dist/index.js"]
