import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  usePathname: vi.fn(),
  useUser: vi.fn(),
  signOutUser: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: mocks.usePathname,
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

vi.mock("@/lib/auth", () => ({
  signOutUser: mocks.signOutUser,
}))

// component imports
import DashboardLayout from "@/app/(dashboard)/layout"

describe("(dashboard) layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usePathname.mockReturnValue("/heists")
  })

  it("shows the loader and withholds Navbar and children while auth state is loading", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: true })
    render(
      <DashboardLayout>
        <p>heists list</p>
      </DashboardLayout>,
    )

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByText("heists list")).not.toBeInTheDocument()
  })

  it("redirects to /login with the current path when unauthenticated", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    render(
      <DashboardLayout>
        <p>heists list</p>
      </DashboardLayout>,
    )

    expect(screen.queryByText("heists list")).not.toBeInTheDocument()
    expect(mocks.push).toHaveBeenCalledWith("/login?redirect=%2Fheists")
  })

  it("renders Navbar and children when authenticated", () => {
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(
      <DashboardLayout>
        <p>heists list</p>
      </DashboardLayout>,
    )

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getByText("heists list")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
