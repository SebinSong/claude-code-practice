# Authentication Forms — Implementation Plan

## Context

The `/login` and `/signup` pages under `app/(public)/` are currently empty stubs that render only a heading. The `_specs/authentication-forms.md` spec calls for both routes to render a working email + password form with a password-visibility toggle, a submit handler that simply `console.log`s the payload (no API yet), and an in-form link that switches between the two variants. The two pages must share one component to avoid duplicated markup — the variant (`"login" | "signup"`) drives every difference (button label, switch prompt, autocomplete hint, console label).

The work is intentionally scoped to UI + client-side behaviour; authentication wiring comes later. The result is a foundation the future auth integration can drop a real `onSubmit` handler onto.

## Files to create / modify

### New component
- `components/AuthForm/AuthForm.tsx` — the shared form
- `components/AuthForm/AuthForm.module.css` — co-located styles (must start with `@reference "../../app/globals.css";`)
- `components/AuthForm/index.ts` — barrel: `export { default } from "./AuthForm"`

### Pages (modify existing)
- `app/(public)/login/page.tsx` — render `<AuthForm variant="login" />` inside the existing `.center-content` / `.page-content` shell. Keep the `<h1 className="form-title">Log in to Your Account</h1>` heading above the form.
- `app/(public)/signup/page.tsx` — render `<AuthForm variant="signup" />`. Promote the heading from `h2` to `h1` for consistency with `/login` and update copy ("Sign up for an Account" or similar — keep it minimal per the spec's "default to plain headings" guidance).

### Tests (new)
- `tests/components/AuthForm.test.tsx` — covers all cases listed in the spec's Testing Guidelines.

### No changes required to
- `app/(public)/layout.tsx` — already provides the `<main className="public">` shell with no navbar.
- `app/globals.css` — existing tokens (`primary`, `error`, `body`, `heading`, `light`, etc.) and utility classes (`.btn`, `.form-title`, `.page-content`, `.center-content`) cover what's needed.
- `package.json` — `lucide-react` (already present) supplies `Eye` / `EyeOff`; `@testing-library/user-event` is already installed for the typing/click tests.

## Component design — `AuthForm`

### Props
```ts
type AuthFormProps = { variant: "login" | "signup" }
```

### Variant-driven config (computed once inside the component)
| Field                 | login                          | signup                          |
| --------------------- | ------------------------------ | ------------------------------- |
| submit button label   | `Log in`                       | `Sign up`                       |
| password autocomplete | `current-password`             | `new-password`                  |
| password minLength    | (none)                         | `6`                             |
| console label         | `login submit`                 | `signup submit`                 |
| switch prompt copy    | `Don't have an account? Sign up` | `Already have an account? Log in` |
| switch link href      | `/signup`                      | `/login`                        |

A single `const config = variant === "login" ? {...} : {...}` keeps the two variants colocated and obvious.

### State (client component — file starts with `"use client"`)
- `email: string` — controlled input
- `password: string` — controlled input
- `showPassword: boolean` — drives the password input's `type` and the toggle's icon/aria label

### Behaviour
- Form is a native `<form onSubmit={handleSubmit}>`. `handleSubmit` calls `e.preventDefault()`, then `console.log(config.consoleLabel, { email, password })`. Email is taken from the controlled `email` state; password from controlled `password` state (so it survives visibility toggling, autofill, and Enter-to-submit). No fetch, no router push.
- Submit button is `disabled={!email || !password}` so it matches the spec's "enabled whenever both fields are non-empty" rule while still letting HTML `required` block the truly-empty case.
- Password input renders inside a wrapper div together with the toggle button so the toggle is a sibling of the input, not an overlay — this is what the spec requires to coexist with password-manager DOM injections.
- Toggle button: `<button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(s => !s)}>`. Icon swaps between lucide-react's `<Eye />` and `<EyeOff />`. `type="button"` is critical — otherwise clicking it submits the form.
- Switch affordance: rendered **below** the submit button (per the spec's resolved open question). Uses `next/link` so navigation stays client-side and the `(public)` layout is preserved.

### Markup skeleton (illustrative)
```tsx
"use client"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import styles from "./AuthForm.module.css"

export default function AuthForm({ variant }: { variant: "login" | "signup" }) {
  const config = variant === "login" ? { ... } : { ... }
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log(config.consoleLabel, { email, password })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate={false}>
      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Password</span>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={variant === "signup" ? 6 : undefined}
            autoComplete={config.passwordAutocomplete}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="button"
            className={styles.toggle}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(s => !s)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </label>

      <button type="submit" className="btn" disabled={!email || !password}>
        {config.submitLabel}
      </button>

      <p className={styles.switchPrompt}>
        {config.switchPromptText}{" "}
        <Link href={config.switchHref}>{config.switchLinkText}</Link>
      </p>
    </form>
  )
}
```

### Styling — `AuthForm.module.css`
- Starts with `@reference "../../app/globals.css";`
- Per CLAUDE.md: never stack multiple Tailwind utilities directly on a JSX element — combine via `@apply`.
- Classes needed: `.form` (vertical stack, max-width, gap), `.field` (label + input pair styling using theme tokens for `border-body` / `text-heading` etc.), `.passwordWrapper` (positions input + toggle as flex row), `.toggle` (button reset + focus ring using `primary`), `.switchPrompt` (centered, muted, link in `primary`).
- The existing `.btn` global utility class handles the submit button visuals, so no AuthForm-specific submit styling is needed beyond layout spacing.

## Tests — `tests/components/AuthForm.test.tsx`

Mirrors the spec's Testing Guidelines. Use `@testing-library/react` (already used in `Navbar.test.tsx`) and `@testing-library/user-event` (already installed but currently unused). Spy on `console.log` with `vi.spyOn(console, "log")` and restore in `afterEach`. Cases:

1. **Login variant renders the right structure** — `render(<AuthForm variant="login" />)`, assert email input, password input (default `type="password"`), toggle button, and submit button labelled `Log in`.
2. **Signup variant renders the right structure** — same, with submit labelled `Sign up`.
3. **Visibility toggle flips input type and aria-label** — initial `type="password"` and aria-label `Show password`; click → `type="text"` and `Hide password`; click again → reverts.
4. **Login submit logs once with payload** — type into email + password, submit, assert `console.log` called once with `"login submit"` and `{ email, password }`. Assert `window.location` did not change (no navigation).
5. **Signup submit logs with signup label** — same pattern, expect `"signup submit"`.
6. **Empty submission does not log** — try to submit without typing; the `required` attribute blocks the submit handler, so `console.log` is not called.
7. **Switch links point to the other route** — login form has a link with `href="/signup"`; signup form has a link with `href="/login"`.

Mount each variant directly — no need to render through the page wrappers, since the variant prop is the only thing the page contributes.

## Verification

Run end-to-end after implementation:
1. `npm run lint` — ESLint must pass.
2. `npm test` — all new + existing Vitest tests must pass. Single-file run: `npx vitest run tests/components/AuthForm.test.tsx`.
3. `npm run dev` and visit `http://localhost:3030`:
   - `/login` — fill email + password, open DevTools console, click `Log in` → one `login submit` entry with the payload; no navigation.
   - Click the eye icon → password becomes visible; click again → re-obscures; tooltip/aria-label flips both times.
   - Click the "Sign up" link → lands on `/signup` without a full reload (no flash, layout persists).
   - On `/signup`, repeat the submit → `signup submit` log entry.
   - Confirm no navbar appears on either page (public layout intact).

## Notes on conventions

- File is a client component (`"use client"`) — `useState` and event handlers require it.
- No semicolons in TS/TSX per CLAUDE.md.
- Component imported as `import AuthForm from "@/components/AuthForm"` — barrel-style, not the inner file path.
- No new dependencies; `Eye` / `EyeOff` come from already-installed `lucide-react`.

## Post-approval housekeeping

The user asked for the plan to live at `.claude/_plans/` inside the project. After approval, move/copy this file to `.claude/_plans/authentication-forms.md` in the repo so it's checked in alongside the spec.
