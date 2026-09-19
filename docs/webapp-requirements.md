# c3pu Web App — Requirements Specification

## 0. Purpose of this document

This is a technology-agnostic requirements spec and feature list for reimplementing
**c3pu**, an educational 8-bit CPU emulator currently built as a Java/Swing desktop
app, as a TypeScript + React single-page app distributed as a single self-contained
HTML file. It captures *what* the existing app does and *why*, not how the Java
implementation does it. It is meant to be a self-contained starting point for a new
project/repo — a reader should not need the original Java source to build from this
document, aside from clarifying edge cases.

Interaction-level detail (exact keyboard shortcuts, pixel/geometry layout, colors)
is intentionally **out of scope** — this document describes required capabilities
and behavior, not UI mechanics. Section 11 records implementation-design
considerations and decisions made for the web version specifically (including a
couple of new capabilities beyond what the original app had).

## 1. Product summary

c3pu is a simplified, simulated 8-bit computer used to teach the concept that data
and machine instructions are both "just bytes." A student writes or loads a
program directly as raw binary bytes into a small memory, and the app lets them
edit that memory, see it simultaneously decoded as data (hex/decimal/ASCII) and as
a candidate CPU instruction, then step or run it and observe registers, memory, and
output change in real time. Memory size and the instruction set are deliberately
minimal (256 bytes, ~15 instructions) so the whole machine can be held in a
student's head at once.

Primary audience: students in an intro programming/computer-systems course, and
the teacher/course staff who prepare example programs.

## 2. Core domain model

- **Memory**: 256 addressable cells (addresses 0–255), each holding one unsigned
  byte (0–255). 256 is a deliberate choice: every valid address fits in a single
  byte, so addresses and data share the same representable range.
- **Registers**: 8 named, byte-sized (0–255) registers, each with a distinct
  pedagogical role:
  | Register | Role |
  |---|---|
  | `R0`, `R1`, `R2` | General-purpose, for a program's own use |
  | `OP1`, `OP2` | Fixed operand slots read by `ADD`/`SUB`, and by `PRL`'s start/end range |
  | `RES` | Fixed result slot written by `ADD`/`SUB`; also the fixed jump-target slot read by `CJP` |
  | `OUT` | Holds the value that print instructions (`PRT`/`PRD`/`PRL`) emit |
  | `PC` | Program counter — address of the next instruction to execute |
- **Arithmetic is unsigned 8-bit with silent wraparound** (mod 256). There is no
  overflow flag and no error on overflow — `255 + 1` becomes `0`, `0 - 1` becomes
  `255`.
- **Out-of-range access is a hard runtime error, not silently ignored.** Reading or
  writing a memory address outside `0–255` or a register index outside the 8 valid
  registers aborts execution with an error. This is a deliberate teaching moment
  (see the `segfault` example program) and must be preserved as real, user-visible
  error behavior, not clamped/wrapped away.
- **Instruction encoding**: one memory byte = a 4-bit opcode (identifies which
  instruction) + a 4-bit operand (meaning depends on the instruction — usually a
  register index, sometimes a comparison operator). Several instructions consume
  one *additional* memory cell immediately following themselves as extra operand
  data — most commonly a byte packing two 4-bit register indices (source/destination),
  or a literal constant/address value. This variable instruction length (1 or 2
  bytes) is itself a teaching point: instructions aren't all uniform width.
- **Every byte in memory is always simultaneously interpretable as both a
  number/character (data) and a decoded instruction (code)** — the app must be
  able to render either interpretation of any byte, live, regardless of whether
  that byte is ever executed.
- **An unrecognized opcode is a distinct "invalid instruction" state.** Attempting
  to execute one is a runtime error, not a silent no-op.

## 3. Instruction set

All instructions occupy at least 1 memory cell; "2 cells" below means it reads one
extra cell immediately after itself as additional operand data. Unless stated
otherwise, the program counter simply advances past the instruction (and its extra
operand cell, if any) before/as it executes.

| Mnemonic | Cells | Operand meaning | Behavior | Purpose |
|---|---|---|---|---|
| `NOP` | 1 | unused | Does nothing | Lets a student "comment out" an instruction without shifting every later address; a deliberate placeholder byte |
| `ADD` | 1 | unused | `RES = OP1 + OP2` (wraps mod 256) | ALU addition via fixed operand/result registers |
| `SUB` | 1 | unused | `RES = OP1 - OP2` (wraps mod 256) | ALU subtraction, same convention |
| `INC` | 1 | register index | `reg = reg + 1` (wraps mod 256) | Counters / loop variables |
| `CPY` / `MOV` | 2 | low bit: copy (0) vs move (1); next cell: src/dst register nibbles | `dst = src`; if "move", `src` is then zeroed | Register-to-register data movement; teaches copy vs. move. Rendered as mnemonic `MOV` instead of `CPY` when the move bit is set |
| `LD` | 2 | destination register; next cell: literal value | `reg = <literal>` | Load an immediate constant into a register |
| `LDA` | 2 | unused; next cell: src/dst register nibbles | `dst = memory[value of src register]` | Indirect load — treats a register's value as a pointer/address |
| `ST` | 2 | source register; next cell: literal address | `memory[<literal address>] = reg` | Store a register to a fixed, literal memory address |
| `STA` | 2 | unused; next cell: src/dst register nibbles | `memory[value of dst register] = value of src register` | Indirect store — dst register is a pointer; pairs with `LDA` |
| `JMP` | 1 | register index | `PC = value of register` | Unconditional jump to a computed (register-held) address |
| `CJP` | 2 | comparison operator (`=`,`≠`,`<`,`>`,`≤`,`≥`); next cell: two register nibbles (left/right operands) | If `left <op> right` is true, `PC = RES` (jump target is always read from the fixed `RES` register); otherwise falls through normally | The only branching instruction — conditional control flow. The comparison operator is encoded directly in the instruction's own operand nibble |
| `PRT` | 1 | unused | Prints `OUT` as one ASCII character | Character output |
| `PRD` | 1 | unused | Prints `OUT` as a decimal number | Numeric output (visually distinct from character output — see §5) |
| `PRL` | 1 | unused | Prints the byte at address `OP1` as a character (and mirrors it into `OUT`); if `OP1 < OP2`, increments `OP1` by 1 and **re-executes the same instruction next step** (PC does not advance); once `OP1 ≥ OP2`, advances PC past itself instead | "Print loop" — prints a whole run of memory (`OP1`..`OP2`) as text, one character per step, without needing explicit loop-control instructions. `OP1`/`OP2` double as start/end cursors while this instruction is "in progress" |
| `HLT` | 1 | unused | Stops execution (does not advance PC further); emits a trailing newline to output | Explicit, successful end of program |
| *(unrecognized opcode)* | 1 | — | Executing it is a runtime error | Distinguishes "no instruction here" from "a byte that happens to look wrong" |

Notes:
- `CJP`'s jump-target-always-in-`RES` convention mirrors `ADD`/`SUB` writing their
  result to `RES` — a common idiom is: compute something into `RES`, then `CJP`
  against it.
- The system should offer a live, human-readable decoding of any instruction byte
  (mnemonic + resolved operand meaning, e.g. "CPY (R0 → R1)"), not just raw bits —
  this decoded view is a first-class, always-on feature (see §5), not just
  documentation.
- The system should be able to report, for any given instruction at any given
  memory position, which memory cells and which registers it *would* read/write if
  executed — this is required to drive the predictive highlighting described in
  §5, and should be computed statically (without actually executing anything).
- *(Candidate enhancement, not yet decided — see §11.11)*: when a 2-cell
  instruction's leading cell is explicitly marked as "this is code," its trailing
  operand cell's role is fully determined by that marking (it's that
  instruction's data, not an independently-interpretable cell) and so should be
  marked automatically rather than left for the user to mark separately.

## 4. Execution model

- **Step**: execute exactly one instruction, then stop. Used for tracing behavior
  one instruction at a time.
- **Run**: repeatedly execute instructions, with a visible delay between steps
  controlled by a user-configurable execution speed, until the program halts,
  errors, or the user stops it manually. Run and Stop are the same toggle.
- **Reset**: zero all registers (including `PC`) and clear any halted state, but
  **leave memory (the loaded program/data) untouched**, so the same program can be
  re-run without reloading it. This is distinct from clearing/deleting the
  program itself (§7).
- **Halting has two distinct reasons**, which should be surfaced differently to
  the user:
  1. Normal halt — the program executed `HLT`.
  2. End of memory — the program counter walked off the end of the 256-byte
     memory without ever hitting `HLT`.
- **Stuck-program detection**: during a Run, if the program counter revisits the
  same address it was at on the previous step *and* no output was produced in
  between, the run is aborted with an error rather than silently freezing the UI.
  (Output is used as evidence of "forward progress" even when the PC alone looks
  stuck — this specifically allows legitimate output loops, e.g. `PRL`, to keep
  running.)
- **Infinite-loop safety cap**: a single Run invocation is hard-capped at 1000
  total instruction steps; exceeding it aborts with an error. This is a
  last-resort guard independent of the stuck-program check above.
- Any runtime error (invalid instruction, out-of-range memory/register access,
  stuck program, step cap exceeded) stops execution and is reported to the user
  as an error (see §6), not thrown away silently.

## 5. Memory & register editing

- Every memory cell and register is always shown simultaneously in multiple
  representations: raw binary, hex, decimal, ASCII (memory only where applicable),
  and — for memory cells — the live decoded-instruction view from §3. *(Candidate
  enhancement under consideration, not yet decided — see §11.11: letting the user
  explicitly mark which single interpretation is the "correct"/intended one for a
  given cell, rather than leaving all of them equally presented.)*
- Values are edited at the **bit level** (toggle/set individual bits of the
  selected cell), not via a decimal/hex text field — this reinforces "everything
  is bits" as a learning goal. (A text-field/decimal-entry editing mode is a
  reasonable web-native addition to *offer alongside* bit editing, not a
  replacement for it.)
- A single edit cursor points at one bit at a time and can move around memory or
  the register list; editing can optionally auto-advance the cursor to the next
  bit (a persisted user preference, §9).
- **Range selection**: a contiguous run of whole cells (not partial bits) can be
  selected. A selection supports:
  - **Copy / Paste** — selected cells' raw values round-trip through the same
    plain-text binary format used for program files (§7), so a selection can be
    copied out to/pasted in from any external text editor. Pasting more values
    than the selection can hold truncates at the destination range's bounds;
    pasting fewer leaves the remainder of the destination unchanged; pasting past
    the end of memory is rejected/dropped for the overflow, not wrapped.
  - **Move up / down, or to an arbitrary position** — shift the selected block
    of cells by one position (toolbar buttons), or drag it via a per-row handle
    to any position (mouse-first interaction model, §11.2/§11.3) — either way,
    an in-place reorder, not a copy, displacing the cells it passes over.
    Useful for reordering instructions while writing a program.
  - **Clear** — zero the selected cells' values, keeping their positions/count
    unchanged.
  - **Delete** — remove the selected cells entirely and shift everything after
    them up to close the gap (a structural edit, distinct from Clear).
  - **Insert before / after** (new capability, mouse-first interaction model) —
    insert as many blank (zero-valued, unmarked) cells as the selection holds
    immediately before or after it, shifting everything from that point on
    down and truncating whatever falls off the end of memory — the mirror
    image of Delete.
- **Delete all data**: a single, explicitly confirmed, irreversible action that
  resets all of memory and all registers to zero — distinct from Reset (§4, which
  preserves the program) and from Close (§7, which only affects the file
  association).
- **Undo / Redo** (new capability — not present in the original app; decided for
  the web version, see §11.9): edit operations (bit toggles, clears, deletes,
  inserts, moves, pastes, and Delete All Data) should be undoable and redoable.
- Registers use the same per-cell editing model (bits, hex/dec/ASCII) as memory,
  but have no "decoded instruction" column and cannot be reordered/deleted — only
  cleared — since register order is fixed and meaningful. `PC` is directly
  editable like any other register, letting a student manually redirect execution.
- **Predictive highlighting (always on, independent of execution)**: whichever
  cell currently has the edit cursor (or, during Run/Step, whichever cell the
  program counter is on) should have its would-be-read/would-be-written memory
  cells and registers visually indicated — computed statically from the current
  bytes via the "affected cells/registers" capability in §3, without executing
  anything.
- **Actual-change highlighting**: after a Step (or each step of a Run), the cells
  and registers that were *actually just modified* should be visually indicated,
  distinctly from the predictive highlighting above (the two can differ — a
  conditional jump might not take the branch, for instance — so both signals
  matter and must be visually distinguishable from each other).
- On successful `HLT`, the program counter's cell should get a distinct
  "completed successfully" indication.
- Errors that prevent showing a meaningful prediction (e.g. the program counter is
  itself out of bounds) should be indicated as an error state rather than silently
  showing nothing.

## 6. Output / console

- A single running output log accumulates program output and system messages, in
  order, and should auto-scroll to the latest entry. It can be cleared
  independently of Reset.
- Output text should be selectable/copyable by the user.
- Three distinct output behaviors, rendered into the same log but visually
  distinguished:
  - Character output (`PRT`, `PRL`) — printed characters accumulate together;
    a newline starts a new visual block/paragraph.
  - Decimal output (`PRD`) — each number is its own visual block, so consecutive
    numbers don't visually run together with adjacent characters.
  - Error/system messages (invalid instruction, out-of-range access, stuck
    program, step-cap exceeded, end-of-memory, and other runtime errors, plus
    informational messages like normal completion) — visually distinct from
    program output (e.g. a different color/style), so it's always clear whether
    text in the log came from the running program or from the emulator itself.

## 7. Files & program data

### 7.1 Program text format

The canonical program representation is plain text: one line per memory cell,
each line containing exactly 8 binary digits (`0`/`1`) representing that cell's
byte, most-significant bit first. Whitespace within a line is ignored (so a line
may optionally group the byte as two 4-bit nibbles separated by a space, e.g.
`0101 0011`, for readability). Anything on a line after a `//`, `#`, or `%` is a
comment and is stripped before parsing. This format is designed to be
human-writable and diffable in any plain text editor, not just inside the app.
Loading a file validates every line is well-formed and reports which line failed
if not.

A cell's explicit interpretation mark (§11.11 - "code," or "data" with a
representation) is encoded inline as a `%`-comment on that cell's own line,
using one of:

```
<8 bits> % code
<8 bits> % data              (representation omitted = binary, the default view)
<8 bits> % data hex
<8 bits> % data decimal
<8 bits> % data ascii
```

Only `%` carries this grammar - `//` and `#` comments are always plain text,
never marks, so existing notes using those markers are unaffected. A `%`
comment whose text doesn't match one of the forms above is likewise just an
ordinary comment: it's ignored for marking purposes, not an error. A file
with no `%`-mark annotations at all (including every file predating this
grammar) loads exactly as before, with every cell unmarked. The auto-derived
"operand" mark (§11.11 - the trailing cell of a 2-cell instruction whose
leading cell is marked code) is never written to the file; it's always
recomputed from the leading cell's mark and the current bytes on load, the
same way it is after any in-app edit.

### 7.2 File operations

- **Open** — load a program text file (as above) into memory, replacing current
  contents.
- **Save / Save As** — write current memory contents out in the same format, to
  the currently-associated file (Save) or a newly chosen one (Save As).
- **Close** — clear the current program from memory and drop the file
  association (distinct from Delete All Data in §5, which also has no notion of
  "a file").
- The app tracks, purely for user feedback, whether a file is currently open and
  whether it has unsaved changes since it was opened/last saved, and reflects this
  prominently (e.g. in a title/status area).
- Any action that would discard unsaved changes (Open, loading an Example, Close,
  exiting the app) must prompt for confirmation first.
- The most recently used file location should be remembered across sessions to
  streamline the next Open/Save.

### 7.3 Compact snapshot export/import

Separately from the line-per-cell file format (§7.1), the full memory image (and
implicitly, therefore, any program/data in it) can be exported to a single
compact, copyable text string and re-imported from one — intended for pasting
into chat, an assignment submission, a URL, etc., rather than saving a file. This
format should compress long runs of zero/empty memory rather than spelling out
every cell, since most student programs use only a small fraction of the 256
cells. Round-tripping export → import must reproduce the exact original memory
contents. Malformed/invalid input to import must be rejected with a clear error,
not partially applied.

### 7.4 Bundled example programs

The app ships with a fixed set of ready-made example programs, offered from a
menu as teaching material and starting points. Loading one follows the same
unsaved-changes confirmation as Open (§7.2). Each is stored in the same plain-text
format as user files (§7.1) — an example is just a bundled file, not a special
format. Existing examples and their teaching purpose:

| Example | Purpose |
|---|---|
| `tiny_program` | Minimal complete program (load a value, print it, halt) — smallest possible smoke test |
| `simple_add` | Loads two values, adds them, prints the result — canonical arithmetic demo |
| `simple_loop` | Uses a register as a loop counter with `CJP` to repeat a block a fixed number of times — control flow / looping demo |
| `hello_world` | Prints "HELLO WORLD!" via one load+print instruction pair per character — straightforward text output, no loop |
| `hello_world_loop` | Prints the same message, but stored as data in memory and emitted via `PRL` — demonstrates code/data reuse and the print-loop instruction |
| `segfault` | Deliberately reads/writes out of bounds — demonstrates the out-of-range error (§2) |
| `segfault_inf_loop` | Same out-of-bounds fault, structured to re-trigger in a loop — demonstrates the stuck-program/infinite-loop guard (§4) alongside the bounds error |

These programs (or equivalents covering the same teaching points) should ship
with the web app and are also useful as test fixtures for the reimplementation.

## 8. Help & reference content

Three reference resources exist, meant to be usable *alongside* the main working
view (not one-off modal interruptions), and each independently controllable
(shown/hidden, and optionally auto-shown on first/every load):

1. **User guide** — explains the whole app: quickstart, the main layout, the
   editing model (§5), the execution model (§4), selection/move/copy/paste
   behavior, and where to get help/report issues.
2. **Instruction reference** — a live list of every instruction (§3) with its full
   plain-language description; the instruction corresponding to whatever the
   cursor/PC is currently on should be highlighted in this list, so it also
   answers "what does the instruction I'm looking at do."
3. **ASCII table** — a reference table of all 128 ASCII characters with their
   character/hex/decimal/binary representations, grouped/distinguished by category
   (control, digit, uppercase, lowercase, punctuation) — needed because the print
   instructions (§3, §6) work in raw byte values that a student must look up when
   composing text data by hand.

## 9. Settings / preferences

The following should persist across sessions, purely so a returning user doesn't
have to reconfigure their preferred setup every time:

- Execution speed (§4).
- Whether each of the three reference resources (§8) auto-opens on load.
- Whether the edit cursor auto-advances after a bit edit (§5).
- UI zoom/text size level.
- Last-used file location (§7.2), to the extent the platform allows.

## 10. Known non-requirements

These exist in some form in the current app but should **not** be treated as
required functionality to faithfully replicate:

- **Undo/Redo** — the original app's menu entries are unimplemented stubs ("not
  implemented yet"); there is no working undo/redo to port. The web app *will*
  add real undo/redo as a new feature (decided — see §5 and §11.9), so this item
  is a "no prior behavior to replicate," not a "do not build."
- **Per-row "hide instruction text" toggle** — a minor, purely cosmetic,
  session-local display toggle in the current app (not persisted, not preserved
  through cell moves). Low value to replicate exactly as-is.
- **Host OS look-and-feel adaptation** — a desktop-only platform-integration
  nicety with no web equivalent; a web app will simply have one consistent look,
  which is a simplification, not a gap.
- An internal "addressing mode" concept (constant/register/memory, with a
  distinct "invalid" state) is defined in the current codebase's instruction base
  logic but does not appear to be actually used by any instruction's real
  behavior — treat §3 (which reflects actual behavior) as authoritative, not this
  unused scaffolding.

## 11. Implementation notes & design considerations (non-normative)

This section is deliberately kept separate from §1–§10: it records design
reasoning, tradeoffs, and decisions/open-questions for *how* to build the web
app, not additional required behavior. Where it conflicts with judgment calls
made during actual implementation, the implementation wins — this is a starting
point, not a spec.

### 11.1 Application shell: panels and commands, not menus and windows

The desktop app's File/Edit/Select/Execute/View/Examples/Configure/Help menu bar
and its three separate, independently movable/resizable OS windows (user guide,
instruction reference, ASCII table — §8) are desktop-native patterns and should
not be ported literally.

- The three reference resources (§8) should be **foldable/collapsible side
  panels** docked within the single page, not separate windows and not modal
  dialogs. They're meant to stay visible *alongside* the working memory/register
  view (per §8's "working references, not one-off dialogs"), which a collapsible
  panel supports directly — a modal would block interaction with the main view,
  and a separate window has no clean web equivalent. Each panel's
  shown/collapsed state remains the persisted preference from §9.
- The rest of the command surface (file operations, edit operations, execution
  controls, view options, settings) should be reworked into conventional web-app
  idioms: e.g. a persistent toolbar for high-frequency actions (step/run/reset,
  open/save), a settings panel/drawer for the preferences in §9, and standard
  keyboard shortcuts — rather than nesting every action inside a desktop-style
  dropdown menu bar. Treat the original menu structure only as a checklist of
  *actions that must be reachable somehow*, not as a layout to reproduce.
- Because everything now lives on one page instead of independent OS windows,
  focus management needs a deliberate plan: a roving-tabindex scheme within each
  grid (memory table, register table — see §11.2), and a sensible, predictable
  tab order across the main view and any open side panels, rather than relying
  on the window manager the way the desktop app implicitly did.

### 11.2 Bit editor: model a bit as a toggle, not a text character

The desktop app edited bits via tiny Swing textfields (or labels made to behave
like them), which forced reimplementing — by hand — several things a text
widget doesn't naturally support when repurposed this way: restricting input to
`0`/`1`, moving a caret *between* fields, and selecting/copying *across* fields.
A bit is semantically a boolean, not free text, so the web version should avoid
the text-input paradigm entirely rather than inherit those workarounds:

- Render each bit as a small focusable non-text element (e.g. a `<button>` or a
  `<div role="gridcell">`) inside a grid representing the memory/register table
  — not an `<input>`.
- **Revised for a mouse-first interaction model** (superseding this
  subsection's original "click flips the bit directly"): a single click/tap
  only selects, matching the click-selects convention students already know
  from spreadsheet apps; flipping is a double-click (or the keyboard, see
  below). This still avoids an actual `<input>`'s virtual keyboard popping up
  on touch devices for what is really a single toggle — a problem the desktop
  app never had to consider — and additionally makes a bit behave like any
  other selectable cell, so click-and-drag range selection (§11.3) can start
  from a bit without also editing it as a side effect.
- Keyboard navigation follows the standard "grid with roving tabindex" pattern
  (one element in the grid is tab-reachable at a time; arrow keys move that
  focus across bits/cells/rows). `0`/`1` set a bit explicitly; a flip key (`F`
  in the original) toggles it; Enter advances — handled by one centralized
  keydown handler rather than per-field logic.
- The multiple simultaneous highlight states required by §5 (edit caret,
  predictive affected-cells, actually-just-changed, current PC, range
  selection) should be expressed as CSS classes/data-attributes and composited
  by the browser, rather than hand-coordinated paint logic — this is
  substantially simpler than it was in Swing and worth leaning on.

### 11.3 Selection and clipboard: two distinct concepts, and one is free

§5 actually describes two different selection concepts that are easy to
conflate: a **bit-level edit cursor** (single position, for toggling — §11.2),
and a **whole-cell range selection** (for copy/move/clear/delete). Keep them
architecturally separate:

- HTML text is selectable and copyable by default — a capability the desktop
  app had to add deliberately (per its own backlog) because Swing labels aren't
  selectable out of the box. The read-only representation columns (hex,
  decimal, ASCII, disassembly) should be left as ordinary selectable text, which
  gets this for free with no custom code.
- The interactive bit grid should instead disable native text selection
  (`user-select: none`) and implement range selection as its own state machine
  driven by pointer events (press/move/release, shift-click to extend) —
  following the same conventions spreadsheet apps use, which most users already
  know intuitively. Leaving native selection enabled there too would produce a
  confusing double highlight (the browser's own selection color layered on top
  of the app's custom selection highlight).
- **Revised, mouse-first interaction model**: a memory row's drag-select zone
  extends beyond its bits to the address label, the predicted-effect dots, and
  the row's own handle/action-buttons gutter (§11.11-adjacent — see below) —
  clicking and dragging over any of those starts the same range selection as
  dragging across bits, so a selection doesn't require landing on a specific
  bit. It deliberately stops there: the read-only representation columns keep
  the native text selection described above. Each memory row additionally
  gets a drag handle (moves that row, or the active selection if the row is
  part of one, to an arbitrary position — a generalization of the single-step
  Move up/down in §5) and per-row Clear/Delete/Insert-before/Insert-after
  buttons, scoped the same way; registers get the row-level click-to-select
  and a per-row Clear (no handle or delete/insert, since register order is
  fixed per §5).
- Implement copy/paste via the native `copy`/`paste` DOM events (intercepted to
  serialize/parse the program text format from §7.1) rather than the
  asynchronous `navigator.clipboard` API — the latter can require a permission
  prompt and doesn't hook naturally into a plain Ctrl+C/Ctrl+V.

### 11.4 Rendering performance

256 memory cells × 8 bits (plus 8 registers × 8 bits) is roughly 2,000
interactive elements, some of which change on every step of a fast Run. Keep a
single flat array as the source of truth (not per-bit component state), and
memoize per-cell components on primitive props (value + a small highlight-flags
value) so only cells that actually changed re-render. This achieves, in an
idiomatic web way, the same goal the desktop app's listener-based storage model
was already designed around (§ "reactivity model": notify only what changed,
re-render only that).

### 11.5 Accessibility and input robustness

- **Accessibility — decided: yes.** The desktop app's custom-painted Swing cells
  are effectively invisible to screen readers and other assistive tools without
  dedicated extra work, which was never done. For the web version, real semantics
  should be built in from the start rather than retrofitted: `role="grid"`/`row`/
  `gridcell` on the memory/register tables, `aria-label`s that state the full
  context of a cell (e.g. "Memory address 42, bit 3, value 1"), `aria-selected`
  for range selection, `aria-live` announcements for things a sighted user learns
  from highlighting alone (current instruction, halt/error state, actual-change
  highlighting after a step) so that information isn't sighted-only. This is a
  genuine improvement over the original app, not just parity, and is far cheaper
  to design in from the start than to add later once markup/structure has
  settled.
- **Keyboard-layout independence**: shortcut keys like `0`/`1`/`F` should be
  matched on `event.code` (physical key position) rather than `event.key`, so
  they don't silently break on non-US keyboard layouts — not a concern the
  original single-target desktop build necessarily had to handle.

### 11.6 File Open/Save in a browser

A static HTML file has no arbitrary local filesystem access (§7.2). Realistically
this becomes browser-native download (Save/Save As) and a file picker or
drag-drop (Open), rather than true in-place file editing. The Chrome-only File
System Access API could offer closer-to-native in-place saving, but it requires
the page be served over `http(s)://` — it won't work if the app is simply
double-clicked from disk as `file://`, which conflicts with "publish as a
simple html file." Decide deliberately which tradeoff to take (or offer both,
with a fallback).

### 11.7 Settings persistence caveats

`localStorage` (§9) is the natural fit, but it's scoped per-origin and can
behave inconsistently — or be unavailable — for a page opened directly from
disk (`file://`) rather than served from a URL. Worth confirming the intended
distribution/hosting method before relying on it.

### 11.8 Snapshot export/import as a web-native enhancement

Since the compact snapshot format (§7.3) is just a string, it maps cleanly onto
the clipboard, or even a URL fragment/query parameter for shareable-link-style
loading — something the original desktop app couldn't easily offer. Worth
considering as a natural, low-cost enhancement rather than a strict requirement.

### 11.9 Undo/redo — decided: yes, via flat-array snapshots

§10 notes that undo/redo exists only as unimplemented menu stubs in the
original — there's no prior working behavior to match. For the web version,
real undo/redo (§5) will be implemented on top of the flat-array-of-bytes memory
model: because the whole editable state (256 memory bytes + 8 registers) is
tiny, the simplest robust approach is to push a full snapshot of that state onto
an undo stack at each meaningful edit step, rather than computing/storing diffs.

Left open for implementation time, not decided here:
- **Undo granularity** — what counts as "one step." Likely candidates: each
  discrete user action (a paste, a move, a clear, a delete, a finished bit edit)
  rather than, say, one undo step per individual bit flip while a student is
  rapidly toggling bits — the latter would make the undo stack tedious to use.
- **Scope** — whether Reset (§4) and program Open/Close (§7.2) also push undo
  steps, or only in-place edits do.
- **Interaction with persistence** (§11.10) — the undo stack itself is not
  intended to be persisted across a page reload (see below); only the "current"
  state is a candidate for that.

### 11.10 State persistence (localStorage) — design for it now, even if built later

The user considers `localStorage` persistence (§9, §11.7) likely wanted, and
would rather the surrounding design account for it from the start than retrofit
it — even if the actual persistence code lands later. Concretely, this means
structuring state now so that persistence is a thin serialization layer over a
clean state shape, not a scramble later:

- Keep the persisted-preferences slice (§9: execution speed, panel/auto-open
  flags, cursor auto-advance, zoom level, last-used file location) as a small,
  flat, independently serializable piece of state, separate from ephemeral UI
  state (current selection, scroll position, undo/redo stack) that is *not*
  a candidate for persistence.
- Decide early whether "resume last session's program" (persisting current
  memory/register contents, not just preferences) is in scope — if so, that's a
  second, separate serializable slice, and it can reuse the compact snapshot
  format from §7.3 rather than inventing a new storage encoding.
- Writes to persisted storage should be debounced/throttled, not fired
  synchronously on every bit toggle or every Run step — both for performance and
  because `localStorage` writes are synchronous and can jank the UI if triggered
  too often.
- The undo/redo stack (§11.9) should not be persisted — reset it on reload. This
  avoids open-ended questions about how much history to serialize and keeps the
  persisted state small and simple.

### 11.11 Candidate enhancement: explicit per-cell interpretation marking (not yet decided)

Not present in the original app, and not yet a firm requirement — recorded here
as an idea to keep in mind while designing the memory table, since it affects
the data model for a memory cell (§2, §5).

§5 requires every memory cell to show all of its interpretations (binary, hex,
decimal, ASCII, decoded instruction) at once, but gives no indication of which
one is the "correct"/intended one in context. Three ways of adding that were
considered:

1. **Infer automatically from a simulated run starting at PC = 0.** Plausible,
   but wrong whenever the actual run diverges from that assumption — e.g. the
   student manually moves `PC` (§5 explicitly allows this), or control flow is
   data-dependent.
2. **Infer automatically from the actual, current PC/execution history.** More
   accurate for cells the program has actually executed, but still silently
   wrong (or simply unknown) for memory the program hasn't reached yet, or for
   data cells that sit interspersed with code but are never themselves executed.
3. **Let the user explicitly mark each cell's intended interpretation by hand**
   (code, or a specific data representation).

Current leaning is **option 3**: it gives the student direct, unambiguous
control and avoids both automatic options' failure modes, at the cost of
requiring the student to actually do the marking.

If option 3 is pursued, §3 already notes the direct consequence: for a 2-cell
instruction (`CPY`, `LD`, `LDA`, `ST`, `STA`, `CJP`) whose leading cell is marked
as code, the trailing operand cell's role is fully determined by that marking —
it should be **marked automatically as that instruction's data**, not offered as
a separate, independently-markable cell. This propagation should be
re-evaluated whenever the leading cell's marking or opcode changes (e.g. if the
user changes cell N from a 2-cell instruction to something else, cell N+1's
automatic marking should be reconsidered or cleared).
