# -------------------------------------------------------
# 1) Install ALL dependencies (including devDependencies)
# -------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install ALL deps including devDependencies
RUN pnpm install --frozen-lockfile

# -------------------------------------------------------
# 2) Build the Next.js app
# -------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

# -------------------------------------------------------
# 3) Final runtime image (keeps devDependencies too)
# -------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

# DO NOT set NODE_ENV=production since you want devDeps also
# ENV NODE_ENV=production  <-- removed on purpose

COPY --from=builder /app ./

EXPOSE 3000

CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]
