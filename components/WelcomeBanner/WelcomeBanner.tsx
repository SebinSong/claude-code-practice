"use client"

import { useUser } from "@/lib/auth/auth-context"
import styles from "./WelcomeBanner.module.css"

export default function WelcomeBanner() {
  const { user, loading } = useUser()

  if (loading || !user || !user.displayName) return null

  return (
    <h2 className={styles.heading}>
      Welcome, <span className={styles.name}>{user.displayName}</span>
    </h2>
  )
}
