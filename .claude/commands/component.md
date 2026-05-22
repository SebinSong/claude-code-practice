---
description: Create a UI component using TDD (test-driven development)
allowed-tools: Read, Write, Edit, Glob, Bash(npm test:*), Bash(npm vitest:*)
argument-hint: "[Brief component description]"
---

## User Input

The user has provided information about the component to make: **$ARGUMENTS**

## Do This First:

From the component information above, determine a PascalCase component name (e.g, "a card showing user stats" -> `UserStatsCard`)

## 1. Write Tests First
Create `tests/components/[ComponentName].test.tsx` with 2-3 simple tests:
- Test that the component renders
- Test key elements are present (role, text)

Pattern:
```tsx
import { render, screen } from  "@testing-library/react"
import { describe, it, expect } from "vitest"
import ComponentName from "@/components/ComponentName"

describe("ComponentName", () => {
  it("render successfully", () => {
    render(<ComponentName>)
    // assertions
  })
})
```

## 2. Run tests (expect failure)
```bash
npm test tests/components/[ComponentName].test.tsx
```

## 3. Create Component
- `components/[ComponentName]/[ComponentName].tsx`
- `components/[ComponentName]/[ComponentName].module.css`
- `components/[ComponentName]/index.ts` -> `export { default } from './[ComponentName]'`

Conventions: no semicolons, CSS Modules, theme colors from global.css when needed

## 4. Run Tests (expect pass)
```bash
npm test tests/components/[ComponentName].test.tsx
```

Iterate on component development until all tests pass.

## 5. Add to preview page
Update `app/(public)/preview/page.tsx` with a labeled section showing the component.

## Rules
- keep tests minimal
- Only proceed when current step passes
