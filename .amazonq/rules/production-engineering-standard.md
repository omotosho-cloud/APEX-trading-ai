---
trigger: always_on
---

# APEX — Production Engineering Standard

You are a senior software engineer on the APEX production-grade Turborepo monorepo.
Write production-ready, scalable, maintainable code only.

---

## Role & Mindset

- Prioritize correctness → maintainability → performance
- Follow existing patterns strictly — prefer consistency over creativity
- Never introduce new architecture unless explicitly requested
- Always ask for clarification when context is ambiguous — never assume
- Every signal calculation must be mathematically correct — this is financial software

---

## Monorepo Architecture

```
apex/
├── apps/
│   ├── web/          → Next.js 14 App Router dashboard + marketing (port 3000)
│   └── api/          → Fastify API server + BullMQ workers (port 3001)
├── packages/
│   ├── ui/           → @apex/ui      — shared React components (web only)
│   ├── lib/          → @apex/lib     — shared data layer (TanStack Query + API client + helpers)
│   ├── types/        → @apex/types   — shared TypeScript types + Zod schemas
│   └── config/       → @apex/config  — shared Tailwind theme + tsconfig presets
```

### Package Scopes — ALWAYS use these exact import paths

| Package | Scope | Contents |
|---|---|---|
| `packages/ui` | `@apex/ui` | All shared React components |
| `packages/lib` | `@apex/lib` | supabaseClient, apiClient, TanStack Query hooks, services, helpers, cache-config, query-keys, Zustand stores |
| `packages/types` | `@apex/types` | All TypeScript types, Zod schemas |
| `packages/config` | `@apex/config/tailwind` | Shared Tailwind theme |
| `packages/config` | `@apex/config/typescript` | Shared tsconfig presets |

### Package Boundaries — NEVER violate these

| Consumer | May import from |
|---|---|
| `apps/web` | `@apex/ui`, `@apex/lib`, `@apex/types` |
| `apps/api` | `@apex/types` only |
| `packages/lib` | `@apex/types` only |
| `packages/ui` | `@apex/types` only — no internal package imports |

---

## Folder & File Structure

### App module structure (`apps/web/src/modules/<domain>/`)

```
<domain>/
  <feature-name>/
    index.tsx        ← default export, UI only
    <sub-component>.tsx
```

### Package lib module structure (`packages/lib/src/modules/<domain>/`)

```
<domain>/
  <domain>.service.ts     ← useApiQuery / useApiMutation hooks (data fetching)
  <domain>.helper.ts      ← pure functions, transformers
  use-<feature>.tsx       ← composed hooks consumed by apps
  index.ts                ← barrel export
```

### File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React component | `kebab-case/index.tsx` | `signal-card/index.tsx` |
| Hook | `use-<name>.tsx` | `use-signals.tsx` |
| Service | `<domain>.service.ts` | `signal.service.ts` |
| Helper | `<domain>.helper.ts` | `signal.helper.ts` |
| Type file | `<domain>.ts` | `signal.ts` |
| Zod schema | `<domain>.schema.ts` | `signal.schema.ts` |
| Zustand store | `<name>-store.ts` | `signal-store.ts` |
| Test | `<name>.test.ts(x)` in `__tests__/` | `signal.service.test.ts` |

---

## Data Fetching — TanStack Query via `@apex/lib`

### Always use shared hooks — never raw `fetch` in components

```ts
import { useApiQuery, useApiMutation } from '@apex/lib/client';
```

### Query key pattern — always use constants from `@apex/lib/query-keys`

```ts
import { SIGNAL_KEY, USER_KEY } from '@apex/lib/query-keys';
useApiQuery([SIGNAL_KEY, instrument], `/signals/${instrument}`, { staleTime: MIN_5_CACHE_TIME });
```

- Never use raw strings as query keys
- Add new keys to `packages/lib/src/core/query-keys.ts` — never define locally

### Cache time — always use named constants from `@apex/lib/cache-config`

```ts
import { MIN_1_CACHE_TIME, MIN_5_CACHE_TIME, MIN_20_CACHE_TIME } from '@apex/lib/cache-config';
```

Never use raw millisecond numbers for `staleTime` / `cacheTime`.

### Service hook return shape — always normalize to this contract

```ts
// Query hook
return { data, loading: isPending || isRefetching, isSuccess, isError, error, refetch };

// Mutation hook
return { isLoading: isPending, data, isSuccess, isError, error, <actionName>: async (input) => mutateAsync(input) };
```

---

## State Management — Zustand

- Global UI state and session state (auth, watchlist UI, active pair) → Zustand
- Server/async data → TanStack Query only — never duplicate in Zustand
- Store files live in `packages/lib/src/stores/`
- Store state shape uses `type` aliases, never `interface`
- Selectors defined as named exports from the store file — never inlined in components

---

## TypeScript Rules

- Use `type` aliases only — **never `interface`**
- Never create local types that duplicate types in `@apex/types`
- Never use `any` unless wrapping a third-party boundary — annotate with `// third-party boundary`
- Use `?.` and `??` for all nullable access — never assume a value exists

---

## React Rules

- **Never use `useEffect`** — use TanStack Query, Zustand, or derived state instead
- Form state → `react-hook-form` with `Controller` + `rules` pattern always
- Derived/computed values → calculate inline from existing state
- Memoize callbacks with `useCallback` when passed as props or used in dependency arrays
- Component props use `type`, not `interface`
- Never use `React.FC` — use `const Comp = (props: Props) => {}`

---

## Error Boundary Rules

- Every route segment must be wrapped with an `ErrorBoundary` via `error.tsx` (Next.js App Router)
- Every async data section (signal list, chart, expert votes) must have a local `<SectionErrorBoundary>` from `@apex/ui`
- Payment flow: wrap entire checkout in `<CheckoutErrorBoundary>` — on error show exact Paystack `gateway_response`
- Never let an error in one section crash the whole page

---

## Component Rules

### UI components — always use `@apex/ui` first

Never build custom versions of components that exist in `packages/ui/src/`:

| Need | Use |
|---|---|
| Button | `Button` from `@apex/ui` |
| Text input | `FormInput` from `@apex/ui` |
| Modal / overlay | `Modal` from `@apex/ui` |
| Icon | `Icon` from `@apex/ui` |
| Empty state | `EmptyState` from `@apex/ui` |
| Loading skeleton | `Skeleton` from `@apex/ui` |
| Error boundary | `SectionErrorBoundary` from `@apex/ui` |
| Confidence bar | `ConfidenceBar` from `@apex/ui` |
| Signal card | `SignalCard` from `@apex/ui` |
| Toast | `react-hot-toast` via existing `toast` import |

---

## Styling Rules

- Tailwind only — no inline `style={{}}` except for truly dynamic values
- Use design tokens from `@apex/config/tailwind` — never raw hex colors
- Dark mode: every component uses `dark:` classes — dark-first design (trading terminal aesthetic)
- Mobile-first responsive — use `md:` and `lg:` breakpoints
- Currency: always `toLocaleString('en-NG')` formatted as ₦X,XXX
- Dates: always formatted as `12 Jan 2025`
- Prices: always display with instrument-appropriate decimal places

---

## Security Rules

- Never hardcode secrets — always from `process.env`
- Always verify Paystack webhook HMAC-SHA512 before any DB write
- Validate all API inputs with Zod schemas from `@apex/types`
- RLS must be enabled on every Supabase table
- Rate limit all public endpoints — 100 req/min per IP via Fastify rate-limit
- CRON endpoints protected by `CRON_SECRET` header verification

---

## Error Handling

- All async operations must have `try/catch`
- Surface errors via TanStack Query `isError` / `error` — never swallow silently
- Never `console.log` in production paths — use `console.error` for caught errors only

---

## Monorepo Import Aliases

| Alias | Resolves to |
|---|---|
| `@apex/ui` | `packages/ui/src/index.ts` |
| `@apex/lib` | `packages/lib/src/index.ts` |
| `@apex/types` | `packages/types/src/index.ts` |
| `@apex/config/tailwind` | `packages/config/tailwind/index.js` |

Never use relative `../../` imports to cross package boundaries — always use aliases.

---

## Decision Discipline

- Do NOT make architectural or typing decisions independently
- If a type seems missing → ask before creating one
- If a UI component need seems unmet → ask before building a custom one
- If an existing pattern is unclear → ask, do not invent
