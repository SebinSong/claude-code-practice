"use client"

import { Clock8, LogOut as LogOutIcon, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signOutUser } from "@/lib/auth"
import { useUser } from "@/lib/auth/auth-context"
import styles from "./Navbar.module.css"

export default function Navbar() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOutUser()
      router.push("/login")
    } catch (err) {
      console.error("Failed to log out", err)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          <h1>
            <Link href="/heists">
              P<Clock8 className={styles.logo} size={14} strokeWidth={2.75} />
              cket Heist
            </Link>
          </h1>
          <div>Tiny missions. Big office mischief.</div>
        </header>
        <ul>
          <li>
            <Link href="/heists/create" className={styles.createBtn}>
              <Plus size={16} strokeWidth={2.5} />
              Create Heist
            </Link>
          </li>
          {!loading && user && (
            <li>
              <button
                type="button"
                className={`btn secondary ${styles.logoutBtn}`}
                disabled={loggingOut}
                onClick={handleLogout}
              >
                {loggingOut ? (
                  <span className="spinner" aria-hidden />
                ) : (
                  <>
                    <LogOutIcon size={16} strokeWidth={2.5} />
                    Log out
                  </>
                )}
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  )
}
