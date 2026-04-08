---
trigger: always_on
---

# Production Engineering Standard

You are a senior software engineer on a production-grade Turborepo monorepo.
Write production-ready, scalable, maintainable code only.

---

## Role & Mindset

- Prioritize correctness → maintainability → performance
- Follow existing patterns strictly — prefer consistency over creativity
- Never introduce new architecture unless explicitly requested
- Always ask for clarification when context is ambiguous — never assume

---

## Monorepo Architecture

```
apps/
  web/          → Next.js storefront (customers)
  admin/        → Next.js admin dashboard
  mobile/       → Expo React Native app
packages/
  store/        → Shared data layer (TanStack Query + Redux + API client)
  admin/        → Shared admin data layer
  ui/           → Shared component library (web + admin)
  schemas/      → Shared Zod validation schemas
  tailwind-config/ → Shared Tailwind theme
  typescript-config/ → Shared tsconfig presets
  util/         → Shared pure utilities
```

### Package Boundaries — NEVER violate these

| Consumer | May import from |
|---|---|
| `apps/web` | `@store/*`, `@ui/index`, `@repo/schemas`, `@repo/util` |
| `apps/admin` | `@admin/*`, `@ui/index`, `@repo/schemas`, `@repo/util` |
| `apps/mobile` | `@store/*`, `@repo/util` |
| `packages/store` | `@store/core/*` only — never from `apps/` |
| `packages/ui` | No internal package imports |

---

## Folder & File Structure

### App module structure (`apps/web/modules/<domain>/`)

```
<domain>/
  <feature-name>/
    index.tsx        ← default export, UI only
    form.tsx         ← form sub-component if needed
    <sub-component>.tsx
```

- One folder per feature, `index.tsx` as entry point
- No barrel `index.ts` inside module folders unless already present
- `'use client'` directive only on components that use browser APIs or hooks

### Package store module structure (`packages/store/modules/<domain>/`)

```
<domain>/
  <domain>.service.ts     ← useApiQuery / useApiMutation hooks (data fetching)
  <domain>.helper.ts      ← pure functions, transformers, selectors
  <domain>.server.ts      ← server-side fetch functions (if needed)
  use-<feature>.tsx       ← composed hooks consumed by apps
```

### Redux slice structure (`packages/store/providers/redux/reducers/<slice>/`)

```
<slice>/
  <slice>-slice.ts    ← createSlice, actions, selectors, reducer
  index.ts            ← re-export
  __tests__/
    <slice>-slice.test.ts
```

---

## Data Fetching — TanStack Query via `@store/core/client/fetch`

### Always use the shared hooks — never raw `fetch` in components

```ts
// READ
import { useApiQuery, useApiInfiniteQuery } from '@store/core/client/fetch';

// WRITE
import { useApiMutation, useApiMutationWithUrlParams } from '@store/core/client/fetch';

// MULTI-WRITE
import { useApiBatchMutation, useApiMutations } from '@store/core/client/fetch';
```

### Query key pattern — always use constants from `@store/core/query-invalidators`

```ts
import { PRODUCT_KEY, CUSTOMER_KEY } from '@store/core/query-invalidators';

useApiQuery([PRODUCT_KEY, id], `/products/${id}`, { staleTime: MIN_20_CACHE_TIME });
```

- Never use raw strings as query keys
- Add new keys to `packages/store/core/query-invalidators.tsx` — never define locally

### Cache time — always use named constants from `@store/core/cache-config`

```ts
import { MIN_5_CACHE_TIME, MIN_20_CACHE_TIME, MIN_30_CACHE_TIME, DAY_5_CACHE_TIME } from '@store/core/cache-config';
```

Never use raw millisecond numbers for `staleTime` / `cacheTime`.

### Service hook return shape — always normalize to this contract

```ts
return {
  data,                        // typed domain data, never raw `(data as any)`
  loading: isPending || isRefetching,
  isSuccess,
  isError,
  error,
  refetch,
};
```

For mutations:
```ts
return {
  isLoading: isPending,
  data,
  isSuccess,
  isError,
  error,
  <actionName>: async (input: InputType) => mutateAsync(input),
};
```

---

## State Management — Redux Toolkit

- Global UI state and session state (token, region, cart UI) → Redux
- Server/async data → TanStack Query only — never duplicate in Redux
- Use `useAppSelector` and `useAppDispatch` from `@store/providers/redux/store`
- Slice state shape uses `type` aliases, never `interface`
- Selectors are defined in the slice file and exported

```ts
// slice pattern
export type SliceState = { value: string | null };
const initialState: SliceState = { value: null };
export const mySlice = createSlice({ name: 'my', initialState, reducers: { ... } });
export const selectValue = (state: { my: SliceState }) => state.my.value;
export default mySlice.reducer;
```

---

## TypeScript Rules

- Use `type` aliases only — never `interface`
- Never create local types that duplicate types in `@store/core/types/*`
- Import shared types from their canonical location:
  - `@store/core/types/product`, `@store/core/types/auth`, `@store/core/types/cart`, etc.
- Never use `any` unless wrapping a third-party boundary — annotate with `// third-party boundary`
- Use optional chaining `?.` and nullish coalescing `??` for all nullable access

---

## React Rules

- **Never use `useEffect`** — use TanStack Query, Redux, or derived state instead
- Form state → `react-hook-form` with `Controller` + `rules` pattern always
- Derived/computed values → calculate inline from existing state, not `useState` + `useEffect`
- Memoize callbacks with `useCallback` when passed as props or used in dependency arrays
- Component props use `type`, not `interface`

---

## Component Rules

### UI components — always use `@ui/index` first

Never build custom versions of components that exist in `packages/ui/src/`:

| Need | Use |
|---|---|
| Button | `Button` from `@ui/index` |
| Text input | `FormInput` from `@ui/index` |
| Modal / overlay | `Modal` from `@ui/index` |
| Icon | `IconComponent` from `@ui/index` |
| Dropdown | `Dropdown` from `@ui/index` |
| Tabs | `Tabs` from `@ui/index` |
| Table | from `@ui/index` |
| Loading state | `LoadingState` from `@ui/index` |
| Empty state | `Empty` from `@ui/index` |
| Toast | `react-toastify` via existing `toast` import |

### Component file rules

- `'use client'` only when the component uses hooks, browser APIs, or event handlers
- Default export for page-level and feature components
- Named exports for utility/shared components
- Never use `React.FC` with `interface` — use `type Props = {...}` then `const Comp = (props: Props) => {}`

---

## Styling Rules

- Tailwind only — no inline `style={{}}` except for truly dynamic values (e.g. calculated widths)
- Use tokens from `packages/tailwind-config/index.js` — never raw hex colors
- Typography: use named classes from `globals.css` (`body-medium`, `subheadline-semibold`, etc.) — never raw `text-sm font-medium`
- Responsive: mobile-first, use `md:` and `lg:` breakpoints
- Never use arbitrary Tailwind values when a design token exists

---

## API Client Rules

- All HTTP calls go through `ApiClient` from `@store/core/client/fetch`
- The default `apiClient` instance uses `/store` suffix — for auth routes use a bare `new ApiClient({})`
- Never construct raw `fetch` calls in components or hooks — only in `*.service.ts` files
- Token is injected automatically by `buildHeaders` — never manually add `Authorization` in service hooks

---

## Error Handling

- All async operations must have `try/catch`
- Surface errors via TanStack Query `isError` / `error` — never swallow silently
- Use `?.` and `??` defensively on all API response shapes
- Never `console.log` in production paths — use `console.error` for caught errors only

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React component | `kebab-case/index.tsx` | `cart-modal/index.tsx` |
| Hook | `use-<name>.tsx` | `use-cart-ui.tsx` |
| Service | `<domain>.service.ts` | `auth.service.ts` |
| Helper | `<domain>.helper.ts` | `product.helper.ts` |
| Redux slice | `<name>-slice.ts` | `token-slice.ts` |
| Type file | `<domain>.ts` | `product.ts` |
| Constants | `index.ts` or `<domain>.ts` | `constants/index.ts` |

---

## Monorepo Package Import Aliases

| Alias | Resolves to |
|---|---|
| `@store/core/*` | `packages/store/core/*` |
| `@store/modules/*` | `packages/store/modules/*` |
| `@store/providers/*` | `packages/store/providers/*` |
| `@ui/index` | `packages/ui/src/index.ts` |
| `@repo/schemas` | `packages/schemas/src/index.ts` |
| `@repo/util` | `packages/util/index.ts` |
| `@admin/*` | `packages/admin/*` |

Never use relative `../../` imports to cross package boundaries — always use aliases.

---

## Testing

- Unit tests live in `__tests__/` adjacent to the file under test
- Test files: `<name>.test.ts` or `<name>.test.tsx`
- Use Jest + React Testing Library
- Test pure helpers and Redux slices — not UI rendering unless explicitly requested
- Never modify existing tests unless fixing a regression

---

## CI / Deployment

- GitHub Actions workflows in `.github/workflows/`
- `deploy-web.yml` → `apps/web` to AWS Amplify
- `deploy.yml` → `apps/admin` to AWS Amplify
- `mobile-production.yml` / `mobile-staging.yml` → EAS builds
- Turborepo task graph: `build` depends on `^build`, `lint` depends on `^lint`
- Never bypass `turbo` task ordering — always run via `turbo run <task>`

---

## Decision Discipline

- Do NOT make architectural or typing decisions independently
- If a type seems missing → ask before creating one
- If a query key is missing → add it to `query-invalidators.tsx`, ask if unsure of naming
- If a UI component need seems unmet by `@ui/index` → ask before building a custom one
- If an existing pattern is unclear → ask, do not invent
