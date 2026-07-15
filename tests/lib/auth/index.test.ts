import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  setDoc: vi.fn(),
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join("/") })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}))

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: mocks.createUser,
  updateProfile: mocks.updateProfile,
  signOut: mocks.signOut,
}))

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  setDoc: mocks.setDoc,
  serverTimestamp: mocks.serverTimestamp,
}))

vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }))

// module imports
import { signUpWithCodename, signOutUser, authErrorMessage } from "@/lib/auth"

describe("signUpWithCodename", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createUser.mockResolvedValue({ user: { uid: "uid-123" } })
    mocks.updateProfile.mockResolvedValue(undefined)
    mocks.setDoc.mockResolvedValue(undefined)
  })

  it("creates the account, sets the displayName, and writes a profile doc", async () => {
    await signUpWithCodename("thief@heist.io", "secret123")

    expect(mocks.createUser).toHaveBeenCalledWith(
      {},
      "thief@heist.io",
      "secret123",
    )

    // Codename used for the displayName must match the one persisted.
    const displayName = mocks.updateProfile.mock.calls[0][1].displayName
    expect(displayName).toBeTruthy()

    const payload = mocks.setDoc.mock.calls[0][1]
    expect(payload.codename).toBe(displayName)
    expect(payload.id).toBe("uid-123")
    expect(payload.createdAt).toBe("SERVER_TIMESTAMP")
  })

  it("writes the users doc keyed by uid and never stores the email", async () => {
    await signUpWithCodename("thief@heist.io", "secret123")

    expect(mocks.doc).toHaveBeenCalledWith({}, "users", "uid-123")

    const payload = mocks.setDoc.mock.calls[0][1]
    expect(payload).not.toHaveProperty("email")
    expect(Object.keys(payload).sort()).toEqual(["codename", "createdAt", "id"])
  })

  it("rejects and never writes a doc when account creation fails", async () => {
    mocks.createUser.mockRejectedValue({ code: "auth/email-already-in-use" })

    await expect(
      signUpWithCodename("taken@heist.io", "secret123"),
    ).rejects.toMatchObject({ code: "auth/email-already-in-use" })

    expect(mocks.setDoc).not.toHaveBeenCalled()
  })
})

describe("signOutUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls firebase signOut", async () => {
    mocks.signOut.mockResolvedValue(undefined)

    await signOutUser()

    expect(mocks.signOut).toHaveBeenCalledWith({})
  })

  it("propagates errors to the caller", async () => {
    mocks.signOut.mockRejectedValue(new Error("network error"))

    await expect(signOutUser()).rejects.toThrow("network error")
  })
})

describe("authErrorMessage", () => {
  it("maps known firebase error codes to readable copy", () => {
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toMatch(
      /already exists/i,
    )
    expect(authErrorMessage({ code: "auth/invalid-email" })).toMatch(
      /valid email/i,
    )
    expect(authErrorMessage({ code: "auth/weak-password" })).toMatch(/weak/i)
  })

  it("falls back to a generic message for unknown errors", () => {
    expect(authErrorMessage(new Error("boom"))).toMatch(/something went wrong/i)
    expect(authErrorMessage(null)).toMatch(/something went wrong/i)
  })
})
