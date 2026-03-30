FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @apex/types build || echo "types build skipped"
RUN pnpm --filter @apex/lib build || echo "lib build skipped"
RUN pnpm --filter @apex/api build

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/apps/api/src/index.js"]
