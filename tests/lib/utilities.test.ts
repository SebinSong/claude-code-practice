import { describe, it, expect } from "vitest"

// module imports
import { generateCodename, ADJECTIVES, COLORS, NOUNS } from "@/lib/utilities"

// Split a PascalCase codename back into its component words.
function splitPascal(value: string): string[] {
  return value.match(/[A-Z][a-z]+/g) ?? []
}

describe("generateCodename", () => {
  it("joins one word from each set in PascalCase order", () => {
    const codename = generateCodename()
    const parts = splitPascal(codename)

    expect(parts).toHaveLength(3)
    expect(ADJECTIVES).toContain(parts[0])
    expect(COLORS).toContain(parts[1])
    expect(NOUNS).toContain(parts[2])
  })

  it("only ever uses words from the defined sets across many calls", () => {
    for (let i = 0; i < 50; i++) {
      const [adjective, color, noun] = splitPascal(generateCodename())
      expect(ADJECTIVES).toContain(adjective)
      expect(COLORS).toContain(color)
      expect(NOUNS).toContain(noun)
    }
  })

  it("produces varied output (not constant)", () => {
    const results = new Set(
      Array.from({ length: 50 }, () => generateCodename()),
    )
    expect(results.size).toBeGreaterThan(1)
  })
})
