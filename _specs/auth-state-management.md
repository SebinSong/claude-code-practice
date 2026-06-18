# Spec for Auth State Management with useUser Hook

branch: claude/feature/auth-state-management
figma_component (If used): none

## Summary

Introduce a global, realtime authentication state layer for the app so any page or component can read the current user without prop-drilling or re-querying Firebase. A single app-wide listener subscribes to Firebase Auth's realtime auth-state changes and keeps a shared user value up to date. Consumers access this value through a `useUser` hook that returns the current user object when logged in, or `null` when logged out.

This spec covers **only** the read/observe side of auth state — establishing the global listener and the `useUser` hook. It deliberately does **not** change the signup, login, or logout flows; those continue to work as they do today and will be wired to this state layer in a later spec.

## Functional Requirements

- A single global auth-state listener is established once for the whole app (not per-component) and stays active for the app's lifetime.
- The listener subscribes to Firebase Auth realtime state changes and updates a shared, in-memory user value whenever auth state changes (sign-in, sign-out, token/user refresh).
- Expose a `useUser` hook that any client component or page can call to read the current user.
- `useUser` returns `null` when no user is authenticated, and the current user object when a user is authenticated.
- `useUser` exposes a loading/initializing indicator so consumers can distinguish "auth state not yet determined" from "definitively logged out" (both are otherwise `null`).
- The hook must be usable from any page or component within the authenticated (dashboard) and public shells.
- The listener must be cleaned up properly to avoid duplicate subscriptions or memory leaks (e.g. across hot reloads / re-mounts).
- The solution reuses the existing Firebase client initialization (`lib/firebase.ts`) — no new Firebase app instance.
- No changes to signup, login, or logout behaviour in this spec.

## Figma Design Reference (only if referenced)

- Not applicable — this feature has no visual/UI surface of its own.

## Possible Edge Cases

- Initial app load before Firebase has resolved the persisted auth session (state is "unknown", not yet `null` or a user).
- User session restored from persistence on a fresh page load / full refresh.
- Rapid auth transitions (e.g. login immediately followed by logout) producing multiple listener fires.
- Multiple components calling `useUser` simultaneously — all must receive the same consistent value from one underlying listener.
- Hook used in a server component / non-browser context where the listener cannot run (must fail gracefully or be clearly client-only).
- Hot-module reload during development re-registering the listener (must not stack duplicate listeners).
- Token expiry / silent refresh that updates the user object without a full sign-out.
- Consumer mounted after auth state has already settled (should immediately receive the current value, not wait for the next change).

## Acceptance Criteria

- A component anywhere in the tree can call `useUser` and read the current user with no additional setup beyond the global provider/listener.
- When logged out, `useUser` returns `null`; when logged in, it returns the authenticated user object.
- The user value updates automatically in realtime when auth state changes, without a manual refresh or re-query by the consumer.
- Consumers can tell "still initializing" apart from "logged out".
- Only one auth-state listener exists regardless of how many components consume the hook.
- Existing signup / login / logout flows continue to behave exactly as before (no regressions).
- No duplicate listeners or leaked subscriptions after navigation, re-mount, or dev hot reload.

## Open Questions

- Where should the global provider/listener mount so it covers both the `(public)` and `(dashboard)` shells — at the root layout, or per group?
- What exact shape should `useUser` return — just the user (`User | null`) or an object including a `loading`/`initializing` flag (and possibly later: `error`)?
- Should the user value be the raw Firebase `User` object, or a trimmed/serializable app-specific shape?
- Is any redirect behaviour (e.g. send logged-out users to `/login`) in scope here, or strictly deferred to the flow-wiring spec?

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- `useUser` returns `null` when there is no authenticated user.
- `useUser` returns the user object when a user is authenticated (mock the auth listener emitting a user).
- `useUser` updates from `null` to a user (and back) when the mocked auth-state listener fires, confirming realtime reactivity.
- The loading/initializing state is reported before the first auth-state resolution and cleared afterward.
- The underlying auth listener is subscribed once and unsubscribed on unmount/cleanup (no duplicate subscriptions).
