# Node 22 is the current LTS. Node 20 stopped receiving security fixes in
# April 2026.
FROM node:22-alpine AS base

# Prisma's engines link against OpenSSL and detect its version by running the
# openssl binary. Alpine ships neither by default, so without this the query
# engine fails to load when the API starts.
RUN apk add --no-cache openssl

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

# Install scripts are left on: Prisma downloads its engines and sharp fetches
# its prebuilt binary for this platform during install.
COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Keep only runtime packages. The generated client in node_modules/.prisma and
# the Prisma CLI, which now lives in dependencies for migrations, both survive.
RUN npm prune --omit=dev

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production

# wget is used by the compose healthcheck.
RUN apk add --no-cache wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app

# Drop root, so a code-execution bug does not start with full privileges.
USER node

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
