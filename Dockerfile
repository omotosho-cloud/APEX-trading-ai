FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile

# Build packages in order
RUN pnpm --filter @apex/types build || echo "types build skipped"
RUN pnpm --filter @apex/lib build || echo "lib build skipped"

# Build API — fail hard if this fails
RUN pnpm --filter @apex/api build

# Verify dist was created
RUN test -f /app/apps/api/dist/index.js || (echo "ERROR: dist/index.js not found after build" && exit 1)

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]
