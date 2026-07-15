# Plan: Logout Navbar Button

Spec: `_specs/logout-navbar-button.md`
Branch: `claude/feature/logout-navbar-button`

## Context

Signup is wired to Firebase (`signUpWithCodename` in `lib/auth/index.ts`) and the app already tracks auth state globally via `useUser()` (`lib/auth/auth-context.tsx`), but there is no way for a logged-in user to end their session — `Navbar.tsx` has no awareness of auth state at all today. This adds a "Log out" action to the Navbar, visible only while signed in, that calls Firebase's `signOut`, redirects to `/login`, and introduces a reusable transparent/outlined "secondary" button style plus a shared loading-spinner class (currently duplicated only inside `AuthForm`) so both signup/login and logout share the same loading affordance.

Two scope decisions confirmed with the user during planning:
- `.secondary` is a **global** class in `app/globals.css` (alongside `.btn`), composed as literal `"btn secondary"` — not a Navbar-module-scoped class.
- The `.spinner`/`@keyframes spin` currently living only in `AuthForm.module.css` gets **hoisted to `app/globals.css`** as shared global classes, and `AuthForm.tsx`/`AuthForm.module.css` are updated to drop the duplicate.

## Changes

### 1. `app/globals.css`
Append after the existing `.btn`/`.btn:hover` block:
```css
.btn.secondary {
  @apply bg-transparent border border-secondary text-secondary;
}
.btn.secondary:hover,
.btn.secondary:focus-visible {
  @apply bg-secondary/10 text-secondary border-secondary;
  outline: none;
}
```
`.btn.secondary:hover` (specificity 0,3,0) reliably beats `.btn:hover` (0,2,0), so the transparent/outlined look isn't clobbered by the base solid-fill hover.

Also append (relocated verbatim from `AuthForm.module.css`):
```css
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 2. `components/AuthForm/AuthForm.module.css` + `AuthForm.tsx`
Remove the `.spinner`/`@keyframes spin` block from the CSS module. In `AuthForm.tsx`, change `className={styles.spinner}` to the literal string `className="spinner"` on the submit button's loading span. No other AuthForm behavior changes.

### 3. `lib/auth/index.ts`
Add `signOut` to the `firebase/auth` import and export a new `signOutUser` function (named to avoid colliding with the imported `signOut`):
```ts
// End the current session. Errors propagate to the caller.
export async function signOutUser() {
  await signOut(auth)
}
```
No try/catch — matches the "propagate to caller" pattern already used for account creation in `signUpWithCodename`.

### 4. `components/Navbar/Navbar.tsx`
Convert to a client component (`"use client"`) and wire up:
- `useUser()` from `@/lib/auth/auth-context` for `{ user, loading }`.
- `useRouter()` from `next/navigation` for the post-logout redirect.
- Local `submitting` state, mirroring `AuthForm.tsx`'s pattern exactly (`setSubmitting(true)` → `try { await signOutUser(); router.push("/login") } catch (e) { console.error(...) } finally { setSubmitting(false) }`).
- A new `<li>` sibling to the existing "Create Heist" `<li>`, rendered only when `!loading && user`, containing a `<button type="button">` with `className={`btn secondary ${styles.logoutBtn}`}`, `disabled={submitting}`, a `LogOut` icon (`lucide-react`, matching the existing `Clock8`/`Plus` import convention) + "Log out" label, swapped for `<span className="spinner" aria-hidden />` while `submitting`.

### 5. `components/Navbar/Navbar.module.css`
- Add `.logoutBtn { @apply inline-flex items-center gap-2; }` for icon/label spacing (parallel to how `.createBtn` composes its own layout), plus `.logoutBtn:disabled { @apply opacity-50 cursor-not-allowed; }` matching the disabled treatment `AuthForm`'s `.submit:disabled` already establishes.
- Add `.siteNav ul { @apply flex items-center gap-3; }` — the `<ul>` currently has no explicit flex/gap of its own (only `<nav>` does), and now needs to lay out two `<li>` actions side by side instead of one.

### 6. Tests
This is relatively simple behaviour. No need to create tests for this one.

## Sequencing
1. `globals.css` (spinner hoist + `.secondary`) — no dependents, safe first.
2. `AuthForm.module.css`/`AuthForm.tsx` spinner swap — re-run `AuthForm.test.tsx` after (it asserts on role/text, not the CSS class, so should be unaffected).
3. `lib/auth/index.ts` (`signOutUser`) + its test.
4. `Navbar.tsx` + `Navbar.module.css` + `Navbar.test.tsx`.
5. Full `npx vitest run` and `npm run lint`.

## Verification
- `npx vitest run tests/lib/auth/index.test.ts tests/components/Navbar.test.tsx tests/components/AuthForm.test.tsx` — all green, no regressions in AuthForm from the spinner-class change.
- `npm run lint` — no new errors.
- Manual check via `npm run dev`: log in, confirm "Log out" appears in the Navbar with transparent/outlined styling and correct hover/focus color; click it, confirm spinner shows briefly, session ends, and the browser navigates to `/login`. Log out while logged out (fresh `/login` visit) to confirm the button never renders.

### Critical files
- `app/globals.css`
- `components/Navbar/Navbar.tsx`, `components/Navbar/Navbar.module.css`
- `lib/auth/index.ts`
- `components/AuthForm/AuthForm.tsx`, `components/AuthForm/AuthForm.module.css`
- `tests/components/Navbar.test.tsx`, `tests/lib/auth/index.test.ts`
