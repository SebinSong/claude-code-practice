# Spec for Account Avatar

branch: claude/feature/account-avatar
figma_component (If used): N/A

## Summary
Give the signed-in user a visible identity in the app chrome. The `Navbar` gains a decorative avatar + display name for the logged-in user (codename, sourced from Firebase Auth's `displayName`), and the `/heists` page gains a styled "Welcome, {displayName}" heading instead of the current plain section headings alone.

## Functional Requirements
- In `Navbar`, when a user is logged in, render an avatar element alongside their display name (codename).
  - The avatar is decorative only — not a link, not a button, no click handler, no hover affordance implying interactivity.
  - Choose an appropriate icon (e.g. a person/agent-style icon from the existing `lucide-react` dependency) to represent the avatar, consistent with the app's "secret agent / heist" theme.
  - The display name shown is the current user's codename (`useUser().user.displayName`).
  - Placement: alongside the existing nav items (e.g. near the logout button), without disrupting the existing "Create Heist" / "Log out" controls.
- On `/heists` (`app/(dashboard)/heists/page.tsx`), add a heading that reads "Welcome, {displayName}" using the current user's codename.
  - This heading should have distinct, deliberate visual styling (not plain unstyled text) that fits the app's existing visual language (see `app/globals.css` theme tokens, and the existing `.tagline` gradient-text treatment on the splash page as a reference point for the kind of "fancy" treatment already established in this codebase).
  - Should read naturally while the user's profile is loading (i.e. don't flash "Welcome, null" or similar before the user resolves).

## Figma Design Reference (only if referenced)
N/A

## Possible Edge Cases
- User's `displayName` is briefly `null` while auth state is still resolving (`useUser().loading`) — avatar/name and welcome heading should not render broken/placeholder text during this window.
- Very long codenames should not break the navbar layout or the heists page heading on smaller viewports.
- Logged-out state (should not apply — both the navbar avatar and `/heists` page only render for authenticated users in the existing dashboard shell, but the avatar block specifically must still guard on `user` being present, matching the existing conditional pattern used for the logout button).

## Acceptance Criteria
- Logged-in users see a decorative avatar icon plus their codename in the navbar; there is no clickable/interactive behavior on the avatar itself.
- The `/heists` page displays a "Welcome, {codename}" heading with distinct visual styling (e.g. gradient/accent treatment, weight/scale that stands out), not plain default text.
- No regressions to existing navbar controls (Create Heist link, Log out button) or existing `/heists` section headings.
- No new dependencies added — icon comes from `lucide-react` (already in use).

## Open Questions
- None — scope is decorative UI only for both the navbar avatar and the heists welcome heading; no interactivity, no new data fetching (both rely on the already-available `useUser()` context).

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Navbar renders the avatar and the logged-in user's codename when a user is present.
- Navbar does not render the avatar block when there is no logged-in user (or while auth is still loading).
- `/heists` page renders "Welcome, {codename}" using the current user's codename.
- `/heists` page does not render a broken/placeholder welcome message while the user is still loading.
