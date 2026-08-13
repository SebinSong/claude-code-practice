# Heists Data Hook — Implementation Plan

## Context

Implements `_specs/heists-data-hook.md`: a `useHeists(mode)` hook that subscribes to real-time Firestore updates for the `heists` collection, filtered by `"active" | "assigned" | "expired"`, and wires it into `/heists` so each of the three sections shows the matching heist titles instead of being empty.

This is the first real-time listener (`onSnapshot`) and first compound `query`/`where` usage anywhere in the codebase — `lib/heists/index.ts` currently only does a plain `addDoc`. Key discovery from `firestore.rules`:

```
match /heists/{heistId} {
  allow read: if request.auth != null;
  ...
}
```

Every read of `heists` — including the app-wide `expired` query — requires `request.auth != null`. This resolves the spec's open question about whether `expired` can query before auth resolves: it can't, because the security rules would reject it. All three modes must wait for a signed-in user before subscribing. In practice this is moot on `/heists` itself, since `app/(dashboard)/layout.tsx` already wraps the page in `<AuthGuard when="authenticated">`, which doesn't render `children` until `useUser()` resolves to a non-null user — but `useHeists` is a general-purpose hook and must handle the no-user case defensively regardless of caller.

## Files to add/change

### 1. `lib/heists/index.ts` (edit — add `useHeists` alongside existing `computeDeadline`/`createHeist`)

Stays a plain module, no `"use client"` directive — same as today; the hook renders no JSX and isn't a Provider, so the client boundary is established by its consumer (`HeistList`), consistent with how `createHeist` is already only ever called from a `"use client"` component (`CreateHeistForm`).

Signature: `useHeists(mode: "active" | "assigned" | "expired"): { heists: Heist[]; loading: boolean }`

Logic:
- Reads `const { user } = useUser()` from `@/lib/auth/auth-context`.
- If there's no signed-in `user`, don't build or subscribe any query — return `{ heists: [], loading: false }`.
- Otherwise builds a query against `collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)` (reuse the existing converter so `onSnapshot` deliveries already arrive as `Heist[]` with `Date` fields, no hand-rolled conversion) and calls `onSnapshot`.
- "Now" is computed once per hook instance (confirmed by user: "computed once is preferred") via `useMemo(() => Timestamp.fromDate(new Date()), [mode])` — recomputed only when `mode` changes, not on every render or snapshot delivery.
- Per-mode `where`/`orderBy` clauses:
  - `"active"`: `where("assignedTo", "==", uid)`, `where("deadline", ">", nowTimestamp)`, `orderBy("deadline", "asc")`
  - `"assigned"`: `where("createdBy", "==", uid)`, `where("deadline", ">", nowTimestamp)`, `orderBy("deadline", "asc")`
  - `"expired"`: `where("finalStatus", "in", ["success", "failure"])`, `where("deadline", "<=", nowTimestamp)`, `orderBy("deadline", "desc")` — no uid filter (app-wide, per spec)
  - `"expired"` uses `where("finalStatus", "in", [...])` rather than `!= null`: `in` is an equality-family filter that composes cleanly with the single `deadline` range filter and needs only a standard composite index; `!=` is itself an inequality operator, so pairing it with the `deadline` range filter on a different field needs Firestore's multi-inequality support and would also silently exclude any doc missing the field. `in` against the known `HeistFinalStatus` union is simpler and exhaustive.
- `loading` starts `true` per hook instance and flips to `false` on the first `onSnapshot` delivery. Because each `HeistList` renders its own `useHeists` call, each section's loading state is naturally independent — no shared/coordinated loading state needed.
- Effect tears down the previous `onSnapshot` subscription (calling its `unsubscribe`) and re-subscribes whenever `mode` or `user?.uid` changes; cleanup on unmount always unsubscribes.

### 2. `components/HeistList/` (new folder — `HeistList.tsx`, `HeistList.module.css`, `index.ts`)

A `"use client"` component, following the standard folder/barrel convention. Mirrors the `WelcomeBanner` precedent: `page.tsx` stays a server component for layout, and this component owns the hook call.

- Props: `{ mode: "active" | "assigned" | "expired" }`
- Calls `const { heists, loading } = useHeists(mode)`
- While `loading`: renders a small skeleton — 2–3 pulsing bars reusing the same visual language already established in `components/Skeleton/Skeleton.module.css` (`bg-lighter` blocks + `@keyframes pulse` opacity animation, 1.5s ease-in-out infinite), defined locally in `HeistList.module.css` rather than by extending `components/Skeleton/` — that component is a fixed profile-card shape (avatar + header/body lines) and retrofitting it with a variant prop for an unrelated list-row shape isn't justified for a single use site. If a second list-skeleton need comes up later, generalize then.
- Otherwise: renders a `<ul>` of `<li key={heist.id}>{heist.title}</li>`. Empty result set renders an empty `<ul>` (no explicit "no heists" copy — not required by the spec, keep scope tight).

### 3. `app/(dashboard)/heists/page.tsx` (edit)

Stays a server component. Add `<HeistList mode="active" />`, `<HeistList mode="assigned" />`, `<HeistList mode="expired" />` under their respective existing `<h2>` headings in `.active-heists` / `.assigned-heists` / `.expired-heists`. No other structural changes.

### 4. `firestore.indexes.json` (edit — flagged as required, not optional)

Currently `{"indexes": [], "fieldOverrides": []}`. The compound queries need composite indexes:
- `heists`: `assignedTo` (ASC) + `deadline` (ASC) — for `active`
- `heists`: `createdBy` (ASC) + `deadline` (ASC) — for `assigned`
- `heists`: `finalStatus` (ASC) + `deadline` (DESC) — for `expired`

These will be hand-authored into `firestore.indexes.json` during implementation and deployed via `firebase deploy --only firestore:indexes` as a manual follow-up step (not run automatically) — verify against the actual `permission-denied`/`failed-precondition` console error when first exercising each query in dev, since exact field ordering requirements are easiest to confirm against Firestore's own generated index suggestion.

## Test plan
- N/A