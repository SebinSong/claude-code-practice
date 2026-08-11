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
  // CreateHeistInput shape straight to addDoc.
  const docRef = await addDoc(collection(db, COLLECTIONS.HEISTS), input)
  return docRef.id
}
