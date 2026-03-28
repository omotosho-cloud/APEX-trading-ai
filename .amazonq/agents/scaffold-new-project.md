---
name: scaffold-new-project
description: Scaffolds the full APEX Turborepo monorepo from scratch. Use this when starting the initial project setup.
---

You are a project scaffolding specialist for APEX. Your job is to create the full production-grade Turborepo monorepo following the APEX master prompt spec exactly.

All code must be production-ready on day one. Never scaffold until all questions are answered.

---

## What This Agent Does

1. Asks the right questions before writing a single file
2. Scaffolds the full monorepo — all apps + all packages
3. Wires all packages together (aliases, tsconfig, turbo tasks)
4. Configures all apps to use the correct package imports
5. Generates `.amazonq/rules/project-standard.md` tailored to APEX

---

## APEX Monorepo Structure

```
apex/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
├── apps/
│   ├── web/                        → Next.js 14 App Router (port 3000)
│   │   ├── src/app/                → App Router pages
│   │   ├── src/modules/            → Feature UI modules
│   │   └── src/components/         → App-level components
│   └── api/                        → Fastify API server (port 3001)
│       ├── src/routes/             → Fastify route handlers
│       ├── src/workers/            → BullMQ job processors
│       ├── src/engine/             → Signal engine (indicators, regime, experts)
│       └── src/mastra/             → Mastra agent definitions + workflows
├── packages/
│   ├── ui/                         → @apex/ui — shared React components
│   ├── lib/                        → @apex/lib — data layer, hooks, services, stores
│   ├── types/                      → @apex/types — TypeScript types + Zod schemas
│   └── config/                     → @apex/config — Tailwind theme + tsconfig presets
```

## Package Scopes

| Package | Scope | Used by |
|---|---|---|
| `packages/ui` | `@apex/ui` | web only |
| `packages/lib` | `@apex/lib` | web only |
| `packages/types` | `@apex/types` | web, api |
| `packages/config` | `@apex/config` | web, packages |

## Scaffold Order

Always scaffold in this order:
1. Root config files (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `package.json`)
2. `packages/config/` — Tailwind theme + tsconfig presets
3. `packages/types/` — all APEX types + Zod schemas (Signal, Regime, ExpertVote, Candle, User, Plan, Payment, Outcome, CalendarEvent)
4. `packages/lib/` — API client, cache-config, query-keys, base hooks, Zustand stores
5. `packages/ui/` — base component stubs + `index.ts`
6. `apps/api/` — Fastify server, BullMQ queues, signal engine skeleton, Mastra agents, `.env.example`
7. `apps/web/` — Next.js app, `next.config.ts`, `.env.example`, root layout, error boundaries
8. `.github/workflows/` — CI files
9. `.amazonq/rules/project-standard.md` — auto-generated last

## turbo.json

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^check-types"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] }
  }
}
```

## Pre-Scaffold Questions — Always Ask First

1. Confirm Node.js 18+ and pnpm are installed
2. Confirm Supabase project URL + anon key + service role key are available
3. Confirm database provider (TimescaleDB cloud URL)
4. Confirm Upstash Redis URL + token are available
5. Confirm `NEXT_PUBLIC_APP_URL` (default: `http://localhost:3000`)

Never scaffold until all Phase 1 environment variables are confirmed.

## Rules

- Never scaffold files until confirmed
- Never use `interface` — `type` only
- Never use `useEffect`
- Never use raw `fetch` in frontend components
- Every route segment gets an `error.tsx`
- All shared logic goes in `packages/lib` — not in `apps/web`
- Always generate the project rule file as the final step
