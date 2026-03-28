---
trigger: always_on
---

# Universal Engineering Standard — APEX

## Role & Mindset

- Prioritize correctness → maintainability → performance
- Follow existing patterns strictly — prefer consistency over creativity
- Never introduce new architecture unless explicitly requested
- Always ask for clarification when context is ambiguous — never assume
- Every signal calculation must be mathematically correct — this is financial software

---

## TypeScript

- Use `type` aliases only — never `interface`
- Never use `any` unless wrapping a third-party boundary — annotate with `// third-party boundary`
- Never create local duplicate types — always reuse from `@apex/types`
- Use `?.` and `??` for all nullable access — never assume a value exists

---

## React

- **Never use `useEffect`** — use TanStack Query, Zustand, or derived state instead
- Form state → `react-hook-form` with `Controller` + `rules` pattern always
- Derived/computed values → calculate inline from existing state
- Memoize callbacks with `useCallback` when passed as props or used in dependency arrays
- Component props use `type`, not `interface`
- Never use `React.FC` — use `const Comp = (props: Props) => {}`

---

## Data Fetching

- All server state → TanStack Query
- Never use raw `fetch` directly in components — always through `@apex/lib` service layer
- Never duplicate server state in Zustand — server state lives in TanStack Query cache only
- Query keys must be constants from `@apex/lib/query-keys` — never raw inline strings
- Cache times must be named constants from `@apex/lib/cache-config` — never raw milliseconds
- Always normalize hook return shape:

```ts
// Query hook
return { data, loading: isPending || isRefetching, isSuccess, isError, error, refetch };

// Mutation hook
return { isLoading: isPending, data, isSuccess, isError, error, <actionName>: async (input) => mutateAsync(input) };
```

---

## State Management

- Global UI state / session state → Zustand (stores in `packages/lib/src/stores/`)
- Server/async data → TanStack Query only — never duplicate in Zustand
- Store state shape uses `type` aliases, never `interface`
- Selectors defined as named exports from the store file — never inline in components

---

## Error Boundaries

- Route level: `error.tsx` in every Next.js App Router segment
- Section level: `<SectionErrorBoundary>` from `@apex/ui` around every async data section
- Never let a section error crash the full page

---

## Component Rules

- Use `@apex/ui` first — never rebuild what already exists
- `'use client'` only when the component uses hooks, browser APIs, or event handlers
- Default export for page-level and feature components
- Named exports for utility/shared components

---

## Styling

- Tailwind CSS only — no inline `style={{}}` except for truly dynamic values
- Use design tokens from `@apex/config/tailwind` — never raw hex colors
- Dark-first design (trading terminal aesthetic) — every component uses `dark:` Tailwind classes
- Mobile-first responsive — use `md:` and `lg:` breakpoints

---

## Error Handling

- All async operations must have `try/catch`
- Surface errors via TanStack Query `isError` / `error` — never swallow silently
- Never `console.log` in production paths — use `console.error` for caught errors only

---

## Testing

- Unit tests in `__tests__/` adjacent to the file under test
- Test pure helpers and Zustand stores — not UI rendering unless explicitly requested
- Never modify existing tests unless fixing a regression

---

## Signal Engine Rules

- Never approximate indicator calculations — use exact mathematical formulas as specified in the master prompt
- Hurst exponent must use Rescaled Range (R/S) method with adaptive lookback
- ATR multipliers must match the regime table exactly — never hardcode arbitrary values
- Regime classification must follow the priority cascade exactly — no shortcuts
- All confidence scores must be clamped to 0–100 range
- Session multipliers must be applied before any signal is written to the database

---

## Decision Discipline

- Do NOT make architectural or typing decisions independently
- If a type seems missing → ask before creating one
- If a shared component need seems unmet → ask before building a custom one
- If an existing pattern is unclear → ask, do not invent
