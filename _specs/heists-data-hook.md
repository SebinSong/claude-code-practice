# Sepc for heists-data-hook

branch: claude/feature/heists-data-hook
figma_component (If used): N/A

## Summary
Introduce a `useHeists` React hook that subscribes to real-time updates from the `heists` Firestore collection and returns an array of heist objects filtered and scoped according to a required mode argument. Wire the hook into `/heists` so the page renders the titles of each of the three result sets (active, assigned, expired) for the currently signed-in user.

## Functional Requirements
- Add a `useHeists` hook that accepts a single required argument identifying which result set to subscribe to: `"active"`, `"assigned"`, or `"expired"`.
- The hook subscribes to real-time Firestore updates (not a one-off fetch) so the returned data stays in sync as documents change, and cleans up its subscription when the consuming component unmounts or the argument changes.
- The hook returns an array of heist objects shaped per the existing `Heist` type, converted from Firestore documents the same way other reads in the app already convert timestamps to `Date`.
- `"active"` mode returns heists where the current signed-in user is the assignee (`assignedTo` matches the current user's id) and the `deadline` has not yet passed.
- `"assigned"` mode returns heists where the current signed-in user is the creator (`createdBy` matches the current user's id) and the `deadline` has not yet passed.
- `"expired"` mode returns heists where the `deadline` has passed AND `finalStatus` is not null, regardless of who created or was assigned the heist (not scoped to the current user).
- The hook determines "current user" the same way the rest of the app does (the existing auth context), and should not query Firestore for a given mode while there is no signed-in user.
- Filtering and sorting appropriate to each mode is done via the Firestore query itself (not by fetching everything and filtering in memory), consistent with how other data access in this codebase is structured.
- Update `app/(dashboard)/heists/page.tsx` to use `useHeists` three times (once per mode) and render only the `title` of each heist in the corresponding result set, replacing the current static placeholder headings' empty state with the real titles beneath them.

## Figma Design Reference (only if referenced)
- N/A

## Possible Edge Cases
- No signed-in user yet (auth still resolving): hook should not error and should return an empty/loading state rather than querying with an invalid user id.
- A result set with zero matching heists: page should render the section heading with no titles, not an error or placeholder text.
- A heist whose `deadline` has passed but `finalStatus` is still null: must NOT appear in `"expired"` (per spec, expired requires a non-null `finalStatus`), and must also not appear in `"active"`/`"assigned"` once its deadline has passed.
- A heist where the current user is both `createdBy` and `assignedTo` (self-assigned): should appear in both `"active"` and `"assigned"` result sets independently, since each mode is queried independently.
- Switching the hook's argument (e.g. a future component re-rendering with a different mode) should tear down the previous subscription and start a new one, not leak listeners.
- Firestore composite index requirements: filtering on two fields (e.g. `assignedTo` + `deadline`, or `deadline` + `finalStatus`) plus any ordering may require a composite index; this should be identified during implementation.

## Acceptance Criteria
- `useHeists("active")`, `useHeists("assigned")`, and `useHeists("expired")` each return only heists matching that mode's rules, and update live when the underlying Firestore data changes.
- `/heists` displays the titles of the current user's active heists, the heists they've assigned, and all expired heists (app-wide), each under their existing respective section heading.
- No regressions to the existing `WelcomeBanner` rendering or overall page structure on `/heists`.

## Open Questions
- Should `"expired"` also require the deadline check to use the same "now" reference consistently across all three modes (e.g. computed once vs. compared against `Timestamp.now()` per query)? Computed once is preferred
- Should there be an explicit loading state per section, or is an empty list during loading acceptable given the page already has a separate loading gate via `WelcomeBanner`/auth? Yes. Implement skeleton loading UI in each section.

## Testing Guidelines
Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- `useHeists("active")` returns only non-expired heists assigned to the current user.
- `useHeists("assigned")` returns only non-expired heists created by the current user.
- `useHeists("expired")` returns only heists past their deadline with a non-null `finalStatus`, regardless of user.
- The `/heists` page renders the titles returned by each of the three hook calls in their respective sections.
