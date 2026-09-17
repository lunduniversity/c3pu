/**
 * A thin, failure-safe wrapper around the one localStorage key this app
 * uses. localStorage can be unavailable or behave inconsistently when the
 * app is opened as a bare file:// page, in a private-browsing context, or
 * with site data disabled (webapp-requirements.md §11.7) - persistence is a
 * nicety, not a requirement, so every access is wrapped rather than allowed
 * to crash the app.
 */
const STORAGE_KEY = 'c3pu:state:v1'

export function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStorage(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore - nothing the user can do about it here, and nothing is lost
    // except the convenience of resuming next time.
  }
}

export function clearStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
