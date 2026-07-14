// Heist-themed word sets for generating user codenames. Words are authored in
// PascalCase so generated codenames need no extra casing. Edit freely.
export const ADJECTIVES = [
  "Sneaky",
  "Silent",
  "Shadow",
  "Crafty",
  "Nimble",
  "Sly",
  "Phantom",
  "Rogue",
  "Cunning",
  "Daring",
] as const

export const COLORS = [
  "Velvet",
  "Midnight",
  "Golden",
  "Crimson",
  "Onyx",
  "Silver",
  "Cobalt",
  "Amber",
  "Jade",
  "Scarlet",
] as const

export const NOUNS = [
  "Falcon",
  "Bandit",
  "Fox",
  "Raven",
  "Viper",
  "Lynx",
  "Jackal",
  "Mantis",
  "Cobra",
  "Wolf",
] as const

function pick<T>(words: readonly T[]): T {
  return words[Math.floor(Math.random() * words.length)]
}

// Join one word from each set, in fixed order, into a PascalCase codename
// e.g. "SneakyVelvetFalcon". Not guaranteed unique (best-effort randomness).
export function generateCodename(): string {
  return `${pick(ADJECTIVES)}${pick(COLORS)}${pick(NOUNS)}`
}
