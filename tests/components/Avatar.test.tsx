import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import Avatar from "@/components/Avatar"

describe("Avatar", () => {
  it("renders the first letter of a single-word name", () => {
    render(<Avatar name="Alice" />)

    const avatar = screen.getByRole("img", { name: /alice/i })
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveTextContent("A")
  })

  it("renders the first two uppercase letters of a PascalCase name", () => {
    render(<Avatar name="JohnDoe" />)

    const avatar = screen.getByRole("img", { name: /johndoe/i })
    expect(avatar).toHaveTextContent("JD")
  })

  it("uppercases the initial of a lowercase single-word name", () => {
    render(<Avatar name="alice" />)

    const avatar = screen.getByRole("img", { name: /alice/i })
    expect(avatar).toHaveTextContent("A")
  })
})
