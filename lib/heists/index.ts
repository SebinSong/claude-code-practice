import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore"
import { useEffect, useState } from "react"
import { useUser } from "@/lib/auth/auth-context"
import { db } from "@/lib/firebase"
import {
  COLLECTIONS,
  heistConverter,
  type CreateHeistInput,
  type Heist,
} from "@/types/firestore"

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
  // CreateHeistInput shape straight to addDoc.
  const docRef = await addDoc(collection(db, COLLECTIONS.HEISTS), input)
  return docRef.id
}

export type HeistsMode = "active" | "assigned" | "expired"

// Any heists read requires an authenticated caller (see firestore.rules),
// so every mode — including "expired", which isn't scoped to the current
// user — waits for a signed-in user before subscribing.
export function useHeists(mode: HeistsMode): {
  heists: Heist[]
  loading: boolean
} {
  const { user } = useUser()
  const uid = user?.uid ?? null
  const [heists, setHeists] = useState<Heist[]>([])
  // Tracks the mode/uid pair the current `heists` snapshot was loaded for,
  // so "loading" can be derived at render time (mode/uid changed but no
  // snapshot has arrived for it yet) instead of set imperatively.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const currentKey = `${mode}:${uid}`

  useEffect(() => {
    if (!uid) return

    // Computed once per mode/user change (this effect only reruns then),
    // not per render or snapshot delivery, so the deadline boundary
    // doesn't drift while a subscription is live.
    const now = Timestamp.fromDate(new Date())

    const heistsRef = collection(db, COLLECTIONS.HEISTS).withConverter(
      heistConverter,
    )
    const heistsQuery =
      mode === "active"
        ? query(
            heistsRef,
            where("assignedTo", "==", uid),
            where("deadline", ">", now),
            orderBy("deadline", "asc"),
          )
        : mode === "assigned"
          ? query(
              heistsRef,
              where("createdBy", "==", uid),
              where("deadline", ">", now),
              orderBy("deadline", "asc"),
            )
          : query(
              heistsRef,
              where("finalStatus", "in", ["success", "failure"]),
              where("deadline", "<=", now),
              orderBy("deadline", "desc"),
            )

    const unsubscribe = onSnapshot(heistsQuery, (snapshot) => {
      // heistConverter.toFirestore is typed against Partial<Heist> (see
      // createHeist above), which makes TS infer the collection's model
      // type as Partial<Heist> too — but fromFirestore always returns a
      // full Heist at runtime, so this cast is safe.
      setHeists(snapshot.docs.map((doc) => doc.data()) as Heist[])
      setLoadedKey(currentKey)
    })

    return unsubscribe
  }, [mode, uid, currentKey])

  if (!uid) return { heists: [], loading: false }

  return { heists, loading: loadedKey !== currentKey }
}
