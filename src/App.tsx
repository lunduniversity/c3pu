import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExecutionConsole } from '@/components/console/ExecutionConsole'
import { ExecutionControls } from '@/components/execution/ExecutionControls'
import { FileControls } from '@/components/file/FileControls'
import { HighlightLegend } from '@/components/grid/HighlightLegend'
import { MemoryGrid } from '@/components/grid/MemoryGrid'
import { RegisterGrid } from '@/components/grid/RegisterGrid'
import { AsciiTablePanel } from '@/components/reference/AsciiTablePanel'
import { CollapsiblePanel } from '@/components/reference/CollapsiblePanel'
import { InstructionReferencePanel } from '@/components/reference/InstructionReferencePanel'
import { UserGuidePanel } from '@/components/reference/UserGuidePanel'
import { ZoomControl } from '@/components/settings/ZoomControl'
import { decode } from '@/engine/decode'
import { useExecution } from '@/app/useExecution'
import { useFileState } from '@/app/useFileState'
import { usePersistence } from '@/app/usePersistence'

/** Ctrl/Cmd+Z (Shift held = redo) - skipped while focus is in a form
 * control, so it doesn't hijack that control's own native undo (e.g. while
 * typing in the snapshot-import field or a filename prompt). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function App() {
  const persistence = usePersistence()
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
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } = useExecution({
    initialMemory: persistence.initialMemory,
    initialMarks: persistence.initialMarks,
    initialStepDelayMs: persistence.settings.stepDelayMs,
  })
  const file = useFileState({
    memory: appState.memory,
    marks: appState.marks,
    onLoadProgram: handleLoadProgram,
    initialFileName: persistence.settings.lastFileName,
    initialBaselineMemory: persistence.initialMemory ?? null,
    initialBaselineMarks: persistence.initialMarks ?? null,
  })
  const [memoryCursorAddress, setMemoryCursorAddress] = useState<number | null>(0)

  const { settings, updateSettings } = persistence
  const autoAdvance = settings.autoAdvance
  const setAutoAdvance = (value: boolean) => updateSettings({ autoAdvance: value })

  // Persist the "resume last session" slice whenever memory/marks change -
  // usePersistence debounces the actual write (§11.10).
  useEffect(() => {
    persistence.notifySession({ memory: appState.memory, marks: appState.marks })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persistence itself is stable; only the data should retrigger this
  }, [appState.memory, appState.marks])

  // Sync the live execution speed (owned by useExecution, since Run's timer
  // needs it) into the persisted preference, and the reverse on first load.
  useEffect(() => {
    updateSettings({ stepDelayMs })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepDelayMs])

  useEffect(() => {
    updateSettings({ lastFileName: file.fileName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.fileName])

  // UI zoom/text size (§9): scales every rem-based size site-wide.
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.zoomPercent}%`
  }, [settings.zoomPercent])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      if (event.shiftKey) handleRedo()
      else handleUndo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRedo, handleUndo])

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
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold">c3pu</h1>
            <span className="text-xs text-muted-foreground">v{__APP_VERSION__}</span>
          </div>
          <ZoomControl zoomPercent={settings.zoomPercent} onChange={(zoomPercent) => updateSettings({ zoomPercent })} />
        </div>

        <FileControls file={file} />

        <div className="flex flex-wrap items-center gap-3">
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
          <Button size="sm" variant="outline" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
            Undo
          </Button>
          <Button size="sm" variant="outline" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
            Redo
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
          Auto-advance cursor after editing a bit
        </label>

        <HighlightLegend />

        {/* The main area (webapp-requirements.md §2/§4/§6): memory on the
            left, registers-over-output on the right, wide enough for both
            to read comfortably side by side (the memory grid's row is the
            widest element on the page). Below that width everything stacks
            in reading order - memory, then registers, then output - via the
            same flex-col the wide layout overrides to flex-row. */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <section className="min-w-0 xl:flex-1">
            <h2 className="mb-2 text-lg font-medium">Memory</h2>
            <MemoryGrid
              state={appState}
              onChange={applyGridEdit}
              autoAdvance={autoAdvance}
              programCounterAddress={appState.hasExecutionStarted ? appState.registers.PC : null}
              currentPcAddress={appState.registers.PC}
              lastChanged={lastChanged}
              haltedNormallyAt={haltedNormallyAt}
              errorAt={errorAt}
              onCursorChange={setMemoryCursorAddress}
              onDeleteAllData={handleDeleteAllData}
            />
          </section>

          <div className="flex min-w-0 flex-col gap-6 xl:w-[30rem] xl:shrink-0">
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
              <ExecutionConsole consoleState={consoleState} onClear={handleClearConsole} />
            </section>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
        <CollapsiblePanel
          title="User guide"
          open={settings.panelOpen.userGuide}
          onOpenChange={(open) => updateSettings({ panelOpen: { ...settings.panelOpen, userGuide: open } })}
        >
          <UserGuidePanel />
        </CollapsiblePanel>
        <CollapsiblePanel
          title="Instruction reference"
          open={settings.panelOpen.instructionReference}
          onOpenChange={(open) => updateSettings({ panelOpen: { ...settings.panelOpen, instructionReference: open } })}
        >
          <InstructionReferencePanel currentMnemonic={currentMnemonic} />
        </CollapsiblePanel>
        <CollapsiblePanel
          title="ASCII table"
          open={settings.panelOpen.asciiTable}
          onOpenChange={(open) => updateSettings({ panelOpen: { ...settings.panelOpen, asciiTable: open } })}
        >
          <AsciiTablePanel />
        </CollapsiblePanel>
      </div>
    </div>
  )
}

export default App
