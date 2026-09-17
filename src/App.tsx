import { useMemo, useState } from 'react'
import { ExecutionConsole } from '@/components/console/ExecutionConsole'
import { ExecutionControls } from '@/components/execution/ExecutionControls'
import { FileControls } from '@/components/file/FileControls'
import { MemoryGrid } from '@/components/grid/MemoryGrid'
import { RegisterGrid } from '@/components/grid/RegisterGrid'
import { AsciiTablePanel } from '@/components/reference/AsciiTablePanel'
import { CollapsiblePanel } from '@/components/reference/CollapsiblePanel'
import { InstructionReferencePanel } from '@/components/reference/InstructionReferencePanel'
import { UserGuidePanel } from '@/components/reference/UserGuidePanel'
import { decode } from '@/engine/decode'
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
  const [userGuideOpen, setUserGuideOpen] = useState(false)
  const [instructionReferenceOpen, setInstructionReferenceOpen] = useState(false)
  const [asciiTableOpen, setAsciiTableOpen] = useState(false)

  // Predictive highlighting follows the edit cursor while idle, and the
  // program counter once execution has started (webapp-requirements.md §5).
  const predictionSource = appState.hasExecutionStarted ? appState.registers.PC : memoryCursorAddress
  const haltedNormallyAt = appState.halted && appState.haltReason === 'normal' ? appState.registers.PC : null
  const errorAt = appState.error ? appState.error.address : null

  // §8: "the instruction corresponding to whatever the cursor/PC is
  // currently on should be highlighted" in the instruction reference panel.
  const currentMnemonic = useMemo(
    () => (predictionSource === null ? null : decode(appState.memory, predictionSource).mnemonic),
    [appState.memory, predictionSource],
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
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

      <div className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
        <CollapsiblePanel title="User guide" open={userGuideOpen} onOpenChange={setUserGuideOpen}>
          <UserGuidePanel />
        </CollapsiblePanel>
        <CollapsiblePanel title="Instruction reference" open={instructionReferenceOpen} onOpenChange={setInstructionReferenceOpen}>
          <InstructionReferencePanel currentMnemonic={currentMnemonic} />
        </CollapsiblePanel>
        <CollapsiblePanel title="ASCII table" open={asciiTableOpen} onOpenChange={setAsciiTableOpen}>
          <AsciiTablePanel />
        </CollapsiblePanel>
      </div>
    </div>
  )
}

export default App
