"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"

type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
}

type AuthState = {
  user: AuthUser | null
  loading: boolean
}

// Trim the Firebase user down to the app-specific fields we actually use.
function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return { uid: user.uid, email: user.email, displayName: user.displayName }
}

// Sentinel `undefined` lets useUser detect being called outside the provider.
const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    // Single app-wide listener: fires on sign-in/out and token refresh.
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setState({ user: toAuthUser(nextUser), loading: false })
    })
    return unsubscribe
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useUser(): AuthState {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error("useUser must be used within an AuthProvider")
  }
  return ctx
}
