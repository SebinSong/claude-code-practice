# Create Heist Form — Implementation Plan

## Context

`app/(dashboard)/heists/create/page.tsx` is currently a static stub (just an `h2`). This plan implements the feature described in `_specs/create-heist-form.md`: a form where the signed-in user picks a teammate to assign a heist to (from the `users` Firestore collection, excluding themselves), enters a title and description, and submits. Submission writes a `heists` document (`CreateHeistInput` shape, `deadline` = 48h from submission, `createdBy`/`createdByCodename` from the current session) and redirects to `/heists`.

This is the first feature in the app to perform a Firestore **read** (`getDocs`) and the first to use `addDoc` — until now, `lib/auth/index.ts` only ever does `doc`/`setDoc`/`updateDoc` against a single known document path. It also introduces the first `<select>` dropdown in the codebase.

Resolved during planning (confirmed with user or decided for minimal scope):
- Assignee dropdown **excludes** the current user.
- Add a typed `types/firestore/user.ts` (mirrors `heist.ts`'s Document/CreateInput/UpdateInput/converter pattern).
- `createdBy`/`createdByCodename` come from `useUser()`, not a form field. Only Title, Description, Assignee are form fields.
- No arbitrary character-length validation — `required` only, consistent with the simplest reading of the spec's open question.
- Assignee dropdown is a plain `<select>` of codenames only (no per-option icon/avatar — native `<select>` can't render rich option content, and CLAUDE.md forbids adding a dropdown library for this).
- `lib/auth/index.ts` is left untouched (still writes untyped inline user objects) — adopting the new `User` type there is a separate follow-up, out of scope here.

## Files to add/change

### 1. `types/firestore/user.ts` (new)

Mirrors `types/firestore/heist.ts` exactly:

```ts
import { DocumentData, FieldValue, QueryDocumentSnapshot } from "firebase/firestore"

export interface User {
  id: string
  codename: string
  createdAt: Date
  lastLoggedIn: Date | null
}

export interface CreateUserInput {
  id: string
  codename: string
  createdAt: FieldValue // serverTimestamp()
}

export interface UpdateUserInput {
  codename?: string
  lastLoggedIn?: FieldValue // serverTimestamp()
}

export const userConverter = {
  toFirestore: (data: Partial<User>): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): User =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      lastLoggedIn: snapshot.data().lastLoggedIn?.toDate() ?? null,
    }) as User,
}
```

### 2. `types/firestore/index.ts` (edit)

```ts
export * from "./heist"
export * from "./user"

export const COLLECTIONS = {
  HEISTS: "heists",
  USERS: "users",
} as const
```

### 3. `lib/users/index.ts` (new)

```ts
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS, userConverter, type User } from "@/types/firestore"

// Fetch every user profile except `excludeUid`, so a heist can never be
// assigned back to its own creator. Filtered client-side after a full
// collection read — the collection is expected to stay small, and Firestore
// can't cleanly express "id != excludeUid" as a query constraint here.
export async function fetchAssignableUsers(excludeUid: string): Promise<User[]> {
  const ref = collection(db, COLLECTIONS.USERS).withConverter(userConverter)
  const snapshot = await getDocs(ref)
  return snapshot.docs.map((doc) => doc.data()).filter((user) => user.id !== excludeUid)
}
```

### 4. `lib/heists/index.ts` (new)

```ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS, type CreateHeistInput } from "@/types/firestore"

export const HEIST_WINDOW_HOURS = 48

// Pure function so tests can assert the math deterministically.
export function computeDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + HEIST_WINDOW_HOURS * 60 * 60 * 1000)
}

type CreateHeistParams = {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
}

// Errors propagate to the caller (unlike lib/auth's best-effort writes) —
// the form needs to see and surface a failed write.
export async function createHeist(params: CreateHeistParams): Promise<string> {
  const input: CreateHeistInput = {
    ...params,
    createdAt: serverTimestamp(),
    deadline: computeDeadline(),
    finalStatus: null,
  }
  // Not using heistConverter here: its toFirestore is typed against
  // Partial<Heist> (createdAt: Date), which doesn't accept the FieldValue
  // sentinel from serverTimestamp(). Converters in this codebase are for
  // read-side Timestamp -> Date conversion; writes pass the plain
  // CreateHeistInput shape straight to addDoc — same as this pre-existing
  // gap in heist.ts, not something new introduced here.
  const docRef = await addDoc(collection(db, COLLECTIONS.HEISTS), input)
  return docRef.id
}
```

### 5. `components/CreateHeistForm/` (new folder)

- `CreateHeistForm.tsx`
- `CreateHeistForm.module.css`
- `index.ts` — `export { default } from "./CreateHeistForm"`

Structural pattern mirrors `components/AuthForm/AuthForm.tsx`: per-field `useState`, one `error`/`submitting` pair, async `handleSubmit` with try/catch/finally, `<span className="spinner" aria-hidden />` swapped in for the button label while submitting, error as `<p role="alert">`, submit `disabled={!title || !description || !assignedTo || usersLoading || submitting}`.

Additional state for this form: `users`/`usersLoading`/`usersError`, fetched via `fetchAssignableUsers(user.uid)` in a `useEffect` keyed on `user` (guarded against firing before `useUser()` resolves, and against setting state after unmount).

Behavior:
- While `usersLoading`, the `<select>` shows a disabled "Loading teammates..." placeholder option; submit stays disabled.
- If `fetchAssignableUsers` rejects, show a `role="alert"` error, keep the rest of the form usable (title/description still fillable) but the select disabled/empty — submit stays disabled since no assignee can be chosen.
- If the fetch succeeds but returns an empty list (no other users exist yet), render a short message in place of the form ("No other agents available yet — invite a teammate before assigning a heist.") per the spec's explicit edge case.
- On submit: call `createHeist({...})` with `createdBy`/`createdByCodename` from `useUser()` and `assignedTo`/`assignedToCodename` resolved from the selected `<option>`'s value (uid) looked up in the fetched `users` list (not the raw codename string) — this is how codename collisions stay safe (resolves to uid, not string match).
- On success: `router.push("/heists")`.
- On failure: `console.error` + `role="alert"` error message, no redirect, submitting cleared so the user can retry without losing entered values.

`CreateHeistForm.module.css` starts with `@reference "../../app/globals.css";`, reuses the global `.btn`/`.spinner` classes, and defines `.form`/`.field`/`.label`/`.input`/`.textarea`/`.select`/`.error`/`.empty`/`.submit` — same shape as `AuthForm.module.css`, each rule a single `@apply` block (no raw utility stacking on JSX per CLAUDE.md).

### 6. `app/(dashboard)/heists/create/page.tsx` (edit)

Stays a **server component** — no `"use client"` needed at the page level; interactivity is fully contained in `CreateHeistForm`.

```tsx
import CreateHeistForm from "@/components/CreateHeistForm"

export default function CreateHeistPage() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h2 className="form-title">Create a New Heist</h2>
        <CreateHeistForm />
      </div>
    </div>
  )
}
```

### 7. `firestore.rules` (edit — required for the feature to actually function)

Current rules only allow a user to read their **own** `/users/{userId}` doc, and have **no rule at all for `/heists`** (default-deny). Without a change, `fetchAssignableUsers` would be denied for every other user's doc, and `createHeist`'s `addDoc` would always fail with `permission-denied` against real/emulated Firestore — even though mocked unit tests would still pass. Updating:

```
rules_version = '2'

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /heists/{heistId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
    }
  }
}
```

`read` on `/users` is opened to any authenticated user (needed to list teammates); `write` stays restricted to one's own doc. `/heists` allows any authenticated user to read, and to create only if the document's own `createdBy` matches their uid (prevents spoofing another user as the creator). No `update`/`delete` rule is added — not needed by this feature, defaults to deny.

## Test plan

### `tests/lib/users/index.test.ts` (new)
Mock `firebase/firestore`'s `collection`/`getDocs`/`withConverter` and `@/lib/firebase`'s `db`, following the `vi.hoisted` pattern in `tests/lib/auth/index.test.ts`.
- Calls `collection(db, "users")`.
- Excludes the given uid from the returned list.
- Returns `[]` when the collection has only the current user.
- Propagates a rejected `getDocs`.

### `tests/lib/heists/index.test.ts` (new)
- `computeDeadline(from)` returns exactly 48h after `from` (deterministic, no fake timers).
- `createHeist(...)` calls `addDoc` on `collection(db, "heists")` with a payload containing `createdAt` as the mocked `serverTimestamp()` sentinel, `finalStatus: null`, and all passed-through fields.
- `deadline` in the write payload is ~48h after "now" (tolerance check).
- Resolves with the new doc id.
- Propagates a rejected `addDoc`.

### `tests/components/CreateHeistForm.test.tsx` (new)
Mock the `lib/*` module boundary (`@/lib/auth/auth-context`'s `useUser`, `@/lib/users`'s `fetchAssignableUsers`, `@/lib/heists`'s `createHeist`) and `next/navigation`'s `useRouter`, matching `tests/components/AuthForm.test.tsx`'s style.
- Renders title, description, and assignee `<select>` once the user list resolves.
- `fetchAssignableUsers` is called with the current user's uid; the select is populated with the returned codenames.
- Submit is disabled until title, description, and assignee are all filled, and while the user list is loading.
- Submitting a valid form calls `createHeist` with the exact expected payload, then `router.push("/heists")`.
- Shows the spinner and disables submit while the write is in flight.
- A failed write shows a `role="alert"` error and does not redirect.
- A failed user-list fetch shows an error without crashing the form.
- An empty user list (fetch resolves `[]`) renders the "no other agents" message instead of the form.

## Verification

1. `npm run lint` and `npx tsc --noEmit` — must pass clean.
2. `npm test` (or `npx vitest run`) — new suites plus full existing suite must pass.
3. Manual check with `npm run dev`: sign in as one user, confirm the assignee dropdown lists other existing users (excluding self) or shows the empty-state message if none exist; submit and confirm redirect to `/heists`; verify the new document in the Firestore console/emulator matches `CreateHeistInput` field-for-field.
4. If a local Firestore emulator is configured, confirm `firestore.rules` changes don't break existing signup/login tests (`tests/lib/auth/*`) and do allow the new read/write paths — deploy rules only after explicit confirmation, per this session's git-safety norms around shared infrastructure changes.
