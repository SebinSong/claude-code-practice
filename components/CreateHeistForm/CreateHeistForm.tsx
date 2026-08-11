"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { useUser } from "@/lib/auth/auth-context"
import { fetchAssignableUsers } from "@/lib/users"
import { createHeist } from "@/lib/heists"
import type { User } from "@/types/firestore"
import styles from "./CreateHeistForm.module.css"

export default function CreateHeistForm() {
  const { user } = useUser()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")

  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState("")

  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    setUsersLoading(true)
    setUsersError("")
    fetchAssignableUsers(user.uid)
      .then((list) => {
        if (!cancelled) setUsers(list)
      })
      .catch(() => {
        if (!cancelled) setUsersError("Couldn't load teammates.")
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return

    const assignee = users.find((u) => u.id === assignedTo)
    if (!assignee) return

    setError("")
    setSubmitting(true)
    try {
      await createHeist({
        title,
        description,
        createdBy: user.uid,
        createdByCodename: user.displayName ?? "",
        assignedTo: assignee.id,
        assignedToCodename: assignee.codename,
      })
      router.push("/heists")
    } catch (err) {
      console.error("Failed to create heist", err)
      setError("Couldn't create the heist. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!usersLoading && !usersError && users.length === 0) {
    return (
      <p className={styles.empty} role="status">
        No other agents available yet — invite a teammate before assigning a
        heist.
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          className={styles.input}
          type="text"
          required
          placeholder="Steal the last donut"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Description</span>
        <textarea
          className={styles.textarea}
          required
          rows={4}
          placeholder="Describe the mission..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Assignee</span>
        <div className="select-wrapper">
          <select
            className="select"
            required
            disabled={usersLoading || Boolean(usersError)}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="" disabled>
              {usersLoading ? "Loading teammates..." : "Select a teammate"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codename}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="select-chevron" aria-hidden />
        </div>
      </label>

      {(usersError || error) && (
        <p className={styles.error} role="alert">
          {usersError || error}
        </p>
      )}

      <button
        type="submit"
        className={`btn ${styles.submit}`}
        disabled={
          !title || !description || !assignedTo || usersLoading || submitting
        }
      >
        {submitting ? <span className="spinner" aria-hidden /> : "Launch Heist"}
      </button>
    </form>
  )
}
