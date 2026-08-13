import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  useHeists: vi.fn(),
  useUser: vi.fn(),
}))

vi.mock("@/lib/heists", () => ({
  useHeists: mocks.useHeists,
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

// component imports
import HeistsPage from "@/app/(dashboard)/heists/page"

describe("HeistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-1", email: "thief@heist.io", displayName: "Thief" },
      loading: false,
    })
    mocks.useHeists.mockImplementation((mode: string) => {
      const byMode: Record<string, Array<{ id: string; title: string }>> = {
        active: [{ id: "a1", title: "Steal the stapler" }],
        assigned: [{ id: "s1", title: "Swap the decaf" }],
        expired: [{ id: "e1", title: "Recover the marker" }],
      }
      return { heists: byMode[mode] ?? [], loading: false }
    })
  })

  it("renders each section's titles under its matching heading, not the others", () => {
    render(<HeistsPage />)

    const active = screen.getByText("Your Active Heists").closest("div")!
    const assigned = screen.getByText("Heists You've Assigned").closest("div")!
    const expired = screen.getByText("All Expired Heists").closest("div")!

    expect(within(active).getByText("Steal the stapler")).toBeInTheDocument()
    expect(within(assigned).getByText("Swap the decaf")).toBeInTheDocument()
    expect(within(expired).getByText("Recover the marker")).toBeInTheDocument()

    expect(within(active).queryByText("Swap the decaf")).not.toBeInTheDocument()
    expect(
      within(active).queryByText("Recover the marker"),
    ).not.toBeInTheDocument()
    expect(
      within(assigned).queryByText("Steal the stapler"),
    ).not.toBeInTheDocument()
  })
})
