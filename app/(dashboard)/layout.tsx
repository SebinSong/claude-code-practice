"use client"

// components
import Navbar from "@/components/Navbar"
import AuthGuard from "@/components/AuthGuard"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthGuard when="authenticated" redirectTo="/login" appendRedirectParam>
      <Navbar />
      <main>{children}</main>
    </AuthGuard>
  )
}
