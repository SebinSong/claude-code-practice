# Spec for Create Heist Form

branch: claude/feature/create-heist-form
figma_component (If used): none

## Summary

Build out the `/heists/create` page (`app/(dashboard)/heists/create/page.tsx`), currently a static stub, into a working form for launching a new heist. The signed-in user picks a target teammate to assign the heist to via a dropdown sourced from the `users` Firestore collection, gives it a title and description, and submits. The heist's creator is always the currently authenticated user, not a form selection. Submission creates a new document in the `heists` collection following the existing `CreateHeistInput` shape (`types/firestore/heist.ts`) — including a deadline computed as 48 hours from creation — and then redirects the user to `/heists`.

This is a dashboard-only feature: the page already sits behind the `(dashboard)` route group's auth protection, so the submitting user is always an authenticated `useUser()` user.

## Functional Requirements

- Replace the current stub content of `app/(dashboard)/heists/create/page.tsx` with a real form.
- The form collects:
  - **Title** — required, single-line text.
  - **Description** — required, multi-line text.
  - **Assignee** — required dropdown selection of one teammate, sourced by querying the `users` Firestore collection and presenting their codenames.
- On submit, create a new document in the `heists` collection populating every field of the existing `CreateHeistInput` shape:
  - `createdAt` — Firestore `serverTimestamp()`.
  - `title`, `description` — from the form.
  - `createdBy` / `createdByCodename` — the uid and codename of the currently authenticated user (`useUser()`), not a form field.
  - `assignedTo` / `assignedToCodename` — the uid and codename of the user selected in the "Assignee" dropdown.
  - `deadline` — computed client-side as 48 hours from the moment of submission.
  - `finalStatus` — `null`.
- Reuse the existing Firestore client (`lib/firebase.ts`) and the `heistConverter` / `COLLECTIONS` pattern already established in `types/firestore/`. Extend `COLLECTIONS` with a `USERS` entry rather than hardcoding the `"users"` string.
- On successful creation, redirect the user to `/heists`.
- While the assignee list is loading, and while the form is submitting, reflect a loading state consistent with the existing pattern used in `AuthForm` (disabled submit button + spinner).
- Surface a readable error if fetching the assignee list fails, or if the heist document write fails — without crashing the page.
- Follow existing project conventions: component/page styling via a co-located CSS module with the `@reference` directive, no raw Tailwind utility stacking, no semicolons, minimal new dependencies.

## Figma Design Reference (only if referenced)

- Not applicable — no Figma reference for this feature.

## Possible Edge Cases

- No other users exist yet in the `users` collection (fresh app/testing data) — nothing to assign the heist to. In this case, show a message saying no other user exists instead of the form.

- The current user is the only entry returned from the `users` query.

- Fetching the `users` collection fails (network/Firestore error) — the assignee dropdown must degrade gracefully rather than leave the form silently broken.
- The current user selects themselves as the assignee (self-assigned heist).
- Heist document write fails after a valid submission (e.g. network drop) — user should not be redirected, and should be able to retry without losing their entered title/description/selection.
- Double submit / rapid repeated clicks on the submit button while a write is already in flight.
- User navigates away from the page before the write completes.
- Very long title or description text — no explicit length limit currently defined.
- Two users share the same codename (codenames are only best-effort unique per the signup spec) — the assignee dropdown must resolve the selection to the correct uid, not just a matching codename string.
- Clock skew between client and server when computing the 48-hour `deadline` relative to `createdAt` (`serverTimestamp()`).

## Acceptance Criteria

- Visiting `/heists/create` while authenticated renders a form with title, description, and an "Assignee" dropdown populated from the `users` collection.
- The submit control is disabled until title, description, and an "Assignee" selection are all provided, and while the user list is still loading.
- Submitting a valid form creates a document in the `heists` collection matching the `CreateHeistInput` shape, with `deadline` set to 48 hours after the submission time and `finalStatus` set to `null`.
- After a successful submission, the user is redirected to `/heists`.
- A failed user-list fetch or a failed heist write shows a readable error message and does not redirect the user.
- The submit button shows a loading/disabled state while the write is in progress, preventing duplicate submissions.
- `npm run lint` and `npm test` continue to pass.

## Open Questions

- Can a user assign a heist to themselves, or must the assignee differ from the creator? 
They can only be aissgned to different users.

- Should the assignee dropdown exclude the current user, or list every user in the collection? Yes.

- Is there any character limit expected on title/description, or is `required` alone sufficient validation for this iteration?
Choose whatever you like but ensure they aren't too short.

- Should `types/firestore/user.ts` (a typed `User` interface + Firestore converter, mirroring `heist.ts`) be introduced as part of this spec, given user documents are currently untyped inline objects in `lib/auth/index.ts`? Yes

- Is the 48-hour deadline window fixed for all heists in this iteration, or should the form ever allow customizing it? Always fix it.

- Should the assignee dropdown show anything beyond the codename (e.g. a distinguishing icon or "you" label), or is a plain list of codenames sufficient? Icon would be great.

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- The create-heist form renders title, description, and assignee fields, with the submit button disabled until all required fields are filled.
- The assignee selector is populated from a mocked `users` collection query, showing codenames.
- Submitting a valid form (Firestore mocked) creates a `heists` document with the correct `createdBy`/`createdByCodename`, `assignedTo`/`assignedToCodename`, `finalStatus: null`, and a `deadline` roughly 48 hours after submission.
- A successful submission redirects to `/heists`.
- A failed heist-document write surfaces a readable error and does not redirect.
- A failed assignee-list fetch surfaces a readable error instead of leaving the form in a broken/empty state.
