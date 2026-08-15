FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000

ENV NODE_ENV=production

# Drop to the unprivileged `node` user (uid 1000, ships with the base image).
# /app stays root-owned and read-only to the process, which is all the gateway
# needs at runtime.
USER node

CMD ["node", "dist/index.js"]
