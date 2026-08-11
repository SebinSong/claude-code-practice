import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { COLLECTIONS, userConverter, type User } from "@/types/firestore"

// Fetch every user profile except `excludeUid`, so a heist can never be
// assigned back to its own creator. Filtered client-side after a full
// collection read — the collection is expected to stay small, and Firestore
// can't cleanly express "id != excludeUid" as a query constraint here.
export async function fetchAssignableUsers(
  excludeUid: string,
): Promise<User[]> {
  const ref = collection(db, COLLECTIONS.USERS).withConverter(userConverter)
  const snapshot = await getDocs(ref)
  return snapshot.docs
    .map((doc) => doc.data())
    .filter((user) => user.id !== excludeUid)
}
