export function UserGuidePanel() {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed">
      <section>
        <h3 className="mb-1 font-medium">Quickstart</h3>
        <p>
          c3pu simulates a tiny 8-bit computer: 256 bytes of memory and 8 registers. A byte in memory can be
          data (a number or a character) or an instruction - the app always shows you both readings at once.
          Load one of the bundled Examples from the File controls to see a working program, or build one from
          scratch by toggling bits in the Memory grid. Click Step to run one instruction at a time and watch the
          registers and output change, or click Run to let it play out automatically.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Layout</h3>
        <p>
          File controls (Open/Save/Examples/Snapshot) and Execution controls (Step/Run/Reset) sit at the top,
          followed by a color legend explaining what each highlight color means. Below that is the main area: the
          Memory grid (256 addressable cells) on one side, with the Registers grid (8 named registers) and the
          Output console stacked on the other - or all three stacked in that same order, top to bottom, on a
          narrower window. Both grids have column headers (Memory's stay pinned to the top as you scroll through
          its 256 rows). These reference panels dock alongside that main view rather than covering it.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Editing memory and registers</h3>
        <p>
          Every cell is edited bit by bit, not as a decimal or hex number. A single click on a bit only selects
          it, the way clicking a cell in a spreadsheet does - it doesn't change the value. To flip a bit,
          double-click it, or use the keyboard: <kbd>0</kbd>/<kbd>1</kbd> set a bit explicitly, <kbd>F</kbd> flips
          it, arrow keys move the cursor, and <kbd>Enter</kbd> advances to the next bit. The "auto-advance cursor"
          option moves the cursor forward automatically after every edit, useful for typing in a program bit by
          bit. Each memory row also shows the byte as hex, decimal, ASCII, and its live decoded-instruction
          reading side by side. You can optionally mark a cell as "code" or a specific data representation to
          state which reading is the intended one - marking a two-cell instruction as code automatically marks
          its second byte as that instruction's operand. These marks are saved and loaded along with the program
          file, as a <code>% code</code> or <code>% data ...</code> annotation on that cell's line.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Selecting, moving, and copying memory rows</h3>
        <p>
          Click and drag anywhere on a row - its address, the little effect dots, or a bit - to select a range of
          whole rows (shift-click extends the current selection too); dragging over the read-only hex/decimal/
          ASCII/instruction text instead leaves it selectable as ordinary text, for copying a value out. Each row
          also has its own handle and action buttons on the left: drag the handle to move that row (or the whole
          selection, if it's part of one) to any position, or use the buttons to Clear, Delete, or Insert a blank
          row before/after - all scoped to the current selection when the row you click on is part of one, or to
          just that row otherwise. The toolbar above the grid offers the same Clear/Delete/Move up/Move down as
          one-click actions on whatever is currently selected. Copy and Paste
          (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>C</kbd>/<kbd>V</kbd>) round-trip through the same plain binary
          text format used for program files (marks aren't included), so you can paste a selection into any text
          editor and back.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Running a program</h3>
        <p>
          Step executes exactly one instruction. Run repeats that automatically at the speed set by the slider,
          until the program halts, hits an error, or you click Stop. Reset zeroes the registers (including the
          program counter) but leaves your program in memory untouched, so you can re-run the same program from
          the start. A halt is reported as either "completed normally" (the program executed HLT) or "reached
          the end of memory" (the program counter ran off the end without ever halting) - both are shown in the
          console along with any runtime error, such as an invalid instruction or an out-of-range register.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Getting help</h3>
        <p>This panel, the Instructions reference, and the ASCII table are always available from here while you work. If something looks wrong, check with whoever gave you this tool.</p>
      </section>
    </div>
  )
}
