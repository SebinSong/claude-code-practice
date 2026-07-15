# Sepc for logout-navbar-button

branch: claude/feature/logout-navbar-button
figma_component (If used): N/A

## Summary
Add a logout button to the `Navbar` component so signed-in users can end their session. The button calls Firebase Auth's sign-out flow, is only rendered when a user is currently logged in, and uses a new "secondary" button style (transparent background, `--color-secondary` accents, distinct hover/focus states). Redirect to /login page after successful logout and update the global `useUser` auth state to reflect the signed-out state.

## Functional Requirements
- Render a "Log out" button inside `Navbar.tsx`, visible only when `useUser()` reports a logged-in user (not visible while `loading` is true or when `user` is `null`).
- Clicking the button calls Firebase's sign-out function (e.g. `signOut(auth)`) to end the session.
- Redirect to /login page is triggered after successful signout. The page relying on the auth state (e.g. `Navbar` itself, or any consumer of `useUser`) should re-render to reflect the signed-out state.
- Add a new `signOut` (or similarly named) function to `lib/auth/index.ts`, following the existing pattern used by `signUpWithCodename`.
- Introduce a new shared button style class named `secondary`:
  - Transparent background by default.
  - Uses the `--color-secondary` CSS variable for text/border color.
  - Shows a visually distinct state on hover and focus (e.g. background tint or color shift using `--color-secondary`). hover/focus can share the same style.
  - Should live alongside the existing `.btn` base class conventions already defined in `app/globals.css`, so it can be composed the same way other button variants are (e.g. `` `btn ${styles.secondary}` ``).

## Figma Design Reference (only if referenced)
- N/A — no Figma reference for this feature.

## Possible Edge Cases
- Auth state is still loading (`useUser().loading === true`): button must not flash into view before disappearing.
- User is not logged in: button must not render at all.
- Sign-out call fails (e.g. network error): should not crash the Navbar; failure can be logged for now since no error UI is in scope.
- Rapid double-clicks on the logout button while the sign-out request is in flight.

## Acceptance Criteria
- Logged-out users never see the logout button in the Navbar.
- Logged-in users see the logout button in the Navbar.
- Clicking the logout button successfully signs the user out via Firebase Auth, and the Navbar re-renders without the logout button once `useUser()` reflects the signed-out state.
- A new `.secondary` button class exists with a transparent background and `--color-secondary`-based styling, including distinct hover and focus states.
- No redirect logic is introduced as part of this feature.

## Open Questions
- Should the logout button show any loading/disabled state while the sign-out request is in flight, or is a plain click sufficient for this iteration?
Yes. Refer to AuthForm.tsx to implement spinner UI on the button. Move the relevant
css to the global.css if you need.
- Should sign-out errors surface any feedback to the user, or is silent console logging acceptable (consistent with the existing profile-write error handling in `signUpWithCodename`)? Just console log out for now. (Will create/use toast UI for this later on)

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Navbar does not render a logout button when there is no logged-in user.
- Navbar renders a logout button when a user is logged in.
- Clicking the logout button calls the Firebase sign-out function.
- The new `signOut` (or equivalent) function in `lib/auth/index.ts` calls Firebase's sign-out API as expected.
