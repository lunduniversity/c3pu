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
          File controls (Open/Save/Examples/Snapshot) and Execution controls (Step/Run/Reset) sit at the top.
          Below them is the Output console, then the Registers grid (8 named registers) and the Memory grid
          (256 addressable cells). These reference panels dock alongside that main view rather than covering it.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Editing memory and registers</h3>
        <p>
          Every cell is edited bit by bit, not as a decimal or hex number - click a bit to flip it, or use the
          keyboard: <kbd>0</kbd>/<kbd>1</kbd> set a bit explicitly, <kbd>F</kbd> flips it, arrow keys move the
          cursor, and <kbd>Enter</kbd> advances to the next bit. The "auto-advance cursor" option moves the
          cursor forward automatically after every edit, useful for typing in a program bit by bit. Each memory
          row also shows the byte as hex, decimal, ASCII, and its live decoded-instruction reading side by side.
          You can optionally mark a cell as "code" or a specific data representation to state which reading is
          the intended one - marking a two-cell instruction as code automatically marks its second byte as that
          instruction's operand.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-medium">Selecting, moving, and copying</h3>
        <p>
          Click and drag across memory rows (or shift-click) to select a range of whole cells. With a selection
          active: Clear zeroes the selected cells in place, Delete removes them and shifts everything after up
          to close the gap, and Move up/down shifts the selected block past its neighbor. Copy and Paste
          (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>C</kbd>/<kbd>V</kbd>) round-trip through the same plain binary
          text format used for program files, so you can paste a selection into any text editor and back.
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
