import { describe, expect, it } from 'vitest'
import { createAppState, mergeCpuState, resetExecution, toCpuState } from '../state'

describe('AppState <-> CpuState', () => {
  it('round-trips memory/registers/halt state through toCpuState/mergeCpuState', () => {
    const app = createAppState([1, 2, 3])
    const cpu = toCpuState(app)
    expect(cpu.memory).toBe(app.memory)
    expect(cpu.registers).toBe(app.registers)

    const nextCpu = { ...cpu, registers: { ...cpu.registers, R0: 42 }, halted: true, haltReason: 'normal' as const }
    const merged = mergeCpuState(app, nextCpu)
    expect(merged.registers.R0).toBe(42)
    expect(merged.halted).toBe(true)
    expect(merged.marks).toBe(app.marks) // grid-only fields untouched
  })
})

describe('resetExecution', () => {
  it('zeroes registers and clears halt/error state but leaves memory untouched', () => {
    let app = createAppState([9, 9, 9])
    app = { ...app, registers: { ...app.registers, R0: 5 }, halted: true, haltReason: 'normal', hasExecutionStarted: true }
    const reset = resetExecution(app)
    expect(reset.registers.R0).toBe(0)
    expect(reset.halted).toBe(false)
    expect(reset.haltReason).toBeNull()
    expect(reset.hasExecutionStarted).toBe(false)
    expect(reset.memory).toBe(app.memory)
  })
})
