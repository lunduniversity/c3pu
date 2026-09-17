import { useState } from 'react'
import { MemoryGrid } from '@/components/grid/MemoryGrid'
import { RegisterGrid } from '@/components/grid/RegisterGrid'
import { createGridState, type GridState } from '@/grid/model'

function App() {
  const [state, setState] = useState<GridState>(() => createGridState())
  const [autoAdvance, setAutoAdvance] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">c3pu</h1>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
        Auto-advance cursor after editing a bit
      </label>
      <section>
        <h2 className="mb-2 text-lg font-medium">Registers</h2>
        <RegisterGrid state={state} onChange={setState} autoAdvance={autoAdvance} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-medium">Memory</h2>
        <MemoryGrid state={state} onChange={setState} autoAdvance={autoAdvance} />
      </section>
    </div>
  )
}

export default App
