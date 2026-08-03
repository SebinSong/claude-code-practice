import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import PageLoader from "@/components/PageLoader"

describe("PageLoader", () => {
  it("renders an accessible loading status", () => {
    render(<PageLoader text="Loading..." />)

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
  })
})
