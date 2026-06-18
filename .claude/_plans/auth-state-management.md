# Plan: Global Auth State Management (`useUser`)

## Context

The app uses Firebase Auth (`lib/firebase.ts` exports an initialized `auth`), but nothing observes auth state. The login/signup forms are UI shells that only `console.log` — there is no way for any page or component to know whether a user is signed in. Currently there are **no** React contexts, providers, or hooks in the project at all.

This feature adds the **read/observe side** of auth: a single app-wide realtime listener that tracks Firebase's auth state, exposed to any client component via a `useUser` hook. It deliberately does **not** touch the signup/login/logout flows — those get wired to this layer in a later spec. Outcome: any component can call `useUser()` and reactively read the current user (or `null`), plus a `loading` flag to distinguish "not yet determined" from "logged out".

Spec: `_specs/auth-state-management.md`. Branch: `claude/feature/auth-state-management`.

## Design decisions

- **Location:** `lib/auth/auth-context.tsx` (new `lib/auth/` folder), per user choice. It's non-visual infrastructure (context + hook, no markup/CSS), so it doesn't use the `components/<Name>/` folder convention; it sits beside the `auth` export it depends on.
- **Hook return shape:** `{ user, loading }` where `user` is the raw Firebase `User | null` and `loading` is `true` until the first auth-state emission, then `false`. The `loading` flag is required so consumers can tell "initializing" apart from "logged out" (both are otherwise `null`).
- **One listener for the whole app:** the provider mounts once in the root layout, so a single `onAuthStateChanged` subscription serves every consumer through context — no per-component listeners.
- **Guard:** `useUser` throws if used outside `AuthProvider`, surfacing misuse (e.g. server component) loudly instead of returning a fake permanent "loading".

## API confirmed (Firebase v12 modular, via Context7)

`onAuthStateChanged(auth, callback)` from `firebase/auth` — callback receives `User | null`, returns an `Unsubscribe` (`() => void`) used for cleanup.

## Files

### 1. CREATE `lib/auth/auth-context.tsx`
- First line `"use client"`.
- Imports: `createContext, useContext, useEffect, useState` from `react`; `onAuthStateChanged, type User` from `firebase/auth`; `auth` from `@/lib/firebase`.
- `type AuthState = { user: User | null; loading: boolean }`.
- `const AuthContext = createContext<AuthState | undefined>(undefined)` (sentinel `undefined` enables the guard).
- `export function AuthProvider({ children }: { children: React.ReactNode })`:
  - `const [state, setState] = useState<AuthState>({ user: null, loading: true })`.
  - `useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (nextUser) => setState({ user: nextUser, loading: false })); return unsubscribe }, [])` — subscribe once, cleanup on unmount.
  - Render `<AuthContext.Provider value={state}>{children}</AuthContext.Provider>`.
- `export function useUser(): AuthState` — reads context; throws `new Error("useUser must be used within an AuthProvider")` if `undefined`.
- No semicolons, double quotes (Prettier `semi: false`).

### 2. MODIFY `app/layout.tsx`
- Add `import { AuthProvider } from "@/lib/auth/auth-context"`.
- Wrap children: `<body><AuthProvider>{children}</AuthProvider></body>`.
- Stays a server component (the `"use client"` boundary lives inside the provider file). This root layout is the only common ancestor of both `(public)` and `(dashboard)` route groups, so one provider covers both. No changes to the two group layouts.

### 3. CREATE `tests/lib/auth/auth-context.test.tsx`
First `vi.mock` in the repo. Mock the SDK boundary so the test drives auth-state changes.

- Module-top: `const unsubscribe = vi.fn()` and a `capturedCallback` holder.
- `vi.mock("firebase/auth", () => ({ onAuthStateChanged: vi.fn((_auth, cb) => { capturedCallback = cb; return unsubscribe }) }))`.
- `vi.mock("@/lib/firebase", () => ({ auth: {} }))` so no real Firebase app spins up in jsdom.
- Import `AuthProvider, useUser` from `@/lib/auth/auth-context` and `onAuthStateChanged` from `firebase/auth` after the mocks.
- `beforeEach`: reset `capturedCallback` and `vi.clearAllMocks()`.
- Drive emissions with `act(() => capturedCallback(value))`; use `renderHook(() => useUser(), { wrapper: AuthProvider })` for value assertions and plain `render` for lifecycle.
- Conventions: double quotes, explicit vitest imports, no semicolons, `@testing-library/user-event` if any interaction (none expected here).

Test cases:
1. `loading` is `true` / `user` `null` before first emission; `false` after `act(() => capturedCallback(null))`.
2. Logged out → `{ user: null, loading: false }`.
3. Logged in → `result.current.user` equals the emitted fake user; `loading` false.
4. Reactive transitions null → user → null via successive `act` emissions.
5. Subscribed once (`onAuthStateChanged` called once), `unsubscribe` called once on `unmount()`.
6. `useUser` outside a provider throws `/within an AuthProvider/` (suppress expected React error via `vi.spyOn(console, "error")` in that test, matching the `AuthForm.test.tsx` spy pattern).

## Out of scope (deferred to later spec)
- No changes to `AuthForm`/login/signup/logout flows.
- No redirect/route-guard behavior.
- No trimmed/serializable user shape (raw `User` for now).

## Verification
- `npx vitest run tests/lib/auth/auth-context.test.tsx` — all cases pass.
- `npm run lint` — clean.
- `npm run build` — type-checks (the server root layout rendering a client provider must compile).
- Manual smoke (optional): drop a temporary component calling `useUser()` into a page and confirm it reads `loading` then settles to the correct user/null after Firebase resolves the persisted session.
