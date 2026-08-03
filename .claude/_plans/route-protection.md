# Plan: Route Protection for Public and Dashboard Groups

## Context

Right now `app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx` render their children unconditionally — nothing stops an authenticated user from sitting on `/login` or `/signup`, and nothing stops an unauthenticated user from directly loading `/heists/*`. The app already has a working global Firebase auth state via `useUser()` (`lib/auth/auth-context.tsx`, returns `{ user, loading }`), but no route group actually reads it. This plan wires that check into both group layouts so each group only renders for the auth state it's meant for, shows the existing spinner UI as a full-page loader while Firebase resolves the initial auth state, and — per the user's clarification while drafting `_specs/route-protection.md` — preserves the originally-requested destination via a `?redirect=` param when bouncing an unauthenticated user out of the dashboard, and always leaves the `/` splash page accessible regardless of auth state.

Spec reference: `_specs/route-protection.md`. Branch: `claude/feature/route-protection` (already checked out).

## Approach

Build one shared, reusable `AuthGuard` client component instead of duplicating the same loading/redirect branches in both layouts. Both call sites need identical mechanics — read `{ user, loading }`, read the current pathname, decide authorized/unauthorized, show a full-page loader instead of children while unresolved, fire exactly one `router.push` via `useEffect` (never during render), and support excluding a path from the authenticated-redirect rule. That's enough shared logic to justify one small, independently-testable component living at `components/AuthGuard/`, following the codebase's existing component-folder + barrel `index.ts` convention.

Before touching `next/navigation` APIs (`useRouter`, `usePathname`, `useSearchParams`), confirm current usage against Context7 docs for the installed Next.js version (`package.json` currently pins `^16.0.7`), per CLAUDE.md's documentation-check rule — in particular, `useSearchParams()` requires a `<Suspense>` boundary around the calling client component or `next build` fails ("Missing Suspense boundary with useSearchParams"), which only surfaces at build time, not in `npm run dev`.

### `AuthGuard` component

New `components/AuthGuard/AuthGuard.tsx` (+ `index.ts` barrel), a client component with this shape:

- Props: `children`, `when: "authenticated" | "unauthenticated"` (which state is allowed to view), `redirectTo: string` (where to send unauthorized visitors), `appendRedirectParam?: boolean` (whether to tack `?redirect=<currentPath>` onto `redirectTo`), `exemptPaths?: string[]` (paths that always render immediately, bypassing both the loading gate and the redirect check — this is how `/` stays accessible without any per-page opt-out).
- Reads `useUser()` for `{ user, loading }` and `usePathname()` for the current path.
- If the current path is in `exemptPaths`, render `children` immediately — no loader, no redirect check.
- Otherwise: while `loading` is `true`, or once resolved if the user doesn't match `when`, render the full-page loader (not children) and — only in the unauthorized-and-resolved case — fire `router.push(...)` inside a `useEffect` (encoding the current path with `encodeURIComponent` when `appendRedirectParam` is set).
- Once resolved and authorized, render `children`.

This means both the "still loading" and "known-unauthorized, redirect in flight" cases render the same loader, so there's never a frame where the wrong content or a blank screen shows.

### Full-page loader

New `components/PageLoader/PageLoader.tsx` (+ `.module.css` + `index.ts`), reusing the existing `.spinner` CSS class already defined in `app/globals.css` (currently only used as a small inline `<span className="spinner" aria-hidden />` inside disabled buttons in `Navbar` and `AuthForm`). `PageLoader` wraps that same spinner span in a new full-viewport container (`role="status" aria-label="Loading"`, matching `Skeleton`'s existing accessibility pattern), styled via a CSS module `@apply`-ing `flex items-center justify-center min-h-lvh` (per CLAUDE.md, no stacked Tailwind utilities directly on the element). `Skeleton` is deliberately not reused here — it's shaped to simulate specific card content, not a generic "checking your session" state that needs to apply uniformly across every differently-shaped page in both groups.

### Wiring the layouts

- `app/(public)/layout.tsx` becomes a client component, wraps `{children}` in `<AuthGuard when="unauthenticated" redirectTo="/heists" exemptPaths={["/"]}>`. No `appendRedirectParam` — there's no "intended destination" to preserve when redirecting an already-authenticated user away from a public-only page.
- `app/(dashboard)/layout.tsx` becomes a client component, moves `<Navbar />` *inside* the guard (so it's withheld during loading too): `<AuthGuard when="authenticated" redirectTo="/login" appendRedirectParam>`.
- `app/(public)/page.tsx` (splash) is untouched — its exclusion is handled entirely by `exemptPaths={["/"]}` on the public layout's guard, so it needs no per-page logic and its "decide where to send the user" comment stays as documented future work, out of scope here.

### `?redirect=` round trip

- `AuthGuard` in the dashboard layout redirects to `` `/login?redirect=${encodeURIComponent(pathname)}` ``.
- `components/AuthForm/AuthForm.tsx` starts reading `useSearchParams().get("redirect")` and pushes there instead of the hardcoded `/heists` on successful login/signup, falling back to `/heists` when absent. Since `AuthForm` now calls `useSearchParams()`, `app/(public)/login/page.tsx` and `app/(public)/signup/page.tsx` need to wrap it in `<Suspense fallback={null}>` to satisfy the build-time requirement.
- The login/signup switch link (`config.switchHref`) also carries the `redirect` param forward, so switching variants mid-flow doesn't lose the intended destination.
- Both variants honor the param consistently — no reason to special-case signup vs. login here.

### Files touched

New:
- `components/AuthGuard/AuthGuard.tsx`, `components/AuthGuard/index.ts`
- `components/PageLoader/PageLoader.tsx`, `components/PageLoader/PageLoader.module.css`, `components/PageLoader/index.ts`

Modified:
- `app/(public)/layout.tsx` — client component, wraps children in `AuthGuard`
- `app/(dashboard)/layout.tsx` — client component, `Navbar` + children wrapped in `AuthGuard`
- `components/AuthForm/AuthForm.tsx` — read `redirect` search param, use it for post-submit `router.push` and the switch link
- `app/(public)/login/page.tsx`, `app/(public)/signup/page.tsx` — wrap `<AuthForm />` in `<Suspense>`

Untouched: `lib/auth/auth-context.tsx` (contract stays `{ user, loading }`), `components/Navbar/Navbar.tsx`, `components/Skeleton/Skeleton.tsx`, `app/(public)/page.tsx`, `app/layout.tsx` (already wraps everything in `AuthProvider`, so no provider changes needed).

## Testing

Follow the existing per-file `vi.mock` + `vi.hoisted` convention (no shared test-utils/render-with-providers helper exists in this repo — don't introduce one).

- New `tests/components/AuthGuard.test.tsx`: mock `next/navigation` (`useRouter`, `usePathname`) and `@/lib/auth/auth-context` (`useUser`). Cover: loader shown while `loading`; children shown when authorized; redirect fired (correct URL, with/without `?redirect=`) when unauthorized; `exemptPaths` bypasses both loading and redirect entirely.
- New `tests/components/PageLoader.test.tsx` (optional smoke test): renders, asserts `getByRole("status")`.
- New tests mirroring the app directory structure for both group layouts (matching the spec's own "Testing Guidelines" section): loader-while-loading, redirect-when-unauthorized, renders-when-authorized, and — for the public layout specifically — a case asserting `/` renders normally even when authenticated.
- Update `tests/components/AuthForm.test.tsx`: add `useSearchParams` to the existing `next/navigation` mock (default empty `URLSearchParams` in `beforeEach` so current assertions keep passing), then add cases for redirect-param-present-on-submit and redirect-param-preserved-on-switch-link.

## Verification

- `npm test` — all new/updated test files pass.
- `npm run build` — this is the only way to catch a missing `<Suspense>` boundary around `AuthForm`'s new `useSearchParams()` call; `npm run dev` will not surface that failure.
- Manual pass via `npm run dev` (localhost:3030):
  - Visit `/` both logged out and logged in — same content both times, no redirect.
  - While logged in, visit `/login`, `/signup`, `/preview` directly — immediate redirect to `/heists`, no flash of form content.
  - While logged out, visit `/heists/create` directly — redirected to `/login?redirect=%2Fheists%2Fcreate`; after logging in, land back on `/heists/create`.
  - From that state, click "Sign up" instead — redirect param still present in the URL/switch link.
  - Throttle network and hard-refresh `/heists` while authenticated — loader shows with no `Navbar` flash, `Navbar` appears once resolved.

## Critical files
- `components/AuthGuard/AuthGuard.tsx`
- `components/PageLoader/PageLoader.tsx`
- `app/(public)/layout.tsx`
- `app/(dashboard)/layout.tsx`
- `components/AuthForm/AuthForm.tsx`

## Note on plan file location
Per prior project convention, once this plan is approved, copy this file to `.claude/_plans/route-protection.md` in the project (version-controlled alongside the spec) before starting implementation.
