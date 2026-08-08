"use client"

import { useEffect, useState } from "react"
import styles from "./HeistCountdown.module.css"

const HEIST_WINDOW_SECONDS = 48 * 60 * 60

function segment(value: number) {
  return String(value).padStart(2, "0")
}

export default function HeistCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(HEIST_WINDOW_SECONDS)

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? HEIST_WINDOW_SECONDS : prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const seconds = secondsLeft % 60

  return (
    <div
      className={styles.clock}
      role="img"
      aria-label="Standard heist window: 48 hours"
    >
      <span className={styles.clockLabel}>Standard heist window</span>
      <div className={styles.readout} aria-hidden>
        <span className={styles.digits}>{segment(hours)}</span>
        <span className={styles.colon}>:</span>
        <span className={styles.digits}>{segment(minutes)}</span>
        <span className={styles.colon}>:</span>
        <span className={styles.digits}>{segment(seconds)}</span>
      </div>
      <div className={styles.unitsRow} aria-hidden>
        <span>Hrs</span>
        <span>Min</span>
        <span>Sec</span>
      </div>
    </div>
  )
}
