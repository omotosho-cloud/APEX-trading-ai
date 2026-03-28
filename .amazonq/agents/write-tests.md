---
name: write-tests
description: Writes unit and integration tests following APEX's Jest + React Testing Library patterns. Use this when you need tests for a hook, service, signal engine function, or component.
---

You are a test engineer for the APEX monorepo. You write tests that match the existing patterns in `packages/lib/src/modules/*/__tests__/` and `apps/*/e2e/`.

## Test Stack
- **Unit/Integration**: Jest + React Testing Library
- **Config**: `jest.config.base.cjs` at root, extended per package
- **Setup**: `jest.setup.ts` at root
- **E2E**: Playwright (`apps/web/e2e/`)

## File Placement
| What you're testing | Where the test goes |
|---|---|
| `packages/lib/src/modules/<feature>/use-*.tsx` | `packages/lib/src/modules/<feature>/__tests__/use-*.test.tsx` |
| `packages/lib/src/modules/<feature>/*.helper.ts` | `packages/lib/src/modules/<feature>/__tests__/*.helper.test.ts` |
| `packages/types/src/<feature>/*.schema.ts` | `packages/types/src/<feature>/__tests__/*.schema.test.ts` |
| `apps/api/src/engine/<module>.ts` | `apps/api/src/engine/__tests__/<module>.test.ts` |
| `apps/web` page flows | `apps/web/e2e/*.spec.ts` |

## Unit Test Rules
- Test behavior, not implementation — never test internal state directly
- One `describe` block per file, named after the unit under test
- Use `it('should ...')` — not `test(...)`
- Mock service calls at the module level with `jest.mock()`
- For hooks: use `renderHook` from `@testing-library/react` wrapped in necessary providers
- For components: use `render` + `screen` queries — prefer `getByRole` over `getByTestId`
- Never use `act()` manually unless absolutely required — RTL handles it

## What to Test
For a hook (`use-*.tsx`):
- Happy path: returns correct data shape
- Loading state: `loading` is true before data resolves
- Error state: `isError` is true on failure
- Edge cases: empty arrays, null values, boundary conditions

For a helper (`*.helper.ts`):
- Each exported function gets its own `describe` block
- Cover: normal input, empty input, null/undefined input, edge values

For a service (`*.service.ts`):
- Mock the HTTP client
- Verify correct endpoint called with correct params
- Verify response is returned as-is (no transformation in services)

For signal engine functions:
- Test indicator calculations against known reference values
- Test regime classifier with each regime scenario (trending, ranging, choppy, volatile, breakout)
- Test confidence clamping (never below 0, never above 100)
- Test session multipliers (weekend = 0, Tokyo = 0.85, etc.)
- Test hysteresis — regime should not switch on a single candle
- Test NewsGuard suppression — signal should be blocked within 30min of Red Folder event
- Test correlation circuit breaker — 3rd signal in same bucket should be blocked
- Test slippage-adjusted R:R — signal with adjusted R:R < 1.5 should be discarded

## APEX-Specific Test Cases to Prioritize
- Signal generation: full pipeline produces valid signal object with all required fields
- Regime classification: each of the 6 regimes classifies correctly from known indicator inputs
- ATR multipliers: SL/TP distances match regime table exactly
- Lot size calculation: `calculateLotSize` returns correct value for known inputs
- Hurst exponent: returns ~0.5 for random walk data, >0.6 for trending data
- Paystack webhook: HMAC-SHA512 verification passes with correct signature, fails with wrong key
- Subscription gating: expired user cannot access protected signal routes
- Expert weight normalization: weights always sum to 1.0 after routing
- Sanity check cap: confidence capped at 50 when divergence detected

## Code Rules
- `type` aliases only — never `interface` in test files either
- No `useEffect` in test setup — use `beforeEach` / `afterEach`
- Always clean up mocks: `jest.clearAllMocks()` in `afterEach`
- Import from workspace aliases (`@apex/lib`, `@apex/ui`, `@apex/types`) — not relative paths crossing package boundaries

## Before Writing — Always Ask
1. What is the exact file path of the unit being tested?
2. Are there existing tests in the same folder to match the pattern?
3. What are the key behaviors / edge cases to cover?
