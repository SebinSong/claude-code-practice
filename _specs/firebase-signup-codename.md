# Spec for Firebase Signup with Generated Codename

branch: claude/feature/firebase-signup-codename
figma_component (If used): none

## Summary

Wire the existing signup form (`app/(public)/signup/`, which renders the shared `AuthForm` with `variant="signup"`) to real Firebase Authentication using the Firebase **web SDK only**, via the existing client in `lib/firebase.ts`.

On a successful signup the app:
1. Creates the auth account from the submitted email + password.
2. Generates a random **codename** by picking one word from each of three distinct word sets and joining them in PascalCase (e.g. `SneakyGoldenFalcon`), and sets it as the user's Firebase Auth `displayName`.
3. Creates a document in a `users` collection in Firestore storing the user's `codename` and `id` (their auth UID). The user's **email is deliberately not stored** in Firestore.

This builds on the already-merged auth state layer (`useUser` / `AuthProvider`), which already exposes `displayName` — so once signup sets the displayName, the global listener reflects it automatically. This spec covers **signup only**; the login flow and logout remain unchanged.

## Functional Requirements

- Replace the signup form's current placeholder submit behaviour (which only `console.log`s) with a real Firebase signup, without changing the login variant's behaviour.
- Use the Firebase **web/client SDK exclusively** (no Admin SDK, no server actions/API routes for the auth/write). Reuse the `auth` and `db` exports from `lib/firebase.ts` — do not initialise a second Firebase app.
- Create the account with email + password from the form.
- After the account is created, generate a codename and set it as the Firebase Auth `displayName` on the new user.
- Codename generation:
  - Three separate word sets, each containing unique words (no duplicates within a set).
  - Pick one word at random from each set.
  - Join the three picked words in PascalCase (each word capitalised, no separators), in a fixed set order.
- Create a Firestore document in the `users` collection containing:
  - `codename` — the generated codename (same value as the displayName).
  - `id` — the new user's auth UID.
  - It must **not** contain the user's email (or password).
- Surface signup progress and failures to the user: a pending/disabled state while submitting, and a readable error message on failure.
- On success the form should reflect the signed-in state (the global `useUser` state updates via the existing auth listener).

## Figma Design Reference (only if referenced)

- Not referenced. Reuse the existing `AuthForm` styling; any new UI (error text, loading state) should use existing theme tokens / module styles.

## Possible Edge Cases

- Email already in use → show a clear, specific message rather than a raw Firebase error code.
- Weak password / password shorter than the form's `minLength` (signup currently enforces a 6-char minimum).
- Invalid email format.
- Network failure or Firebase unavailable mid-signup.
- Account is created in Auth but the `displayName` update or Firestore write fails — partial success: the user exists in Auth but has no codename/profile doc. Define intended behaviour (e.g. surface an error, and/or make the profile write idempotent/retriable).
- Codename collision: two users independently generate the same codename (codename is not guaranteed unique). Decide whether uniqueness matters for this feature.
- Double submit / rapid repeated clicks creating duplicate attempts.
- A document already existing at the target `users` path for the UID (should effectively never happen for a brand-new UID, but define the write semantics).
- User navigates away before the post-creation steps (displayName + Firestore write) complete.

## Acceptance Criteria

- Submitting the signup form with a valid, unused email + valid password creates a Firebase Auth user.
- The new user has a non-empty `displayName` in PascalCase composed of exactly three words, one from each set.
- A document exists in the `users` collection keyed to the new user, containing `codename` and `id`, and containing **no** email field.
- The codename stored in Firestore matches the `displayName` set on the auth user.
- The login variant of `AuthForm` is unaffected (still behaves as before).
- Signup failures (e.g. email already in use) produce a visible, human-readable error and do not crash the form.
- Only the Firebase web SDK is used; no new Firebase app instance is created.

## Open Questions

- Where should the codename word sets and the generation logic live (e.g. a helper under `lib/`), and should the generator be independently unit-testable? Yes, and lib/ folder sounds good.
- What document ID should the `users` doc use — the auth UID (recommended, makes lookups trivial) or an auto-generated ID with `id` as a field? auth UID sounds good.
- Should anything else be stored on the `users` doc now (e.g. `createdAt` timestamp), or strictly `codename` + `id` as stated?
createdAt is definitely something we need.
- After a successful signup, should the user be redirected (e.g. to `/heists`), or is routing out of scope for this spec? Yes, take users to /heists page after signup.
- Is codename uniqueness a requirement, or is best-effort randomness acceptable for now? best-effort randomness is okay for now.
- How should partial-failure (auth created but profile write failed) be handled — surfaced error, automatic retry, or cleanup?
Just log the error to the console for now.
- Test-mode Firestore rules currently allow open writes; no rule changes are assumed in scope — confirm.

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Codename generator: returns a PascalCase string composed of exactly three words, one drawn from each set; repeated calls only ever use words from the defined sets.
- Codename generator: produces varied output across many calls (not constant), and the words come from the expected three sets.
- Signup submit (with Firebase auth + Firestore mocked): a valid submission calls account creation, then sets the displayName, then writes a `users` doc with `codename` + `id` and **no** email.
- Signup submit failure (mocked rejection, e.g. email-already-in-use): surfaces a readable error and does not write a Firestore document.
- The login variant does not trigger any Firebase auth/Firestore calls (guards against the shared component regressing).
