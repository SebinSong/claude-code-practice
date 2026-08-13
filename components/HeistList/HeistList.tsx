"use client"

import { useHeists, type HeistsMode } from "@/lib/heists"
import styles from "./HeistList.module.css"

interface HeistListProps {
  mode: HeistsMode
}

export default function HeistList({ mode }: HeistListProps) {
  const { heists, loading } = useHeists(mode)

  if (loading) {
    return (
      <div className={`${styles.skeleton} mb-6`} role="status" aria-label="Loading">
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </div>
    )
  }

  return (
    <ul className="mb-6">
      {heists.map((heist) => (
        <li className="mb-1" key={heist.id}>{heist.title}</li>
      ))}
    </ul>
  )
}
