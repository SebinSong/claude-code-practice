# Plan: Firebase Signup with Generated Codename

## Context

The signup form (`app/(public)/signup/page.tsx` → shared `AuthForm` with `variant="signup"`) is currently a UI shell: its submit handler only `console.log`s. This feature wires signup to real Firebase Auth using the **web SDK only** (reusing `auth`/`db` from `lib/firebase.ts`). On success it: creates the account, generates a random PascalCase **codename** (one word from each of three sets), sets it as the Auth `displayName`, writes a `users/{uid}` Firestore doc holding `codename` + `id` + `createdAt` (**never the email**), then redirects to `/heists`. The login variant must keep behaving exactly as before.

User-confirmed decisions (from spec Open Questions): codename generator lives under `lib/` and is independently unit-testable; `users` doc is keyed by the auth UID; include a `createdAt` timestamp; redirect to `/heists` after signup; best-effort randomness (no uniqueness guarantee); partial failures (profile/Firestore write after account creation) are just `console.error`-logged for now; no Firestore rule changes (test-mode rules already allow writes).

## API confirmed (Firebase v12 modular web SDK, via Context7)
- `createUserWithEmailAndPassword(auth, email, password)` → `UserCredential` (`.user.uid`).
- `updateProfile(user, { displayName })` from `firebase/auth`.
- `doc(db, "users", uid)` + `setDoc(ref, data)` and `serverTimestamp()` from `firebase/firestore`.

## Files

### 1. CREATE `lib/codename.ts`
- Three `const` arrays of unique words (heist-themed; easily editable), e.g. `ADJECTIVES`, `COLORS`, `NOUNS`. Export them (named) so tests can assert membership.
- `export function generateCodename(): string` — pick one random word from each array (in fixed order) and concatenate already-capitalised words into PascalCase (e.g. `SneakyVelvetFalcon`). Words are authored capitalised so no extra casing logic is needed.
- No semicolons, double quotes.

### 2. CREATE `lib/auth/signup.ts`
- `"use client"` not needed (plain async module; it's imported by the client component).
- Imports: `createUserWithEmailAndPassword, updateProfile` from `firebase/auth`; `doc, setDoc, serverTimestamp` from `firebase/firestore`; `auth, db` from `@/lib/firebase`; `generateCodename` from `@/lib/codename`.
- `export async function signUpWithCodename(email: string, password: string)`:
  1. `const { user } = await createUserWithEmailAndPassword(auth, email, password)` — errors here propagate to the caller (surfaced to the user).
  2. Generate `codename = generateCodename()`.
  3. Wrap the post-creation steps in a `try/catch` that only `console.error`s on failure (per user decision — account already exists, don't block success): `await updateProfile(user, { displayName: codename })` then `await setDoc(doc(db, "users", user.uid), { codename, id: user.uid, createdAt: serverTimestamp() })`.
  4. Return the `user` (or `codename`) for the caller.
- Note: the `users` payload contains exactly `codename`, `id`, `createdAt` — **no email**.
- `export function authErrorMessage(error: unknown): string` — map common Firebase codes (`auth/email-already-in-use`, `auth/invalid-email`, `auth/weak-password`) to readable copy, with a generic fallback.

### 3. MODIFY `components/AuthForm/AuthForm.tsx`
- Add `import { useRouter } from "next/navigation"`, `import { signUpWithCodename, authErrorMessage } from "@/lib/auth/signup"`.
- Add state: `const [error, setError] = useState("")` and `const [submitting, setSubmitting] = useState(false)`; `const router = useRouter()`.
- Make `handleSubmit` async. Branch on `variant`:
  - `signup`: `setError(""); setSubmitting(true)`, `try { await signUpWithCodename(email, password); router.push("/heists") } catch (e) { setError(authErrorMessage(e)) } finally { setSubmitting(false) }`.
  - `login`: keep existing `console.log(config.consoleLabel, { email, password })` — **unchanged behaviour** (login is out of scope).
- Submit button: `disabled={!email || !password || submitting}`; show submitting label optionally.
- Render an error element when `error` is set, using a new `.error` module class (not stacked Tailwind utilities). Give it a role for accessibility (e.g. `role="alert"`).

### 4. MODIFY `components/AuthForm/AuthForm.module.css`
- Add `.error` styled via `@apply` using the existing `--color-error` theme token (file already starts with `@reference "../../app/globals.css"`). No raw hex; single combined class per CLAUDE.md.

## Tests

### 5. CREATE `tests/lib/codename.test.ts`
- `generateCodename()` returns a string of exactly three words, each drawn from the corresponding exported set (validate by splitting PascalCase or checking each emitted word is in one of the sets).
- Across many calls (e.g. 50), output varies (not constant) and every word belongs to the defined sets.

### 6. CREATE `tests/lib/auth/signup.test.ts`
- `vi.mock("firebase/auth", ...)`, `vi.mock("firebase/firestore", ...)`, `vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }))` (extends the established mock pattern from `tests/lib/auth/auth-context.test.tsx`).
- Success: `createUserWithEmailAndPassword` resolves with a fake `{ user: { uid } }` → assert `updateProfile` called with `{ displayName: <codename> }`, `setDoc` called with a payload containing `codename`, `id` (= uid), a `createdAt`, and **no `email` key**. Assert the codename passed to `updateProfile` matches the one in the `setDoc` payload.
- Failure: `createUserWithEmailAndPassword` rejects (e.g. `auth/email-already-in-use`) → `signUpWithCodename` rejects and `setDoc` is **never** called.
- `authErrorMessage` maps known codes to readable strings and falls back for unknown errors.

### 7. MODIFY `tests/components/AuthForm.test.tsx`
- Add `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }))` and `vi.mock("@/lib/auth/signup", ...)` (mock `signUpWithCodename` + `authErrorMessage`) so the component test stays isolated from Firebase internals.
- **Update the existing "logs the signup payload" test** — signup no longer `console.log`s; replace it with: valid signup submit calls `signUpWithCodename(email, password)` then `router.push("/heists")`.
- Add: signup failure (mocked rejection) renders the error message and does **not** redirect.
- Add/keep: login submit still `console.log`s and triggers **no** `signUpWithCodename` call (guards the shared component against regression).
- Keep the existing login/structure/password-toggle tests as-is.

## Verification
- `node ./node_modules/vitest/vitest.mjs run tests/lib/codename.test.ts tests/lib/auth/signup.test.ts tests/components/AuthForm.test.tsx` — all pass. *(Local `.bin` symlinks are missing in this environment; invoke vitest via node. A `npm ci` was already done this session to repair node_modules.)*
- `npx tsc --noEmit` — clean.
- `npm run lint` on the changed files — clean (note: a pre-existing unrelated lint error exists in `app/(dashboard)/heists/page.tsx`).
- Manual smoke (optional): `npm run dev`, sign up with a fresh email → lands on `/heists`; check Firebase console Auth for the displayName and Firestore `users/{uid}` for `codename`/`id`/`createdAt` with no email; retry same email → readable "email already in use" error.

## Out of scope
- Login and logout flows (unchanged). No codename uniqueness enforcement. No Firestore security-rule changes. No cleanup/retry on partial failure beyond console logging.
