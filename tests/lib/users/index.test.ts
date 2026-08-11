import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  withConverter: vi.fn(),
  getDocs: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  collection: mocks.collection,
  getDocs: mocks.getDocs,
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

// module imports
import { fetchAssignableUsers } from "@/lib/users"

function fakeDoc(id: string, codename: string) {
  return {
    data: () => ({ id, codename, createdAt: new Date(), lastLoggedIn: null }),
  }
}

describe("fetchAssignableUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.collection.mockReturnValue({ withConverter: mocks.withConverter })
    mocks.withConverter.mockReturnValue({ path: "users" })
  })

  it("queries the users collection", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] })

    await fetchAssignableUsers("uid-1")

    expect(mocks.collection).toHaveBeenCalledWith({}, "users")
  })

  it("excludes the given uid from the returned list", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [fakeDoc("uid-1", "SneakyFox"), fakeDoc("uid-2", "CraftyRaven")],
    })

    const result = await fetchAssignableUsers("uid-1")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("uid-2")
  })

  it("returns an empty array when only the current user exists", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [fakeDoc("uid-1", "SneakyFox")] })

    const result = await fetchAssignableUsers("uid-1")

    expect(result).toEqual([])
  })

  it("propagates a rejected getDocs call", async () => {
    mocks.getDocs.mockRejectedValue(new Error("network error"))

    await expect(fetchAssignableUsers("uid-1")).rejects.toThrow("network error")
  })
})
