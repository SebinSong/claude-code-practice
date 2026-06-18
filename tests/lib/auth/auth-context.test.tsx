import { render, renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted above imports, so shared mock state must be hoisted too.
const mocks = vi.hoisted(() => ({
  capturedCallback: null as ((user: unknown) => void) | null,
  unsubscribe: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    mocks.capturedCallback = cb
    return mocks.unsubscribe
  }),
}))

// Stub the app's firebase module so no real Firebase app initializes in jsdom.
vi.mock("@/lib/firebase", () => ({ auth: {} }))

// module imports
import { AuthProvider, useUser } from "@/lib/auth/auth-context"
import { onAuthStateChanged } from "firebase/auth"

// Mimic a Firebase User with extra fields to prove the provider trims it down.
const fakeUser = {
  uid: "u1",
  email: "thief@heist.io",
  displayName: "Cat Burglar",
  photoURL: "https://example.com/avatar.png",
  emailVerified: true,
}

const expectedUser = {
  uid: "u1",
  email: "thief@heist.io",
  displayName: "Cat Burglar",
}

describe("useUser / AuthProvider", () => {
  beforeEach(() => {
    mocks.capturedCallback = null
    vi.clearAllMocks()
  })

  it("starts in a loading state with no user before the first emission", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it("reports logged out once the listener emits null", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    act(() => mocks.capturedCallback!(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("exposes a trimmed user when the listener emits one", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    act(() => mocks.capturedCallback!(fakeUser))

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(expectedUser)
  })

  it("reacts to auth state transitions null -> user -> null", () => {
    const { result } = renderHook(() => useUser(), { wrapper: AuthProvider })

    act(() => mocks.capturedCallback!(null))
    expect(result.current.user).toBeNull()

    act(() => mocks.capturedCallback!(fakeUser))
    expect(result.current.user).toEqual(expectedUser)

    act(() => mocks.capturedCallback!(null))
    expect(result.current.user).toBeNull()
  })

  it("subscribes once and unsubscribes on unmount", () => {
    const { unmount } = render(
      <AuthProvider>
        <div />
      </AuthProvider>,
    )

    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)

    unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("throws when useUser is used outside an AuthProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => renderHook(() => useUser())).toThrow(/within an AuthProvider/)

    errorSpy.mockRestore()
  })
})
