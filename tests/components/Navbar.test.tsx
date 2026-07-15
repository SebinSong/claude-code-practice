import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useUser: vi.fn(),
  signOutUser: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

vi.mock("@/lib/auth", () => ({
  signOutUser: mocks.signOutUser,
}))

// component imports
import Navbar from "@/components/Navbar"

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useUser.mockReturnValue({ user: null, loading: false })
  })

  it("renders the main heading", () => {
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create Heist link", () => {
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })

  it("does not render the logout button when logged out", () => {
    render(<Navbar />)

    expect(
      screen.queryByRole("button", { name: /log out/i }),
    ).not.toBeInTheDocument()
  })

  it("renders the logout button when logged in", () => {
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(<Navbar />)

    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })

  it("signs out and redirects to /login on click", async () => {
    const user = userEvent.setup()
    mocks.signOutUser.mockResolvedValue(undefined)
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(<Navbar />)

    await user.click(screen.getByRole("button", { name: /log out/i }))

    expect(mocks.signOutUser).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith("/login")
  })
})
