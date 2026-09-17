import tinyProgram from '../../docs/examples/tiny_program.txt?raw'
import simpleAdd from '../../docs/examples/simple_add.txt?raw'
import simpleLoop from '../../docs/examples/simple_loop.txt?raw'
import helloWorld from '../../docs/examples/hello_world.txt?raw'
import helloWorldLoop from '../../docs/examples/hello_world_loop.txt?raw'
import segfault from '../../docs/examples/segfault.txt?raw'
import segfaultInfLoop from '../../docs/examples/segfault_inf_loop.txt?raw'

/**
 * The bundled example programs (webapp-requirements.md §7.4). Imported with
 * Vite's `?raw` suffix so their text is inlined into the single-file build
 * at compile time - the app has no server to fetch them from at runtime.
 */
export interface ExampleProgram {
  id: string
  label: string
  description: string
  text: string
}

export const EXAMPLE_PROGRAMS: readonly ExampleProgram[] = [
  {
    id: 'tiny_program',
    label: 'Tiny program',
    description: 'Minimal complete program (load a value, print it, halt) - smallest possible smoke test.',
    text: tinyProgram,
  },
  {
    id: 'simple_add',
    label: 'Simple add',
    description: 'Loads two values, adds them, prints the result - canonical arithmetic demo.',
    text: simpleAdd,
  },
  {
    id: 'simple_loop',
    label: 'Simple loop',
    description: 'Uses a register as a loop counter with CJP to repeat a block a fixed number of times.',
    text: simpleLoop,
  },
  {
    id: 'hello_world',
    label: 'Hello world',
    description: 'Prints "HELLO WORLD!" via one load+print instruction pair per character.',
    text: helloWorld,
  },
  {
    id: 'hello_world_loop',
    label: 'Hello world (via PRL)',
    description: 'Prints the same message, stored as data in memory and emitted via the print-loop instruction.',
    text: helloWorldLoop,
  },
  {
    id: 'segfault',
    label: 'Segfault',
    description: 'Deliberately reads/writes out of bounds - demonstrates the out-of-range error.',
    text: segfault,
  },
  {
    id: 'segfault_inf_loop',
    label: 'Segfault (infinite loop)',
    description: 'Same fault, structured to re-trigger in a loop - demonstrates the stuck-program/step-cap guard.',
    text: segfaultInfLoop,
  },
]
