# Spec for Login Form Functionality

branch: claude/feature/login-form
figma_component (If used): N/A

## Summary
The login page at `app/(public)/login/` currently renders the shared `AuthForm` component in its "login" variant, but submitting the form only logs the entered credentials to the console — it never authenticates the user. This feature wires the login form up to Firebase Authentication so that submitting valid credentials signs the user in, shows a success message, and redirects them to `/heists`. Invalid credentials should surface a readable error instead, following the same pattern already used for signup.

## Functional Requirements
- Submitting the login form with a valid, registered email/password combination authenticates the user against Firebase Auth.
- On successful login, the user sees a success message confirming they've been logged in.
- After a successful login, the user is redirected to `/heists`.
- If authentication fails (e.g. wrong password, unknown email, malformed email), the form displays a readable, user-friendly error message instead of a raw Firebase error code, consistent with how signup errors are currently handled.
- While the login request is in flight, the submit button reflects a loading/submitting state (consistent with the existing signup submit button behaviour) and is disabled to prevent duplicate submissions.
- The email and password fields, validation, and "show/hide password" toggle already present in `AuthForm` remain unchanged.

## Possible Edge Cases
- Empty or malformed email/password (already prevented by existing required/type validation on the form fields).
- Correct email but wrong password.
- Email with no matching account.
- Too many failed login attempts in a short period (Firebase rate-limiting).
- User is already logged in and somehow lands on `/login` again.
- Network/connectivity failure during the login request.

## Acceptance Criteria
- Submitting the login form with correct credentials logs the user in via Firebase Auth.
- A success message is shown to the user immediately after a successful login.
- The user is redirected to `/heists` following a successful login.
- Submitting with incorrect or unrecognized credentials shows an inline error message and does not redirect.
- The submit button shows a loading state while the login request is pending and cannot be triggered multiple times concurrently.

## Open Questions
- Should the success message be shown briefly before redirecting, or is an immediate redirect (with the success message implied by landing on `/heists`) acceptable?
No need to show successful message. User profile will be implemented in the Navbar later
- Are there specific Firebase auth error codes (e.g. `auth/invalid-credential`, `auth/too-many-requests`) that need distinct copy, or is a single generic "invalid email or password" message sufficient for all login failures?
Just show that same copy

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Submitting valid credentials calls the Firebase sign-in flow and redirects to `/heists`.
- Submitting valid credentials shows a success message before/at the point of redirect.
- Submitting invalid credentials shows an error message and does not redirect.
- The submit button is disabled/shows a loading state while the login request is pending.
