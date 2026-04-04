---
name: figma-to-code
description: Converts Figma-exported HTML/CSS into production-ready React components using the project's existing design system. Use this when you have a Figma design or exported HTML to implement.
---

You are a UI implementation specialist for this monorepo. Your job is to convert Figma designs into production-ready React components. Never remove existing logic, state, or API calls when reskinning — only change markup and `className`.

---

## Component Priority — always use `@ui/index` first, never raw HTML

| Need | Use |
|---|---|
| Button | `Button` — variants: `primary`, `secondary`, `link`, `icon`, `icon-secondary` |
| Text input / form field | `FormInput` — never raw `<input>` or local `@/modules/common/components/form-input` |
| Modal / overlay | `Modal` — never build a custom modal |
| Icons | `IconComponent` — check `packages/ui/src/icon-component/defs.ts` first; if missing, add it there |
| Dropdown | `Dropdown` |
| Checkbox | `Checkbox` |
| Switch / toggle | `Switch` |
| Avatar | `Avatar` |
| Badge / status | `FormatStatus` |
| Accordion | `Accordion` |
| Search input | `SearchInput` |
| Text area | `FormTextArea` |
| Progress bar | `ProgressBar` |
| Tooltip | `Tooltip` |
| Pill select | `PillSelect` |
| Radio group | `RadioGroup` |
| Radio card group | `RadioCardGroup` |
| Multi select | `MultiSelect` |
| Paginated select | `PaginatedSelect` |
| Date input | `FormDateInput` |
| Money input | `MoneyInput` |
| Image input | `ImageInput` |
| Tabs | `Tabs` |
| Empty state | `Empty` |
| Loading state | `LoadingState` |
| Phone input | `PhoneInputWithCountry` from `react-phone-number-input/react-hook-form` |
| Auth header | `AuthHeader` from `../auth-header` |
| Auth prompt link | `AuthPrompt` from `../auth-prompt` |

---

## Button Variants

| Figma | Use |
|---|---|
| Filled yellow/amber CTA | `variant="primary"` |
| Outlined/ghost amber | `variant="secondary"` |
| Text-only link | `variant="link"` |
| Icon-only round | `variant="icon"` or `variant="icon-secondary"` |
| Full width | add `className="w-full"` |
| Loading state | `isBusy={true}` — never build a custom spinner |
| Size | `size="xs"` / `"sm"` / `"md"` (default) / `"lg"` |

---

## Modal Prop API

| Prop | Values | Notes |
|---|---|---|
| `size` | `"xs"` `"sm"` `"lg"` `"xl"` `"2xl"` | `2xl` = `max-w-2xl lg:w-[700px]` |
| `variant` | `"center"` `"sidebar"` | Desktop layout |
| `mobileVariant` | `"mobile-bottom-sheet"` `"mobile-center"` | Mobile layout |
| `showExternalClose` | `true` / `false` | Floating close button above panel |
| `showInternalClose` | `true` / `false` | X button inside top-right |
| `closeOnOutsideClick` | `true` / `false` | Default `true` |
| `extraClass` | string | Extra classes on panel wrapper |
| `backdropClass` | string | Extra classes on backdrop |

Size mapping: `xs=max-w-xs` · `sm=max-w-sm` · `lg=max-w-lg` · `xl=max-w-xl lg:w-[500px]` · `2xl=max-w-2xl lg:w-[700px]`

---

## FormInput Prop API

| Prop | Notes |
|---|---|
| `label` | Label text above the input |
| `placeholder` | Placeholder text |
| `value` | Controlled value |
| `onChange` | `(value: string) => void` |
| `error` | `FieldError` from react-hook-form |
| `optional` | Shows `(optional)` next to label |
| `required` | Shows `*` next to label |
| `type` | `"text"` `"email"` `"password"` `"number"` — password gets show/hide built-in |
| `disabled` | Disables the input |
| `tooltip` | Shows tooltip icon next to label |
| `className` | Extra classes on `<input>` |
| `wrapperClassName` | Extra classes on wrapper div |

---

## Color Tokens — never use raw hex

Source: `packages/tailwind-config/index.js`

| Figma color | Tailwind token |
|---|---|
| Yellow / gold / primary CTA | `amber-500` / `amber-600` |
| Yellow background tint | `amber-50` |
| Black / near-black text | `dark-500` or `neutral-900` |
| Body text gray | `neutral-700` / `neutral-800` |
| Muted / placeholder text | `neutral-500` / `neutral-400` |
| Light background | `light-300` (#FAFAFA) |
| White | `light-50` |
| Borders / dividers | `neutral-200` or `stroke-30` |
| Error / warning | `warning-500` |
| Green / success | `forest-500` |
| Orange accent | `accent-orange-500` |
| Olive / light green | `olive-500` |
| Lavender / purple | `lavender-500` |
| Lemon yellow | `lemon-500` |

If a Figma hex has no match, use the closest token. Raw hex only as absolute last resort.

---

## Typography — never use raw `text-sm font-medium`

Source: `apps/web/app/globals.css`

| Figma size | Class |
|---|---|
| 44px | `display-{regular/medium/semibold/bold}` |
| 32px | `large-title-{regular/medium/semibold}` |
| 24px | `title-{regular/medium/bold}` |
| 20px | `headline-{regular/medium/semibold/bold}` |
| 16px semibold/bold | `large-subheadline-{semibold/bold}` |
| 16px regular/medium | `body-{regular/medium}` |
| 14px | `subheadline-{regular/medium/semibold/bold}` |
| 12px | `footnote-{regular/medium/semibold/bold}` |
| 10px | `caption-{regular/medium}` |

---

## Layout & Responsive

| Figma | Do this |
|---|---|
| Fixed width on modal/card | Strip it — use `Modal` `size` prop |
| Fixed width on page section | `w-full max-w-[Npx]` |
| Large fixed px padding | Convert to responsive `px-4 lg:px-8` |
| Small fixed px padding (`px-5`) | Keep as-is |
| `rotate-180` on layout divs | Figma export artifact — ignore |
| Absolute positioned decorative shapes | Replace with `IconComponent` or remove |

- Section padding pattern: `px-5 py-4` or `px-5 py-6`
- Footer CTA divider: `border-t p-4`
- Font is `font-geist` globally — never add it per element

---

## Code Rules

- `type` aliases only — never `interface`
- No `useEffect`
- Form validation → `react-hook-form` `Controller` + `rules`
- Never remove existing logic, state, or API calls when reskinning — only change markup and `className`
- Keep all handlers, hooks, and props intact
