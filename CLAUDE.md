# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server at http://localhost:3030
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next, core-web-vitals + typescript)
npm test         # Vitest in watch mode
```

Run a single test file or a single test name:

```bash
npx vitest run tests/components/Navbar.test.tsx
npx vitest run -t "renders the Create Heist link"
```

Vitest uses `globals: true` (so `describe`/`it`/`expect` are ambient — see `tsconfig.json` `"types": ["vitest/globals"]`) with the `jsdom` environment and `@testing-library/jest-dom` matchers loaded from `vitest.setup.ts`. The `@/*` path alias resolves in tests via `vite-tsconfig-paths` in `vitest.config.mts`.

## Architecture

### Route groups define the layout shell, not the URL
The App Router is split into two parenthesized route groups that each own their own `layout.tsx`. The group name does **not** appear in the URL — it only decides which shell wraps the page:

- `app/(public)/` — unauthenticated shell (`<main className="public">`). Holds `/` (splash), `/login`, `/signup`, `/preview`. The splash at `app/(public)/page.tsx` is intended to redirect logged-in users to `/heists` and others to `/login` (logic not wired yet).
- `app/(dashboard)/` — authenticated shell that mounts `<Navbar />` above `<main>`. Holds `/heists`, `/heists/create`, `/heists/[id]`.

When adding a new page, choose the group based on whether it needs the navbar/auth shell. Moving a route between groups changes its chrome without changing its URL.

### Tailwind v4 theme tokens auto-generate utilities
`app/globals.css` declares the design system inside an `@theme { ... }` block (Tailwind v4 syntax — there is no `tailwind.config.*`). Every `--color-*` token there is automatically exposed as a utility:

- `--color-primary: #C27AFF` → `text-primary`, `bg-primary`, `border-primary`, …
- Also defined: `secondary`, `dark`, `light`, `lighter`, `success`, `error`, `heading`, `body`, plus `--font-sans: 'Inter'`.

To add a brand color or font, extend the `@theme` block — do **not** create a `tailwind.config.js`. Use these theme utilities instead of raw hex values so accents stay on-brand.

### CSS Modules import theme tokens via `@reference`
Component-scoped styles live next to the component (e.g. `components/Navbar/Navbar.module.css`) and start with `@reference "../../app/globals.css";`. That directive lets the module's `@apply` reach the theme tokens declared in `globals.css` without re-importing Tailwind itself. New CSS modules must include the same `@reference` line (with the correct relative path) or `@apply` calls referencing theme utilities will fail to compile.

### Component folder convention
Each component is its own folder under `components/` with a barrel `index.ts` re-exporting the default. Tests mirror this structure under `tests/components/`. Import via the folder (`import Navbar from "@/components/Navbar"`), not the inner file.

### Path alias
`@/*` resolves to the project root (`tsconfig.json` → `paths`). It works in both Next.js builds and Vitest.

### Additional coding preferences

- Do NOT use semicolons for Javascript or TypeScript code.
- Do NOT apply tailwind classes directly in component templates unless essential or just 1 at most. If an element needs more than a single tailwind class, combine them to a custom class using the `@apply` directive.
- Use minimal proejct dependencies where possible.
- Use the `git switch -c` command to switch to new branches, not `git checkout`
