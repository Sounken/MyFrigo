# syntax=docker/dockerfile:1

# Debian rather than Alpine: better-sqlite3 ships prebuilt binaries for glibc,
# so the image builds in seconds instead of compiling against musl.
# The current Edge.js parser used by Adonis requires Node 24. Keeping the
# builder and runtime on the same major also avoids native ABI surprises with
# better-sqlite3.
FROM node:24-slim AS base
ENV NODE_ENV=production

# ---------------------------------------------------------------------------
# Build: compile TypeScript, bundle the frontend, then install runtime deps
# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /app

# node-gyp fallback, in case no prebuilt binary matches this platform
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN node ace build

# Runtime dependencies only, installed inside the build output so the native
# modules are compiled against the very image that will run them.
WORKDIR /app/build
RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM base AS runtime
WORKDIR /app

ENV PORT=3333 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    TZ=Europe/Paris \
    DB_PATH=/app/storage/db.sqlite3

COPY --from=build --chown=node:node /app/build ./

# The SQLite file lives here, on the Coolify persistent volume. Without the
# mount every redeploy would start from an empty fridge.
RUN mkdir -p /app/storage && chown -R node:node /app/storage
VOLUME ["/app/storage"]

USER node
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run on every boot: they are idempotent, and it keeps a schema
# change from needing a separate manual step after each deploy.
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
