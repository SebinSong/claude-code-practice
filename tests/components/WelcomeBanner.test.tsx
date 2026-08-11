import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

// component imports
import WelcomeBanner from "@/components/WelcomeBanner"

describe("WelcomeBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a welcome heading with the codename", () => {
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-123", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    render(<WelcomeBanner />)

    expect(
      screen.getByRole("heading", { name: /welcome, thief/i }),
    ).toBeInTheDocument()
  })

  it("renders nothing while the user is loading", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: true })
    const { container } = render(<WelcomeBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when there is no user", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })
    const { container } = render(<WelcomeBanner />)

    expect(container).toBeEmptyDOMElement()
  })
})
