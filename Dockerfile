FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile

# Build @apex/types so dist/index.node.js exists at runtime
RUN pnpm --filter @apex/types build

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node_modules/.bin/tsx", "src/index.ts"]
