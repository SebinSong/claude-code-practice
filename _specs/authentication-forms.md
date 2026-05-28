# Spec for authentication-forms

branch: claude/feature/authentication-forms
figma_component (If used): n/a

## Summary
Build the login and signup forms that live on the existing `/login` and `/signup` routes inside the public route group. Each form collects an email and a password, lets the user toggle password visibility with an icon control, and exposes a submit button labelled to match the form (Log in / Sign up). Submission is a stub for now — it should not call an API; it should only log the collected field values to the browser console. The two pages must make it easy for the user to switch between them via an in-form link.

## Functional Requirements

### Shared form behaviour
- A single reusable authentication form component renders both the login and signup variants. The variant determines the heading, submit button label, console-log label, and the switch-form prompt.
- Inputs required for both variants:
  - Email (single-line text input, `type="email"`, required, `autocomplete="email"`).
  - Password (single-line text input, defaults to `type="password"`, required, `autocomplete` set to `current-password` for login and `new-password` for signup).
- The password input includes a trailing icon button that toggles visibility between obscured (`type="password"`) and plain (`type="text"`). The icon swaps to reflect the current state (e.g. eye / eye-off) and exposes an accessible label that announces what activating it will do.
- A submit button is rendered below the inputs. Its label is `Log in` on `/login` and `Sign up` on `/signup`. While the form is in its idle state the button is enabled whenever both fields are non-empty.
- On submit the form prevents the default navigation, collects `{ email, password }`, and writes a single `console.log` entry that identifies the variant (e.g. `login submit` / `signup submit`) alongside the payload. No network calls, no redirects, no toast.
- A "switch to the other form" affordance is rendered as part of the form (not the page chrome). On `/login` it reads as a prompt to go to signup and links to `/signup`; on `/signup` it reads as a prompt to go to login and links to `/login`. The link uses Next.js client-side navigation so the public layout is preserved.

### Page-level requirements
- `/login` (`app/(public)/login/page.tsx`) renders the form in the login variant. The page heading and any supporting copy reflect the login context.
- `/signup` (`app/(public)/signup/page.tsx`) renders the form in the signup variant. The page heading and any supporting copy reflect the signup context.
- Both pages remain inside the `(public)` route group, so they inherit the unauthenticated `<main className="public">` shell and do not show the navbar.

### Styling & conventions
- Component lives in its own folder under `components/` with a barrel `index.ts`, following the existing component convention.
- Visual styling uses theme tokens declared in `app/globals.css` (e.g. `primary`, `error`, `body`, `heading`). Avoid raw hex values.
- Co-located CSS Module starts with the `@reference "../../app/globals.css";` directive. Per project conventions, do not stack more than one Tailwind utility directly on a template element — combine multiple utilities into a class via `@apply`.

## Figma Design Reference (only if referenced)
- File: n/a
- Component name: n/a
- Key visual constraints: n/a

## Possible Edge Cases
- User submits with empty email or empty password — submit is prevented by HTML `required` validation; the console log only fires for a valid (non-empty) submission.
- User submits with a malformed email — rely on the browser's built-in `type="email"` validation; do not add a custom error layer in this iteration.
- User toggles password visibility, then submits — the form must still capture the actual password value regardless of the input's current `type`.
- User toggles visibility, then begins typing — focus and caret position should not jump; the toggle should not clear the field.
- User navigates between `/login` and `/signup` via the switch link — fields reset between pages (no shared state); the destination page mounts a fresh form in its own variant.
- Browser autofill populates email/password — the form must read the autofilled values on submit, not only values the user typed manually.
- User submits the form by pressing Enter inside an input — behaves identically to clicking the submit button.
- Password manager extensions inject DOM into the password field — the visibility toggle button must remain clickable and not collide with injected icons (button is part of the same input wrapper, not overlaid arbitrarily).

## Acceptance Criteria
- Visiting `/login` shows a form with email + password inputs, a working "show / hide password" icon toggle, and a `Log in` submit button.
- Visiting `/signup` shows the same form structure with a `Sign up` submit button.
- Submitting either form prints a single console entry that includes the variant name and the entered email + password values, and performs no navigation or network call.
- The visibility toggle flips the password input between obscured and plain text and updates its icon and accessible label each time.
- Each form contains an in-form link that navigates to the other variant's route (`/login` ↔ `/signup`) without a full page reload.
- The login and signup pages render inside the public layout (no navbar).
- The shared form component is consumed by both pages via the standard `@/components/<Name>` barrel import, with no duplicated markup between the two pages.
- No new top-level dependencies are introduced (icon can be a small inline SVG or sourced from existing project assets); per CLAUDE.md, minimise project dependencies.
- The codebase still passes `npm run lint` and `npm test`.

## Open Questions
- What heading and supporting copy should appear above each form (e.g. "Welcome back" vs "Create your account")? Defaulting to plain `Log in` / `Sign up` headings unless told otherwise.
- Should the in-form switch link sit above the form, below the submit button, or both? Below the submit button.
- Should the password field enforce a minimum length on the signup variant for this iteration, or is built-in `required` enough? Enforce minimum 6 characters. Definitely pw is required in both forms.
- Should the icon for the visibility toggle come from an icon set already in the project, or a fresh inline SVG? If there is an appropreate existing icon, use it and write an inline SVG otherwise.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Renders the login variant on `/login`: email input, password input, visibility toggle, and a submit button labelled `Log in`.
- Renders the signup variant on `/signup`: same structure with a submit button labelled `Sign up`.
- The password input defaults to `type="password"`; clicking the visibility toggle flips it to `type="text"`, and clicking again flips it back. The accessible label of the toggle updates to match.
- Typing into email and password and submitting the login form calls `console.log` once with the variant label and the entered values; no navigation occurs.
- Submitting the signup form logs the signup variant label alongside the entered values.
- Empty submission does not produce a console.log (relies on `required` preventing submit).
- The in-form switch link on `/login` points to `/signup`, and the one on `/signup` points to `/login`.
