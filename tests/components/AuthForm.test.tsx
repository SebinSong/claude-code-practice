import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the login variant structure", () => {
    render(<AuthForm variant="login" />)

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "type",
      "password",
    )
    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("renders the signup variant structure", () => {
    render(<AuthForm variant="signup" />)

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "type",
      "password",
    )
    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
  })

  it("toggles password visibility and updates the accessible label", async () => {
    const user = userEvent.setup()
    render(<AuthForm variant="login" />)

    const password = screen.getByLabelText(/^password$/i)
    expect(password).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: /show password/i }))
    expect(password).toHaveAttribute("type", "text")
    expect(
      screen.getByRole("button", { name: /hide password/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /hide password/i }))
    expect(password).toHaveAttribute("type", "password")
    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeInTheDocument()
  })

  it("logs the login payload once on submit", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm variant="login" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "thief@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith("login submit", {
      email: "thief@heist.io",
      password: "secret123",
    })
  })

  it("logs the signup payload with the signup label", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm variant="signup" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "new@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith("signup submit", {
      email: "new@heist.io",
      password: "secret123",
    })
  })

  it("does not log when the form is submitted empty", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm variant="login" />)

    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(logSpy).not.toHaveBeenCalled()
  })

  it("links to the opposite route from each variant", () => {
    const { unmount } = render(<AuthForm variant="login" />)
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup",
    )
    unmount()

    render(<AuthForm variant="signup" />)
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    )
  })
})
