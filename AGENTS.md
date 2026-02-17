# Repository Guidelines

## Project Structure & Module Organization

This project is a React + Vite + TypeScript PDF viewer with feature-based organization.

- `src/app/`: App shell and top-level layout (`App.tsx`)
- `src/features/pdf/`: pdf.js loading, page cache, canvas rendering
- `src/features/viewer/`: vertical/horizontal viewer logic and shared viewer state
- `src/features/nav/`: TOC, page jump, desktop panel, mobile sheet
- `src/features/book/`: `book.json` fetching, zod validation, book info dialog
- `src/shared/`: cross-cutting hooks, utilities, and pdf.js worker setup
- `src/components/ui/`: shadcn-style UI primitives
- `public/`: runtime assets (`book.json`, `pdf/*.pdf`, `pdf/*.json`)

Keep new logic inside the relevant `features/*` module and avoid mixing concerns in `app/`.

## Build, Test, and Development Commands

Use bun in this repository.

- `bun install`: install dependencies
- `bun run dev`: start local dev server (Vite)
- `bun run build`: run TypeScript build (`tsc -b`) and production bundle
- `bun run lint`: run ESLint checks
- `bun run preview`: preview production build locally

Before finishing any task, always run:

- `bun run lint`
- `bun run format`

## Coding Style & Naming Conventions

- Language: TypeScript (`.ts`/`.tsx`), 2-space indentation, semicolons enabled.
- Components: `PascalCase` file and export names (e.g., `VerticalViewer.tsx`).
- Hooks/utilities: `camelCase` (e.g., `useMediaQuery.ts`, `clamp.ts`).
- Prefer feature-local state and explicit types; keep shared helpers in `src/shared`.
- Use Tailwind utility classes for styling; reuse existing UI primitives from `src/components/ui`.

## Testing Guidelines

There is no test suite configured yet. For now:

- Validate changes with `bun run build` and manual UI checks.
- When adding tests, prefer Vitest + React Testing Library.
- Suggested naming: `*.test.ts` / `*.test.tsx` colocated with target code.

## Commit & Pull Request Guidelines

Follow Conventional Commits:

- `feat(scope): summary`
- `fix(scope): summary`
- `refactor(scope): summary`
- `docs(scope): summary`
- `chore(scope): summary`

PRs should include:

- concise change summary and motivation
- linked issue (if any)
- screenshots/GIFs for UI changes (desktop + mobile)
- validation notes (`bun run build`, manual checks)

## Security & Configuration Tips

- Do not commit secrets or environment-specific credentials.
- Keep PDF worker setup centralized in `src/shared/pdfjs/setup.ts`.
- Treat `public/book.json` and `public/pdf/*` as runtime content; validate schema changes with zod.
