# Sepc for route-protection

branch: claude/feature/route-protection
figma_component (If used): N/A

## Summary
Add route-group-level auth protection so `(public)` pages (`/`, `/login`, `/signup`, `/preview`) are only reachable by unauthenticated users and `(dashboard)` pages (`/heists`, `/heists/create`, `/heists/[id]`) are only reachable by authenticated users. Each group layout reads auth state via the `useUser` hook and redirects users who don't belong in that group. While Firebase is still resolving the initial auth state (`loading: true`), each layout shows the existing spinner UI instead of its children, so no page ever flashes content the user isn't supposed to see before the redirect fires.

## Functional Requirements
- `(public)` layout (`app/(public)/layout.tsx`) uses `useUser` to check auth state:
  - While `loading` is `true`, render the existing loader UI only (no children).
  - Once loading resolves, if a `user` is present, redirect to the authenticated landing route (`/heists`).
  - Once loading resolves, if there is no `user`, render the children as normal.
- `(dashboard)` layout (`app/(dashboard)/layout.tsx`) uses `useUser` to check auth state:
  - While `loading` is `true`, render the existing loader UI only (no children, no `Navbar`).
  - Once loading resolves, if there is no `user`, redirect to `/login`.
  - Once loading resolves, if a `user` is present, render `Navbar` and children as normal.
- Redirects are performed client-side (both layouts are already client-capable or can become client components) using Next.js navigation, and should not leave the protected content briefly visible before navigating away.
- The loader shown during the `loading` state reuses the existing spinner UI already defined in the app (the same visual treatment used elsewhere, e.g. `Navbar`/`AuthForm` loading states), rather than introducing a new loading component.
- Behavior must hold for every page nested under each route group without requiring per-page changes.

## Figma Design Reference (only if referenced)
- N/A

## Possible Edge Cases
- User is authenticated and lands directly on a public-only route (e.g. via bookmark or back button) — should be redirected away before public content renders.
- Unauthenticated user lands directly on a dashboard-only route (e.g. via bookmark, direct URL, or expired session) — should be redirected to `/login` before dashboard content renders.
- Auth state resolves to unauthenticated shortly after a sign-out action performed from within the dashboard — should redirect out of the dashboard group.
- Rapid navigation between a public route and a dashboard route while the initial `loading` state hasn't resolved yet — loader should show consistently without a flash of the wrong content in either group.
- Firebase auth state takes an unusually long time to resolve (slow network) — loader should remain visible indefinitely until resolved, with no timeout-driven fallback that guesses the auth state.
- Navigating between two pages within the same protected group (e.g. `/heists` to `/heists/create`) should not re-trigger the loader or redirect logic unnecessarily once auth state is already known.

## Acceptance Criteria
- Visiting any `(public)` route while authenticated results in an automatic redirect to `/heists`.
- Visiting any `(dashboard)` route while unauthenticated results in an automatic redirect to `/login`.
- Visiting any `(public)` route while unauthenticated shows that route's normal content.
- Visiting any `(dashboard)` route while authenticated shows `Navbar` plus that route's normal content.
- While Firebase auth state is loading, both group layouts show only the existing loader UI, never the page content and never a redirect.
- No console errors are introduced by calling `useUser` from either group layout.

## Open Questions
- Should the post-login redirect target for public routes always be `/heists`, or should it preserve an intended destination (e.g. redirect back to a deep link the user originally tried to visit before being sent to `/login`)?
It should preserve the intended destination as '?redirect=' segment of the URL.
- Should the root splash page (`/`) follow the same public-group redirect logic described here, or does it keep its own separate redirect logic as noted in CLAUDE.md ("intended to redirect logged-in users to `/heists` and others to `/login`, logic not wired yet")?
Root splash page is accessible whether authenticated or not.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- `(public)` layout renders the loader while auth state is loading, and not the children.
- `(public)` layout redirects to `/heists` when `useUser` reports an authenticated user.
- `(public)` layout renders children when `useUser` reports no user.
- `(dashboard)` layout renders the loader while auth state is loading, and not `Navbar`/children.
- `(dashboard)` layout redirects to `/login` when `useUser` reports no user.
- `(dashboard)` layout renders `Navbar` and children when `useUser` reports an authenticated user.
