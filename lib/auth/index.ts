import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
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

// Sign in with an existing account. Errors propagate to the caller.
export async function signInUser(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)

  // The user is already signed in at this point, so don't fail the login if
  // this write errors — just log it for now.
  try {
    await updateDoc(doc(db, "users", user.uid), {
      lastLoggedIn: serverTimestamp(),
    })
  } catch (error) {
    console.error("Failed to update lastLoggedIn", error)
  }

  return { user }
}

// End the current session. Errors propagate to the caller.
export async function signOutUser() {
  await signOut(auth)
}

const ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
}

const LOGIN_ERROR_MESSAGE = "Invalid email or password. Please try again."

// Map Firebase auth error codes to readable copy, with a generic fallback.
// Login always shows one generic message regardless of the error code.
export function authErrorMessage(
  error: unknown,
  variant: "signup" | "login" = "signup",
): string {
  if (variant === "login") {
    return LOGIN_ERROR_MESSAGE
  }

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : ""
  return ERROR_MESSAGES[code] ?? "Something went wrong. Please try again."
}
