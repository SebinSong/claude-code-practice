"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/lib/auth/auth-context"
import PageLoader from "@/components/PageLoader"

type AuthGuardProps = {
  children: React.ReactNode
  when: "authenticated" | "unauthenticated"
  redirectTo: string
  appendRedirectParam?: boolean
  exemptPaths?: string[]
}

export default function AuthGuard({
  children,
  when,
  redirectTo,
  appendRedirectParam = false,
  exemptPaths = [],
}: AuthGuardProps) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const isExempt = exemptPaths.includes(pathname)
  const isAuthorized = when === "authenticated" ? Boolean(user) : !user
  const shouldRedirect = !loading && !isExempt && !isAuthorized

  useEffect(() => {
    if (!shouldRedirect) return
    const target = appendRedirectParam
      ? `${redirectTo}?redirect=${encodeURIComponent(pathname)}`
      : redirectTo
    router.push(target)
  }, [shouldRedirect, appendRedirectParam, redirectTo, pathname, router])

  if (isExempt) return <>{children}</>
  if (loading || !isAuthorized) return <PageLoader text="Loading..." />

  return <>{children}</>
}
