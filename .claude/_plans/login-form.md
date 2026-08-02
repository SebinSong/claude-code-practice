# Plan: Login Form Functionality

Spec: `_specs/login-form.md`
Branch: `claude/feature/login-form`

## Context

The login page (`app/(public)/login/page.tsx`) already renders `AuthForm` in its "login" variant, but `handleSubmit` short-circuits for any non-signup variant and just `console.log`s the entered credentials — it never calls Firebase. This wires the login path to Firebase Authentication so valid credentials sign the user in and redirect to `/heists`, reusing the error-message pattern already established for signup.

Two scope decisions were resolved directly in the spec's Open Questions (superseding the earlier, more generic Summary/Acceptance Criteria wording, the same way a stale line was resolved in the `logout-navbar-button` spec):
- **No success-message UI.** The user's answer: "No need to show successful message. User profile will be implemented in the Navbar later." Only the `/heists` redirect signals success — no toast/banner is introduced (none exists anywhere in the codebase to reuse).
- **A single generic error message** covers every login failure (wrong password, unknown email, malformed email, rate-limiting, etc.) — no per-code copy.

## Changes

### 1. `lib/auth/index.ts`
Add `signInWithEmailAndPassword` to the `firebase/auth` import, and add two new exports placed after `signUpWithCodename` and before `signOutUser`:

```ts
export async function signInUser(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return { user }
}
```
No try/catch — there's no secondary write on login, so errors propagate straight to the caller (same pattern as `createUserWithEmailAndPassword`'s errors in `signUpWithCodename`, and as `signOutUser`). Named `signInUser` to mirror the existing `signOutUser` naming and avoid colliding with the imported `signInWithEmailAndPassword`.

```ts
const LOGIN_ERROR_MESSAGE = "Invalid email or password. Please try again."

export function loginErrorMessage(): string {
  return LOGIN_ERROR_MESSAGE
}
```
Kept separate from `authErrorMessage` rather than made variant-aware: the signup `ERROR_MESSAGES` map already assigns `auth/invalid-email` a signup-specific message, and reusing that map for login would either collide on that code or need an awkward mode flag. `loginErrorMessage` takes no argument and does no code lookup — every login failure maps to the same copy, per the resolved spec answer. `authErrorMessage` and its `ERROR_MESSAGES` map are untouched.

### 2. `components/AuthForm/AuthForm.tsx`
Import `signInUser` and `loginErrorMessage` alongside the existing `signUpWithCodename`/`authErrorMessage` imports. Drop the now-dead `consoleLabel` key from both entries in `VARIANT_CONFIG` (it was only read by the placeholder branch being removed).

Replace `handleSubmit`'s early-return placeholder with a unified flow:
```ts
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()

  setError("")
  setSubmitting(true)
  try {
    if (variant === "signup") {
      const res = await signUpWithCodename(email, password)
      console.log("signup success", res)
    } else {
      await signInUser(email, password)
    }
    router.push("/heists")
  } catch (err) {
    setError(variant === "signup" ? authErrorMessage(err) : loginErrorMessage())
  } finally {
    setSubmitting(false)
  }
}
```
No success-message UI is added — only the redirect. The submit button's existing `disabled`/spinner rendering already works unmodified for both variants; no JSX changes needed. The existing `signup success` console.log stays as-is (out of scope for this change).

### 3. Tests: `tests/lib/auth/index.test.ts`
- Add a hoisted `signIn: vi.fn()` mock and wire it into the `vi.mock("firebase/auth", ...)` factory as `signInWithEmailAndPassword: mocks.signIn`.
- Import `signInUser` and `loginErrorMessage` alongside the existing imports.
- New `describe("signInUser", ...)` block (mirroring `signOutUser`'s shape): one test asserting `signInWithEmailAndPassword` is called with `(auth, email, password)` and the resolved `{ user }` is returned; one test asserting a rejection propagates via `.rejects.toMatchObject(...)`.
- New `describe("loginErrorMessage", ...)` block: one test asserting it always returns copy matching `/invalid email or password/i`.

### 4. Tests: `tests/components/AuthForm.test.tsx`
- Add hoisted `signInUser: vi.fn()` and `loginErrorMessage: vi.fn(() => "Invalid email or password. Please try again.")`, wired into `vi.mock("@/lib/auth", ...)`.
- In `beforeEach`, default `mocks.signInUser.mockResolvedValue({ user: { uid: "uid-123" } })` alongside the existing signup default.
- Replace the obsolete `"logs the login payload once on submit without touching signup"` test (asserts on a `console.log` path that no longer exists) with three new tests using `userEvent`, mirroring the existing signup success/failure tests:
  - Valid login calls `signInUser` with the entered credentials and redirects to `/heists`; asserts `signUpWithCodename` was not called.
  - Failed login (`mocks.signInUser.mockRejectedValue({ code: "auth/invalid-credential" })`) shows the generic alert copy and does not redirect.
  - A pending login (mock returns a controllable, not-yet-resolved promise) disables the submit button and shows the spinner, then resolving it triggers the redirect — requires adding `waitFor` to the `@testing-library/react` import.
- Update `"does not submit when the form is empty"` (currently spies on `console.log`, which no longer applies to login): assert instead that neither `signInUser` nor `signUpWithCodename` nor `push` is called.
- No changes needed to the other existing tests (variant structure, password toggle, signup success/failure, switch links).

## Sequencing
1. `lib/auth/index.ts` (`signInUser` + `loginErrorMessage`) + its test file — run `npx vitest run tests/lib/auth/index.test.ts` before touching the component.
2. `AuthForm.tsx` (imports, `VARIANT_CONFIG` cleanup, unified `handleSubmit`) + its test file — run `npx vitest run tests/components/AuthForm.test.tsx`.
3. Full `npx vitest run` and `npm run lint` to confirm no regressions elsewhere.

## Verification
- `npx vitest run tests/lib/auth/index.test.ts tests/components/AuthForm.test.tsx` — all green.
- `npx vitest run` (full suite) — no regressions in unrelated tests (Navbar, Avatar, auth-context, utilities).
- `npm run lint` — no new errors (there is one pre-existing, unrelated lint error in `app/(dashboard)/heists/page.tsx` from before this feature; not in scope to fix here).
- Manual check via `npm run dev`: log in with a valid registered account → redirected to `/heists`; log in with wrong password / unknown email → inline "Invalid email or password. Please try again." alert, no redirect; submit button shows a spinner and is disabled while the request is pending.

### Critical files
- `lib/auth/index.ts`
- `components/AuthForm/AuthForm.tsx`
- `tests/lib/auth/index.test.ts`
- `tests/components/AuthForm.test.tsx`
