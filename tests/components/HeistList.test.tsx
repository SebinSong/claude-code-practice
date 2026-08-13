import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  useHeists: vi.fn(),
}))

vi.mock("@/lib/heists", () => ({
  useHeists: mocks.useHeists,
}))

// component imports
import HeistList from "@/components/HeistList"

describe("HeistList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a loading skeleton while heists are loading", () => {
    mocks.useHeists.mockReturnValue({ heists: [], loading: true })

    render(<HeistList mode="active" />)

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
  })

  it("renders the title of each returned heist once loaded", () => {
    mocks.useHeists.mockReturnValue({
      heists: [
        { id: "h1", title: "Steal the stapler" },
        { id: "h2", title: "Swap the decaf" },
      ],
      loading: false,
    })

    render(<HeistList mode="assigned" />)

    expect(screen.getByText("Steal the stapler")).toBeInTheDocument()
    expect(screen.getByText("Swap the decaf")).toBeInTheDocument()
    expect(
      screen.queryByRole("status", { name: /loading/i }),
    ).not.toBeInTheDocument()
  })
})
