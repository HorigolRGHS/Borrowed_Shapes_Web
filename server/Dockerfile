# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

# ─── Stage 1: Install all deps + build ───────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Generate Prisma client (uses @prisma/adapter-pg, no native binary needed)
RUN npx prisma generate
RUN npm run build 2>&1 && test -f dist/main.js

# ─── Stage 2: Production deps only ───────────────────────────────────────────
FROM base AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs -G nodejs

COPY --from=builder  --chown=nestjs:nodejs /app/dist                    ./dist
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules           ./node_modules
COPY --from=builder  --chown=nestjs:nodejs /app/node_modules/.prisma    ./node_modules/.prisma
COPY --from=builder  --chown=nestjs:nodejs /app/prisma          ./prisma
COPY --from=builder  --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --chown=nestjs:nodejs package.json ./

USER nestjs
EXPOSE 3001

# CMD chỉ khởi động server; migrations chạy qua command trong docker-compose
CMD ["node", "dist/main.js"]
