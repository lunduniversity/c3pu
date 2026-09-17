# c3pu Web App — Tech Stack & Getting Started

This document is deliberately kept separate from `webapp-requirements.md`: that
document specifies *what* the app must do; this one records *how* it will be
built — tooling, build output, testing, and browser support — plus a starting
checklist for scaffolding the new repo. Nothing here overrides the requirements
document; if the two ever conflict, `webapp-requirements.md` wins on behavior,
this document wins on tooling.

## Language & framework

- **TypeScript**, strict mode on from the start.
- **React** for the UI layer.

## Build tooling: Vite, targeting a single HTML file

- **Vite** as the build tool/dev server.
- The production build must produce a single, self-contained `.html` file (no
  separate `.js`/`.css` assets to host) — use a Vite single-file plugin (at the
  time of writing, `vite-plugin-singlefile` is the standard choice for this).
  **Verify the current package name, setup, and version when scaffolding** —
  the JS tooling ecosystem moves fast enough that specifics here may have
  shifted by the time this is used.
- Any images/fonts must end up inlined (e.g. as data URIs) by the single-file
  build — avoid features that assume separately-hosted assets.

## UI components: shadcn/ui

- **shadcn/ui** for general application chrome — toolbar buttons, the settings
  panel/drawer (§9, §11.1), dialogs/confirmations (§7.2's unsaved-changes
  prompts, §5's Delete All Data confirmation), dropdowns, tooltips.
- Note what shadcn/ui actually is, since it's a somewhat unusual model: it's not
  an installed black-box npm dependency — its CLI copies component *source*
  (built on Radix UI primitives, styled with Tailwind CSS) directly into the
  repo, where it's yours to edit. This fits the single-file build goal well
  (it's just more of your own source and CSS for Vite to bundle), but it does
  mean **Tailwind CSS becomes a build dependency** — confirm during setup that
  the single-file plugin correctly inlines Tailwind's generated stylesheet.
- **Scope it to the app chrome, not the core bit-editor grid.** The memory/
  register grid (`webapp-requirements.md` §11.2–§11.5) needs bespoke roving-
  tabindex keyboard navigation, custom ARIA grid semantics, and non-text toggle
  cells — that's custom-built, not a shadcn/ui component. Reach for shadcn/ui
  for the surrounding UI, not the grid itself.

## Testing: Vitest

- **Vitest** (pairs naturally with Vite) for unit and component tests; add
  React Testing Library for component-level tests.
- **Start testing with the instruction-set engine, before any UI exists.** The
  entire instruction set (`webapp-requirements.md` §3) and execution model (§4)
  is pure logic — no DOM, no React — and is fully unit-testable in isolation.
  The original Java app already has one test file per instruction
  (`src/test/java/instruction/*Test.java` in the original repo) as a structural
  precedent; mirror that shape (one test file per instruction) in the new repo.
- Use the bundled example programs in `docs/examples/*.txt` as end-to-end
  fixtures: running each one (via the engine, headless, no UI) should produce
  the expected output/halt behavior described in `webapp-requirements.md` §7.4.

## Browser support target

Target **evergreen browsers** — browsers that auto-update themselves to their
latest version in the background (Chrome, Firefox, Edge, Safari), as opposed to
a browser that can get stuck on an old version for years (classic Internet
Explorer being the canonical example). Concretely, for this app:

- **Primary target**: whatever a student's laptop already has installed and
  auto-updated — latest stable Chrome, Firefox, or Edge on Windows; latest
  stable Safari on macOS. No legacy-browser support is needed.
- **Mobile/touch**: nice-to-have, very low priority. Don't let it constrain core
  design decisions or cost extra implementation effort — though note the
  toggle-based bit editor design in §11.2 of the requirements doc (tap-to-flip,
  no reliance on a physical keyboard) already happens to behave reasonably on a
  touchscreen as a side effect of being the right design for desktop, so
  baseline mobile usability should come close to free.
- Since legacy-browser support is explicitly not a goal, modern CSS/JS features
  (e.g. `:has()`, container queries, CSS nesting, `color-scheme`) are fair game
  where they simplify the implementation.

## Suggested repo scaffolding (starting point, not gospel)

A rough starting sequence — verify exact commands/flags/versions at setup time,
since these shift over time:

```bash
npm create vite@latest . -- --template react-ts
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D vite-plugin-singlefile   # confirm current package name
npx shadcn@latest init                  # pulls in Tailwind CSS
```

Then configure the Vite single-file plugin in `vite.config.ts`, confirm a
production build (`vite build`) emits one `.html` file with everything inlined,
and confirm `vitest` runs before writing any real code.
