import { useState } from 'react'
import { ExecutionConsole } from '@/components/console/ExecutionConsole'
import { ExecutionControls } from '@/components/execution/ExecutionControls'
import { FileControls } from '@/components/file/FileControls'
import { MemoryGrid } from '@/components/grid/MemoryGrid'
import { RegisterGrid } from '@/components/grid/RegisterGrid'
import { useExecution } from '@/app/useExecution'
import { useFileState } from '@/app/useFileState'

function App() {
  const {
    appState,
    applyGridEdit,
    consoleState,
    isRunning,
    stepDelayMs,
    setStepDelayMs,
    lastChanged,
    handleStep,
    handleRunToggle,
    handleReset,
    handleClearConsole,
    handleDeleteAllData,
    handleLoadProgram,
  } = useExecution()
  const file = useFileState({ memory: appState.memory, onLoadProgram: handleLoadProgram })
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [memoryCursorAddress, setMemoryCursorAddress] = useState<number | null>(0)

  // Predictive highlighting follows the edit cursor while idle, and the
  // program counter once execution has started (webapp-requirements.md §5).
  const predictionSource = appState.hasExecutionStarted ? appState.registers.PC : memoryCursorAddress
  const haltedNormallyAt = appState.halted && appState.haltReason === 'normal' ? appState.registers.PC : null
  const errorAt = appState.error ? appState.error.address : null

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">c3pu</h1>

      <FileControls file={file} />

      <ExecutionControls
        isRunning={isRunning}
        halted={appState.halted}
        haltReason={appState.haltReason}
        error={appState.error}
        stepDelayMs={stepDelayMs}
        onStep={handleStep}
        onRunToggle={handleRunToggle}
        onReset={handleReset}
        onStepDelayChange={setStepDelayMs}
      />

      <ExecutionConsole consoleState={consoleState} onClear={handleClearConsole} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
        Auto-advance cursor after editing a bit
      </label>

      <section>
        <h2 className="mb-2 text-lg font-medium">Registers</h2>
        <RegisterGrid
          state={appState}
          onChange={applyGridEdit}
          autoAdvance={autoAdvance}
          memoryCursorAddress={predictionSource}
          lastChanged={lastChanged}
        />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-medium">Memory</h2>
        <MemoryGrid
          state={appState}
          onChange={applyGridEdit}
          autoAdvance={autoAdvance}
          programCounterAddress={appState.hasExecutionStarted ? appState.registers.PC : null}
          lastChanged={lastChanged}
          haltedNormallyAt={haltedNormallyAt}
          errorAt={errorAt}
          onCursorChange={setMemoryCursorAddress}
          onDeleteAllData={handleDeleteAllData}
        />
      </section>
    </div>
  )
}

export default App
