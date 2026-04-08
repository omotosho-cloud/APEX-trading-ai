---
trigger: always_on
---
# Universal Engineering Standard
# ─────────────────────────────────────────────────────────────
# PORTABLE TEMPLATE — copy this to .amazonq/rules/ in any new
# project. Add trigger: always_on frontmatter when you do.
# Do NOT add trigger: always_on here — this project uses
# production-engineering-standard.md instead.
# ─────────────────────────────────────────────────────────────

## Role & Mindset

- Prioritize correctness → maintainability → performance
- Follow existing patterns strictly — prefer consistency over creativity
- Never introduce new architecture unless explicitly requested
- Always ask for clarification when context is ambiguous — never assume

---

## TypeScript

- Use `type` aliases only — never `interface`
- Never use `any` unless wrapping a third-party boundary — annotate with `// third-party boundary`
- Never create local duplicate types — always reuse from the shared types location
- Use `?.` and `??` for all nullable access — never assume a value exists

---

## React

- **Never use `useEffect`** — use server data-fetching, derived state, or library patterns instead
- Form state → `react-hook-form` with `Controller` + `rules` pattern always
- Derived/computed values → calculate inline from existing state
- Memoize callbacks with `useCallback` when passed as props or used in dependency arrays
- Component props use `type`, not `interface`
- Never use `React.FC` — use `const Comp = (props: Props) => {}`

---

## Data Fetching

- All server state → TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`)
- Never use raw `fetch` directly in components — always go through a shared hook or service layer
- Never duplicate server state in Redux/Zustand — server state lives in TanStack Query cache only
- Query keys must be constants — never raw inline strings
- Cache times must be named constants — never raw millisecond numbers
- Always normalize hook return shape:

```ts
// Query hook
return { data, loading: isPending || isRefetching, isSuccess, isError, error, refetch };

// Mutation hook
return { isLoading: isPending, data, isSuccess, isError, error, <actionName>: async (input) => mutateAsync(input) };
```

---

## State Management

- Global UI state / session state → Redux Toolkit or Zustand
- Server/async data → TanStack Query only — never duplicate in global store
- Slice state shape uses `type` aliases, never `interface`
- Selectors defined in the slice file and exported — never inline in components

---

## Component Rules

- Use the project's shared UI component library first — never rebuild what already exists
- `'use client'` only when the component uses hooks, browser APIs, or event handlers
- Default export for page-level and feature components
- Named exports for utility/shared components
- Never build a custom modal, button, or input if one exists in the shared library

---

## Styling

- Tailwind CSS only — no inline `style={{}}` except for truly dynamic values
- Use design tokens — never raw hex colors
- Use named typography classes — never raw `text-sm font-medium`
- Mobile-first responsive — use `md:` and `lg:` breakpoints
- Never use arbitrary Tailwind values when a design token exists

---

## File & Folder Conventions

| Type | Convention | Example |
|---|---|---|
| React component | `kebab-case/index.tsx` | `cart-modal/index.tsx` |
| Hook | `use-<name>.tsx` | `use-cart-ui.tsx` |
| Service | `<domain>.service.ts` | `auth.service.ts` |
| Helper | `<domain>.helper.ts` | `product.helper.ts` |
| Redux slice | `<name>-slice.ts` | `token-slice.ts` |
| Type file | `<domain>.ts` | `product.ts` |
| Test | `<name>.test.ts(x)` in `__tests__/` | `auth.service.test.ts` |

- One folder per feature, `index.tsx` as entry point
- No barrel `index.ts` inside module folders unless already present
- Never use relative `../../` imports to cross package boundaries — always use path aliases

---

## Error Handling

- All async operations must have `try/catch`
- Surface errors via TanStack Query `isError` / `error` — never swallow silently
- Never `console.log` in production paths — use `console.error` for caught errors only

---

## Testing

- Unit tests in `__tests__/` adjacent to the file under test
- Test pure helpers and Redux slices — not UI rendering unless explicitly requested
- Never modify existing tests unless fixing a regression

---

## Decision Discipline

- Do NOT make architectural or typing decisions independently
- If a type seems missing → ask before creating one
- If a shared component need seems unmet → ask before building a custom one
- If an existing pattern is unclear → ask, do not invent
