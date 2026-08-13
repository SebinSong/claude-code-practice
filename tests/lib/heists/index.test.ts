import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  withConverter: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
  orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  onSnapshot: vi.fn(),
  timestampFromDate: vi.fn((date: Date) => ({ __timestamp: date })),
  unsubscribe: vi.fn(),
  capturedCallback: null as ((snapshot: unknown) => void) | null,
  useUser: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  serverTimestamp: mocks.serverTimestamp,
  query: mocks.query,
  where: mocks.where,
  orderBy: mocks.orderBy,
  onSnapshot: mocks.onSnapshot,
  Timestamp: { fromDate: mocks.timestampFromDate },
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/lib/auth/auth-context", () => ({ useUser: mocks.useUser }))

// module imports
import {
  createHeist,
  computeDeadline,
  HEIST_WINDOW_HOURS,
  useHeists,
} from "@/lib/heists"

describe("computeDeadline", () => {
  it("returns exactly 48 hours after the given date", () => {
    const from = new Date("2026-01-01T00:00:00Z")
    const deadline = computeDeadline(from)

    expect(deadline).toEqual(new Date("2026-01-03T00:00:00Z"))
    expect(HEIST_WINDOW_HOURS).toBe(48)
  })
})

describe("createHeist", () => {
  const params = {
    title: "Steal the last donut",
    description: "Sneak into the break room before noon.",
    createdBy: "uid-1",
    createdByCodename: "SneakyFox",
    assignedTo: "uid-2",
    assignedToCodename: "CraftyRaven",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.collection.mockReturnValue({ path: "heists" })
    mocks.addDoc.mockResolvedValue({ id: "heist-1" })
  })

  it("writes a heist doc with the expected shape", async () => {
    await createHeist(params)

    expect(mocks.collection).toHaveBeenCalledWith({}, "heists")
    const payload = mocks.addDoc.mock.calls[0][1]
    expect(payload).toMatchObject({
      ...params,
      createdAt: "SERVER_TIMESTAMP",
      finalStatus: null,
    })
  })

  it("computes a deadline roughly 48 hours from now", async () => {
    const before = Date.now()
    await createHeist(params)
    const after = Date.now()

    const payload = mocks.addDoc.mock.calls[0][1]
    const deadline = (payload.deadline as Date).getTime()
    expect(deadline).toBeGreaterThanOrEqual(before + 48 * 60 * 60 * 1000)
    expect(deadline).toBeLessThanOrEqual(after + 48 * 60 * 60 * 1000)
  })

  it("resolves with the new document id", async () => {
    await expect(createHeist(params)).resolves.toBe("heist-1")
  })

  it("propagates a rejected addDoc call", async () => {
    mocks.addDoc.mockRejectedValue(new Error("permission-denied"))

    await expect(createHeist(params)).rejects.toThrow("permission-denied")
  })
})

describe("useHeists", () => {
  const uid = "uid-1"

  function fakeSnapshot(heists: Array<{ id: string; title: string }>) {
    return { docs: heists.map((heist) => ({ data: () => heist })) }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.capturedCallback = null
    mocks.collection.mockReturnValue({ withConverter: mocks.withConverter })
    mocks.withConverter.mockReturnValue({ path: "heists" })
    mocks.onSnapshot.mockImplementation((_query, callback) => {
      mocks.capturedCallback = callback
      return mocks.unsubscribe
    })
    mocks.useUser.mockReturnValue({
      user: { uid, email: null, displayName: null },
      loading: false,
    })
  })

  it("queries heists assigned to the current user with an upcoming deadline for mode='active'", () => {
    renderHook(() => useHeists("active"))

    expect(mocks.where).toHaveBeenCalledWith("assignedTo", "==", uid)
    expect(mocks.where).toHaveBeenCalledWith("deadline", ">", expect.anything())
  })

  it("queries heists created by the current user with an upcoming deadline for mode='assigned'", () => {
    renderHook(() => useHeists("assigned"))

    expect(mocks.where).toHaveBeenCalledWith("createdBy", "==", uid)
    expect(mocks.where).toHaveBeenCalledWith("deadline", ">", expect.anything())
  })

  it("queries all heists past their deadline with a resolved status for mode='expired', app-wide", () => {
    renderHook(() => useHeists("expired"))

    expect(mocks.where).toHaveBeenCalledWith("finalStatus", "in", [
      "success",
      "failure",
    ])
    expect(mocks.where).toHaveBeenCalledWith(
      "deadline",
      "<=",
      expect.anything(),
    )
    expect(mocks.where).not.toHaveBeenCalledWith(
      "assignedTo",
      "==",
      expect.anything(),
    )
    expect(mocks.where).not.toHaveBeenCalledWith(
      "createdBy",
      "==",
      expect.anything(),
    )
  })

  it("updates heists and flips loading to false once the snapshot resolves", () => {
    const { result } = renderHook(() => useHeists("active"))

    expect(result.current.loading).toBe(true)

    act(() => {
      mocks.capturedCallback!(
        fakeSnapshot([{ id: "h1", title: "Steal the stapler" }]),
      )
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.heists).toEqual([
      { id: "h1", title: "Steal the stapler" },
    ])
  })

  it("does not query Firestore and settles immediately when there is no signed-in user, even for mode='expired'", () => {
    mocks.useUser.mockReturnValue({ user: null, loading: false })

    const { result } = renderHook(() => useHeists("expired"))

    expect(mocks.onSnapshot).not.toHaveBeenCalled()
    expect(result.current).toEqual({ heists: [], loading: false })
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useHeists("active"))

    unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
