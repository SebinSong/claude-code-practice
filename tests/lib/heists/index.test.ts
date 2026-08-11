import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted, so shared mock fns are declared via vi.hoisted.
const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}))

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  serverTimestamp: mocks.serverTimestamp,
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

// module imports
import { createHeist, computeDeadline, HEIST_WINDOW_HOURS } from "@/lib/heists"

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
