import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  usePathname: vi.fn(),
  useUser: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: mocks.usePathname,
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

// component imports
import AuthGuard from "@/components/AuthGuard"

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usePathname.mockReturnValue("/heists/create")
  })

  it("shows the loader and not the children while auth state is loading", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: true })
    render(
      <AuthGuard when="authenticated" redirectTo="/login">
        <p>protected content</p>
      </AuthGuard>,
    )

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText("protected content")).not.toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("renders children when the user matches an authenticated guard", () => {
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(
      <AuthGuard when="authenticated" redirectTo="/login">
        <p>protected content</p>
      </AuthGuard>,
    )

    expect(screen.getByText("protected content")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("renders children when there is no user for an unauthenticated guard", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    render(
      <AuthGuard when="unauthenticated" redirectTo="/heists">
        <p>public content</p>
      </AuthGuard>,
    )

    expect(screen.getByText("public content")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("redirects and withholds children when unauthorized", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    render(
      <AuthGuard when="authenticated" redirectTo="/login">
        <p>protected content</p>
      </AuthGuard>,
    )

    expect(screen.queryByText("protected content")).not.toBeInTheDocument()
    expect(mocks.push).toHaveBeenCalledWith("/login")
  })

  it("appends the current path as a ?redirect= param when configured", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    render(
      <AuthGuard when="authenticated" redirectTo="/login" appendRedirectParam>
        <p>protected content</p>
      </AuthGuard>,
    )

    expect(mocks.push).toHaveBeenCalledWith(
      "/login?redirect=%2Fheists%2Fcreate",
    )
  })

  it("renders children immediately for exempt paths, bypassing loading and redirect", () => {
    mocks.usePathname.mockReturnValue("/")
    mocks.useUser.mockReturnValue({ user: null, loading: true })
    render(
      <AuthGuard
        when="unauthenticated"
        redirectTo="/heists"
        exemptPaths={["/"]}
      >
        <p>splash content</p>
      </AuthGuard>,
    )

    expect(screen.getByText("splash content")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
