import type { HaltReason, RuntimeError } from '@/engine/types'

/** Human-readable system messages for the console (webapp-requirements.md
 * §6) - "informational messages like normal completion" and error reports. */
export function describeHalt(haltReason: HaltReason): string {
  return haltReason === 'normal'
    ? 'Program halted normally.'
    : 'Program counter reached the end of memory without executing HLT.'
}

export function describeError(error: RuntimeError): string {
  return `${error.message} (address ${error.address}).`
}
