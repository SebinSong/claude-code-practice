# Pocket Heist

A **Next.js 16** starter project for the Claude Code Masterclass — a playful app concept ("Tiny missions. Big office mischief.") for creating and managing "heists" (small office missions/tasks).

## Stack & Tooling
- **Framework**: Next.js 16.0.7 with the App Router and React 19.2
- **Language**: TypeScript (strict mode), path alias `@/*` → project root
- **Styling**: Tailwind CSS v4 with a custom `@theme` token set (neon purple/pink on near-black) — global styles in `app/globals.css`, component-scoped CSS Modules (e.g., `Navbar.module.css`) using `@reference` to share Tailwind tokens
- **Icons**: `lucide-react` (the `Clock8` icon doubles as the "o" in the logo)
- **Testing**: Vitest + Testing Library (React/DOM/user-event/jest-dom) with `jsdom`, configured via `vitest.config.mts` with `vite-tsconfig-paths` so `@/*` works in tests
- **Lint**: ESLint via `eslint-config-next`

## Architecture
App Router with **route groups** splitting two layout shells:
- `app/(public)/` — unauthenticated shell (`<main className="public">`), holds:
  - `/` splash (`app/(public)/page.tsx`) — meant to redirect to `/login` or `/heists` (logic not yet wired)
  - `/login`, `/signup` — auth form placeholders
  - `/preview` — sandbox for previewing new UI components
- `app/(dashboard)/` — authenticated shell that mounts `<Navbar />` above `<main>`, holds:
  - `/heists` — lists Active / Assigned / Expired heists
  - `/heists/create` — new-heist form (placeholder)
  - `/heists/[id]` — heist detail page

## Components & Tests
- `components/Navbar/` is the only shared component so far (folder pattern: `Navbar.tsx` + `Navbar.module.css` + `index.ts` barrel)
- `tests/components/Navbar.test.tsx` mirrors the `components/` tree and is the only test

## Current State
This is a **scaffolded skeleton** — routes, layouts, design tokens, navbar, and the testing harness are in place, but pages are mostly placeholder headings. No data layer, auth, forms, or API routes exist yet.
