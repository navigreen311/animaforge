# Auth service image.
#
# Built from the REPO ROOT, not from services/auth:
#   docker build -f services/auth/Dockerfile .
#
# Same three faults as the platform-api image it was copied from: `npm ci` with
# no lockfile in the context (npm error EUSAGE), no build step despite a CMD
# pointing at dist/index.js, and `--production` omitting the TypeScript needed
# to produce it.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /repo

COPY . .

RUN npm ci

# services/auth/src/db.ts imports @prisma/client, so the client has to exist
# before tsc runs. generate only reads the schema, but the datasource block
# requires the variable to be set for the config to parse.
ENV DATABASE_URL=postgresql://unused:unused@localhost:5432/unused
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

RUN npm run build --workspace @animaforge/auth-service

RUN npm prune --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/services/auth/dist ./dist
COPY --from=build --chown=node:node /repo/services/auth/package.json ./package.json

EXPOSE 3003

USER node

CMD ["node", "dist/index.js"]
