"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { signUpWithCodename, authErrorMessage } from "@/lib/auth"
import styles from "./AuthForm.module.css"

type AuthVariant = "login" | "signup"

type AuthFormProps = {
  variant: AuthVariant
}

const VARIANT_CONFIG = {
  login: {
    submitLabel: "Log in",
    consoleLabel: "login submit",
    passwordAutoComplete: "current-password",
    passwordMinLength: undefined,
    switchHref: "/signup",
    switchPrompt: "Don't have an account?",
    switchCta: "Sign up",
  },
  signup: {
    submitLabel: "Sign up",
    consoleLabel: "signup submit",
    passwordAutoComplete: "new-password",
    passwordMinLength: 6,
    switchHref: "/login",
    switchPrompt: "Already have an account?",
    switchCta: "Log in",
  },
} as const

export default function AuthForm({ variant }: AuthFormProps) {
  const config = VARIANT_CONFIG[variant]
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (variant !== "signup") {
      // Login wiring is out of scope — keep the existing placeholder behaviour.
      console.log(config.consoleLabel, { email, password })
      return
    }

    setError("")
    setSubmitting(true)
    try {
      const res = await signUpWithCodename(email, password)
      console.log("signup success", res)
      router.push("/heists")
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          required
          placeholder="Enter your email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <div className={styles.passwordField}>
          <input
            className={`${styles.input} ${styles.passwordInput}`}
            type={showPassword ? "text" : "password"}
            required
            placeholder="Enter your password"
            minLength={config.passwordMinLength}
            autoComplete={config.passwordAutoComplete}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className={styles.toggle}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className={`btn ${styles.submit}`}
        disabled={!email || !password || submitting}
      >
        {submitting ? (
          <span className="spinner" aria-hidden />
        ) : (
          config.submitLabel
        )}
      </button>

      <p className={styles.switchRow}>
        {config.switchPrompt}{" "}
        <Link className={styles.switchLink} href={config.switchHref}>
          {config.switchCta}
        </Link>
      </p>
    </form>
  )
}
