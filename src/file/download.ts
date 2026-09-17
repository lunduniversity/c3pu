/**
 * Triggers a browser-native file download (webapp-requirements.md §7.2,
 * §11.6's chosen tradeoff: plain download + a file picker for Open, since
 * the File System Access API doesn't work when the app is opened as a bare
 * file:// page). No real "save in place" - each Save/Save As downloads a
 * fresh copy.
 */
export function downloadTextFile(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
