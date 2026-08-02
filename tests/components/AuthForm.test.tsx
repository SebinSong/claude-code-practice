import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signUpWithCodename: vi.fn(),
  signInUser: vi.fn(),
  authErrorMessage: vi.fn((_err: unknown, variant?: string) =>
    variant === "login"
      ? "Invalid email or password. Please try again."
      : "An account with this email already exists.",
  ),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock("@/lib/auth", () => ({
  signUpWithCodename: mocks.signUpWithCodename,
  signInUser: mocks.signInUser,
  authErrorMessage: mocks.authErrorMessage,
}))

// component imports
import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signUpWithCodename.mockResolvedValue({})
    mocks.signInUser.mockResolvedValue({ user: { uid: "uid-123" } })
  })

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

  it("logs in and redirects to /heists on success", async () => {
    const user = userEvent.setup()
    render(<AuthForm variant="login" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "thief@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(mocks.signInUser).toHaveBeenCalledTimes(1)
    expect(mocks.signInUser).toHaveBeenCalledWith("thief@heist.io", "secret123")
    expect(mocks.push).toHaveBeenCalledWith("/heists")
    // Login must not trigger the Firebase signup flow.
    expect(mocks.signUpWithCodename).not.toHaveBeenCalled()
  })

  it("shows the generic error and does not redirect when login fails", async () => {
    const user = userEvent.setup()
    mocks.signInUser.mockRejectedValue({ code: "auth/invalid-credential" })
    render(<AuthForm variant="login" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "thief@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "wrongpass")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("shows a loading spinner while the login request is pending", async () => {
    const user = userEvent.setup()
    let resolveSignIn: (value: unknown) => void = () => {}
    mocks.signInUser.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve
      }),
    )
    render(<AuthForm variant="login" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "thief@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    const submitButton = screen.getByRole("button", { name: /log in/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: /log in/i }),
    ).not.toBeInTheDocument()

    resolveSignIn({ user: { uid: "uid-123" } })
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/heists"))
  })

  it("signs up and redirects to /heists on success", async () => {
    const user = userEvent.setup()
    render(<AuthForm variant="signup" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "new@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(mocks.signUpWithCodename).toHaveBeenCalledTimes(1)
    expect(mocks.signUpWithCodename).toHaveBeenCalledWith(
      "new@heist.io",
      "secret123",
    )
    expect(mocks.push).toHaveBeenCalledWith("/heists")
  })

  it("shows an error and does not redirect when signup fails", async () => {
    const user = userEvent.setup()
    mocks.signUpWithCodename.mockRejectedValue({
      code: "auth/email-already-in-use",
    })
    render(<AuthForm variant="signup" />)

    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "taken@heist.io",
    )
    await user.type(screen.getByLabelText(/^password$/i), "secret123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists/i,
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("does not submit when the form is empty", async () => {
    const user = userEvent.setup()
    render(<AuthForm variant="login" />)

    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(mocks.signInUser).not.toHaveBeenCalled()
    expect(mocks.signUpWithCodename).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
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
