# Account Avatar — Implementation Plan

## Context

Implements `_specs/account-avatar.md`: a decorative avatar + codename in the `Navbar` for logged-in users, and a styled "Welcome, {codename}" heading on `/heists`.

Key discovery from exploration: an **`Avatar` component already exists** (`components/Avatar/Avatar.tsx`) — a gradient circle rendering initials from a `name` prop (`role="img"`, `aria-label={name}`), currently only wired up on the internal `/preview` component-gallery page, unused anywhere else. This is exactly the right building block for the navbar avatar — no icon needs to be picked, and no new component needs to be built from scratch, just extended slightly (a size variant) and wired into `Navbar`.

There's also an existing gradient-text technique already in production use: `.tagline` in `app/globals.css` (background-clip text gradient using `--color-primary` → `--color-secondary`), used on the splash page. The "fancy" welcome heading reuses this same visual technique, scoped to its own component since it's a single-use heading (matching how `CreateHeistForm`/`AuthForm` keep single-use styling in their own CSS modules, while only genuinely cross-component things like `.btn`/`.select`/`.spinner` live in `globals.css`).

## Files to add/change

### 1. `components/Avatar/Avatar.tsx` + `Avatar.module.css` (edit — add a size variant)

Add an optional `size?: "sm" | "md"` prop, defaulting to `"md"` (today's 48px behavior, unchanged for the `/preview` page). Add a `"sm"` variant (~32px, smaller text) for use in the navbar, where a full 48px circle would dominate the nav bar height. Implemented as a second class applied alongside the existing `.avatar` class in the CSS module (`.avatar.sm { @apply w-8 h-8 text-sm; }`), not a new component.

### 2. `components/Navbar/Navbar.tsx` + `Navbar.module.css` (edit)

Import `Avatar` from `@/components/Avatar`. Inside the existing `{!loading && user && (...)}` block (same gating already used for the logout button), add a new `<li>` before the logout button containing a non-interactive wrapper (`<div>`, not a link/button) with `<Avatar name={user.displayName} size="sm" />` and the codename text next to it. Only render this block when `user.displayName` is truthy (avoids ever rendering an avatar with an empty label).

`Navbar.module.css` gets two small additions: `.profile` (`inline-flex items-center gap-2`) for the wrapper, `.profileName` (`font-medium text-heading`) for the codename text.

### 3. `components/WelcomeBanner/` (new folder — `WelcomeBanner.tsx`, `WelcomeBanner.module.css`, `index.ts`)

A small client component (`"use client"`), following the same folder/barrel convention as every other component:

- Calls `useUser()`. Returns `null` while `loading` or when there's no `user`/`displayName` — avoids ever flashing "Welcome, null".
- Renders an `<h2>`-level heading: `Welcome, ` followed by the codename wrapped in its own `<span>` that carries the gradient-text treatment (same `linear-gradient(135deg, var(--color-primary), var(--color-secondary))` + `background-clip: text` technique as `.tagline`, scoped locally in `WelcomeBanner.module.css` rather than added to `globals.css`, since it's used in exactly one place).

### 4. `app/(dashboard)/heists/page.tsx` (edit)

Stays a server component. Import and render `<WelcomeBanner />` at the top of the existing `.page-content` wrapper, above the "Your Active Heists" section — no other changes to the existing static sections.

## Test plan

### `tests/components/Avatar.test.tsx` (edit — extend, don't restructure)
- Add a case asserting the `"sm"` size variant applies the smaller size class (or renders without error / keeps initials correct) — keep it light, existing 3 tests stay as-is since default behavior is unchanged.

### `tests/components/Navbar.test.tsx` (edit — extend existing suite)
- Add: when logged in, the avatar (`role="img"`, accessible name matching the codename) and the codename text are both rendered.
- Add: when logged out (existing `beforeEach` default `user: null`), no avatar/profile block is rendered.

### `tests/components/WelcomeBanner.test.tsx` (new)
Mock `@/lib/auth/auth-context`'s `useUser`, matching the mocking style already used in `Navbar.test.tsx`/`CreateHeistForm.test.tsx`.
- Renders "Welcome, {codename}" text when a user with a `displayName` is present.
- Renders nothing while `loading` is `true`.
- Renders nothing when there's no `user`.

## Verification

1. `npm run lint` and `npx tsc --noEmit` — must pass clean.
2. `npx vitest run` — new/updated suites plus full existing suite must pass.
3. Manual check with `npm run dev`: sign in, confirm the navbar shows the avatar + codename next to the logout button (no click/hover affordance), and `/heists` shows the styled "Welcome, {codename}" heading without any flash of broken text while auth is resolving.
