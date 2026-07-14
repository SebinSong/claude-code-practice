import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { generateCodename } from "@/lib/utilities"

// Create an account, assign a generated codename as the displayName, and persist
// a profile doc at users/{uid} holding codename/id/createdAt (never the email).
export async function signUpWithCodename(email: string, password: string) {
  // Errors here (e.g. email already in use) propagate to the caller.
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  const codename = generateCodename()

  // The account already exists at this point, so don't fail the signup if the
  // profile/Firestore writes error — just log it for now.
  try {
    await updateProfile(user, { displayName: codename })
    await setDoc(doc(db, "users", user.uid), {
      codename,
      id: user.uid,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Failed to write user profile after signup", error)
  }

  return { user, codename }
}

const ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
}

// Map Firebase auth error codes to readable copy, with a generic fallback.
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : ""
  return ERROR_MESSAGES[code] ?? "Something went wrong. Please try again."
}
