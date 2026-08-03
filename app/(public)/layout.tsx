"use client"

import AuthGuard from "@/components/AuthGuard"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="public">
      <AuthGuard
        when="unauthenticated"
        redirectTo="/heists"
        exemptPaths={["/"]}
      >
        {children}
      </AuthGuard>
    </main>
  )
}
