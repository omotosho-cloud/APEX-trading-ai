FROM node:20-slim

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages (shared libs)
COPY packages/ ./packages/

# Copy API app
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first, then API
RUN pnpm --filter @apex/types build || true
RUN pnpm --filter @apex/lib build || true
RUN pnpm --filter @apex/api build

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]
