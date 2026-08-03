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
import PublicLayout from "@/app/(public)/layout"

describe("(public) layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usePathname.mockReturnValue("/login")
  })

  it("shows the loader and not the children while auth state is loading", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: true })
    render(
      <PublicLayout>
        <p>login form</p>
      </PublicLayout>,
    )

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText("login form")).not.toBeInTheDocument()
  })

  it("redirects authenticated users to /heists instead of rendering the page", () => {
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(
      <PublicLayout>
        <p>login form</p>
      </PublicLayout>,
    )

    expect(screen.queryByText("login form")).not.toBeInTheDocument()
    expect(mocks.push).toHaveBeenCalledWith("/heists")
  })

  it("renders the page for unauthenticated users", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    render(
      <PublicLayout>
        <p>login form</p>
      </PublicLayout>,
    )

    expect(screen.getByText("login form")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("renders the splash page for authenticated users without redirecting", () => {
    mocks.usePathname.mockReturnValue("/")
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(
      <PublicLayout>
        <p>splash content</p>
      </PublicLayout>,
    )

    expect(screen.getByText("splash content")).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
