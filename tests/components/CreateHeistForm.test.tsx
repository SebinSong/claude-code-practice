import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useUser: vi.fn(),
  fetchAssignableUsers: vi.fn(),
  createHeist: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock("@/lib/auth/auth-context", () => ({
  useUser: mocks.useUser,
}))

vi.mock("@/lib/users", () => ({
  fetchAssignableUsers: mocks.fetchAssignableUsers,
}))

vi.mock("@/lib/heists", () => ({
  createHeist: mocks.createHeist,
}))

// component imports
import CreateHeistForm from "@/components/CreateHeistForm"

const teammates = [
  {
    id: "uid-2",
    codename: "CraftyRaven",
    createdAt: new Date(),
    lastLoggedIn: null,
  },
  {
    id: "uid-3",
    codename: "SlyViper",
    createdAt: new Date(),
    lastLoggedIn: null,
  },
]

describe("CreateHeistForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useUser.mockReturnValue({
      user: { uid: "uid-1", email: "a@b.com", displayName: "SneakyFox" },
      loading: false,
    })
    mocks.fetchAssignableUsers.mockResolvedValue(teammates)
    mocks.createHeist.mockResolvedValue("heist-1")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders title, description, and assignee fields once the user list resolves", async () => {
    render(<CreateHeistForm />)

    expect(
      await screen.findByRole("textbox", { name: /title/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: /description/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: /assignee/i }),
    ).toBeInTheDocument()
  })

  it("fetches assignable users excluding the current user and lists their codenames", async () => {
    render(<CreateHeistForm />)

    await waitFor(() =>
      expect(mocks.fetchAssignableUsers).toHaveBeenCalledWith("uid-1"),
    )
    expect(
      await screen.findByRole("option", { name: "CraftyRaven" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "SlyViper" })).toBeInTheDocument()
  })

  it("keeps submit disabled until title, description, and assignee are all filled", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)

    const submitButton = await screen.findByRole("button", {
      name: /launch heist/i,
    })
    expect(submitButton).toBeDisabled()

    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Steal the donut",
    )
    expect(submitButton).toBeDisabled()

    await user.type(
      screen.getByRole("textbox", { name: /description/i }),
      "Sneak into the break room.",
    )
    expect(submitButton).toBeDisabled()

    await user.selectOptions(
      screen.getByRole("combobox", { name: /assignee/i }),
      "uid-2",
    )
    expect(submitButton).toBeEnabled()
  })

  it("keeps submit disabled while the assignee list is still loading", async () => {
    let resolveUsers: (value: typeof teammates) => void = () => {}
    mocks.fetchAssignableUsers.mockReturnValue(
      new Promise((resolve) => {
        resolveUsers = resolve
      }),
    )
    render(<CreateHeistForm />)

    expect(screen.getByRole("button", { name: /launch heist/i })).toBeDisabled()

    resolveUsers(teammates)
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /assignee/i })).toBeEnabled(),
    )
  })

  it("submits the expected payload and redirects to /heists on success", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)

    await user.type(
      await screen.findByRole("textbox", { name: /title/i }),
      "Steal the donut",
    )
    await user.type(
      screen.getByRole("textbox", { name: /description/i }),
      "Sneak into the break room.",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: /assignee/i }),
      "uid-2",
    )
    await user.click(screen.getByRole("button", { name: /launch heist/i }))

    expect(mocks.createHeist).toHaveBeenCalledWith({
      title: "Steal the donut",
      description: "Sneak into the break room.",
      createdBy: "uid-1",
      createdByCodename: "SneakyFox",
      assignedTo: "uid-2",
      assignedToCodename: "CraftyRaven",
    })
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/heists"))
  })

  it("shows a loading spinner and disables submit while the write is in flight", async () => {
    const user = userEvent.setup()
    let resolveCreate: (value: string) => void = () => {}
    mocks.createHeist.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    render(<CreateHeistForm />)

    await user.type(
      await screen.findByRole("textbox", { name: /title/i }),
      "Steal the donut",
    )
    await user.type(
      screen.getByRole("textbox", { name: /description/i }),
      "Sneak into the break room.",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: /assignee/i }),
      "uid-2",
    )
    const submitButton = screen.getByRole("button", { name: /launch heist/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: /launch heist/i }),
    ).not.toBeInTheDocument()

    resolveCreate("heist-1")
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/heists"))
  })

  it("shows an error and does not redirect when the write fails", async () => {
    const user = userEvent.setup()
    mocks.createHeist.mockRejectedValue(new Error("permission-denied"))
    render(<CreateHeistForm />)

    await user.type(
      await screen.findByRole("textbox", { name: /title/i }),
      "Steal the donut",
    )
    await user.type(
      screen.getByRole("textbox", { name: /description/i }),
      "Sneak into the break room.",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: /assignee/i }),
      "uid-2",
    )
    await user.click(screen.getByRole("button", { name: /launch heist/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't create the heist/i,
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("shows an error without crashing when the user-list fetch fails", async () => {
    mocks.fetchAssignableUsers.mockRejectedValue(new Error("network error"))
    render(<CreateHeistForm />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't load teammates/i,
    )
    expect(screen.getByRole("textbox", { name: /title/i })).toBeInTheDocument()
  })

  it("renders an empty-state message when there are no other users", async () => {
    mocks.fetchAssignableUsers.mockResolvedValue([])
    render(<CreateHeistForm />)

    expect(await screen.findByRole("status")).toHaveTextContent(
      /no other agents/i,
    )
    expect(
      screen.queryByRole("textbox", { name: /title/i }),
    ).not.toBeInTheDocument()
  })
})
