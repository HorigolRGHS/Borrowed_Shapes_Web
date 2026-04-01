# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN npm install -g pnpm

# ─── Stage 1: Install all deps + build ───────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build 2>&1 && test -f dist/main.js

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs -G nodejs

COPY --from=builder  --chown=nestjs:nodejs /app/dist                    ./dist
COPY --from=builder  --chown=nestjs:nodejs /app/node_modules            ./node_modules
COPY --from=builder  --chown=nestjs:nodejs /app/src/mikro-orm.config.ts ./dist/src/mikro-orm.config.js
COPY --from=builder  --chown=nestjs:nodejs /app/mikro-orm.config.ts     ./mikro-orm.config.js
COPY --chown=nestjs:nodejs package.json ./

# Allow nestjs user to run migration + database operations
RUN chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001

# CMD chỉ khởi động server; migrations chạy qua command trong docker-compose
CMD ["node", "dist/main.js"]
