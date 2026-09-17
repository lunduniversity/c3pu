# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

c3pu is a from-scratch TypeScript/React reimplementation of an educational
8-bit CPU emulator (originally a Java/Swing desktop app — that original repo
is unrelated and its `CLAUDE.md` does not apply here). It builds to a single
self-contained HTML file with no server.

**The two specs in `docs/` are the source of truth for behavior**, not this
file:
- `docs/webapp-requirements.md` — the full functional spec (binding
  requirements in §1–§10, implementation-design notes in §11). Read the
  relevant section before changing behavior in an area you're unsure about.
- `docs/tech-stack.md` — the chosen tooling and why.
- `docs/examples/*.txt` — bundled example programs; also canonical test
  fixtures (see `src/engine/__tests__/fixtures.test.ts`).

## Commands

```bash
npm run dev        # Vite dev server
npm run build       # tsc -b (typecheck) && vite build -> dist/index.html (single file)
npm run lint         # eslint .
npm test              # vitest run (whole suite)
npx vitest run <path>  # a single test file, e.g. src/engine/__tests__/cjp.test.ts
npx vitest run -t "<name>"  # a single test by name
npm run preview      # serve the production build (dist/) locally
```

Add a shadcn/ui component with `npx shadcn@latest add <component>` — it
resolves the `@/*` path alias correctly and lands in `src/components/ui/`.

**If `npm run dev` fails with `EMFILE: too many open files, watch ...`**
(happens in some sandboxed containers with low inotify limits), don't fight
the watcher — run `npm run build && npm run preview` instead and treat that
as the dev server for manual/browser verification.

## Architecture

State flows in one direction through four layers. Each layer has its own
directory under `src/` and only talks to the layer(s) below it:

1. **`src/engine/`** — pure CPU simulator, no React/DOM. `types.ts` defines
   the register/memory model; `decode.ts` decodes a byte into an
   `Instruction` and — critically — also exposes `computeEffects()`, which
   statically computes what a decoded instruction *would* read/write without
   executing it. `cpu.ts`'s `step()` (single instruction) and
   `createRunTicker()`/`run()` (repeated stepping with stuck-program/step-cap
   detection) are the only things that actually mutate a `CpuState`.
   **`computeEffects()` is reused by both the executor and the grid's
   predictive-highlighting UI** — that's deliberate, so the two can never
   drift apart; don't reimplement read/write prediction elsewhere.
   `program-format.ts` parses/serializes the §7.1 text format.

2. **`src/grid/`** — pure operations on `GridState` (`{ memory, registers,
   marks }`), still no React. `marks.ts` implements the §11.11 per-cell
   interpretation marking: `deriveEffectiveMarks()` recomputes every cell's
   effective mark from scratch on every call (from `memory` + the stored
   user marks), so a 2-cell instruction's trailing operand cell being
   auto-marked — and un-marked when the leading cell's marking or opcode
   changes — falls out for free instead of needing invalidation logic.
   `model.ts` has the edit operations (bit toggle, clear/delete/move/paste
   with the exact truncation rules from §5). `highlight.ts` computes
   predictive/actual-change/selection/PC/halt/error flags per cell;
   `highlightBitmask.ts` flattens those into a single integer so the row
   components below can memoize on a primitive prop instead of object
   identity (§11.4).

3. **`src/app/`** — React hooks that own state and orchestrate the two pure
   layers. `AppState` (in `state.ts`) extends `GridState` with execution
   status (`halted`/`haltReason`/`error`/`hasExecutionStarted`); it's the
   single source of truth for "what's in memory/registers right now,"
   whether that got there by hand-editing or by running the program.
   `useExecution` owns `AppState`, the console log, the undo/redo stack, and
   the Run timer; `useFileState` owns Open/Save/Close and unsaved-changes
   tracking (dirty = memory differs from a baseline, not tied to
   registers/execution status — only memory is part of the file format);
   `usePersistence` owns the debounced localStorage sync.

4. **`src/components/`** — presentational React, grouped by feature
   (`grid/`, `execution/`, `console/`, `file/`, `reference/`, `settings/`).
   `components/ui/` is shadcn/ui and is scoped to app chrome only — the
   bit-editor grid (`components/grid/`) is bespoke (roving-tabindex keyboard
   nav + pointer-driven range selection, both centralized in the shared
   `useBitGrid` hook reused by `MemoryGrid` and `RegisterGrid`), per
   `tech-stack.md`'s explicit split.

Supporting, mostly-standalone modules: `src/console/` (the output-log data
model, §6's three visually-distinct categories), `src/snapshot/` (the §7.3
compact export/import codec — a zero-run-length encoding, not a general
compressor), `src/examples/` (the `docs/examples/*.txt` fixtures imported
via Vite's `?raw` suffix so their content is baked into the single-file
build at compile time, not fetched at runtime), `src/reference/` (the
instruction-reference panel's prose, kept separate from `decode.ts`'s
structural logic), `src/ascii.ts` (the ASCII table, shared by the memory
grid's ASCII column and the ASCII reference panel), `src/settings/`
(persisted-preferences shape + validation + the localStorage wrapper).

### Things that are easy to get wrong here

- **The exact opcode/register/CJP-comparator byte encoding has no source of
  truth beyond `docs/examples/*.txt`** — there's no original Java source in
  this repo. Opcode numbers and register indices match the row order in
  `webapp-requirements.md` §2/§3's tables exactly. CJP's comparator codes
  are mostly this project's own free choice (only code `3` = "not equal" is
  actually forced, by `segfault.txt`'s self-modifying-code crash) — see the
  comments in `decode.ts`/`types.ts`. If you touch this encoding, re-run
  `fixtures.test.ts` against all 7 examples, not just the unit tests.
- **Manual Step bypasses stuck-program/step-cap detection**; only Run
  enforces it, because §4 scopes that guard to "a single Run invocation."
  `step()` and `createRunTicker()` are intentionally separate entry points
  in `cpu.ts` — don't route Step through a ticker.
- **Undo/redo is scoped to in-place edits only**: bit toggle, clear, delete,
  move, paste, and Delete All Data (all funnel through
  `useExecution`'s `applyGridEdit`/`handleDeleteAllData`). Execution
  stepping and Open/Close/Examples/snapshot-import are deliberately not
  undoable — don't wire new "replace everything" actions through the undo
  stack without checking that's actually wanted.
- **Session persistence resumes memory + marks only**, never registers or
  execution status — a reload always starts from a fresh, non-halted
  context. `localStorage` access is always wrapped in try/catch (it can be
  unavailable from a `file://` origin or in private browsing).
- **No File System Access API** — a deliberate tradeoff (§11.6) so the app
  still works opened as a bare double-clicked HTML file. Open/Save are a
  plain file-picker and browser download, not true in-place editing.
- Confirmations (unsaved changes, Delete All Data) use `window.confirm`/
  `prompt`/`alert` rather than a shadcn dialog — a deliberate scope cut, not
  an oversight; worth revisiting as a dedicated polish pass if asked.

### Testing conventions

One test file per instruction under `src/engine/__tests__/` (mirrors the
original Java repo's layout, per `tech-stack.md`). `fixtures.test.ts` runs
each of the 7 bundled `docs/examples/*.txt` programs end-to-end through the
real engine and asserts the documented output/halt/error behavior — treat
it as the ground truth for engine changes. Component tests use React
Testing Library; hook tests use `@testing-library/react`'s `renderHook`.
