/**
 * A barcode/QR scanner acts like a keyboard: it types the decoded text
 * then sends an Enter keystroke. This turns that into "live scanning":
 * when Enter is pressed with the cursor at the very end of the textarea,
 * the line that was just completed is pulled out to be looked up
 * immediately, leaving everything before it untouched in the box.
 *
 * Deliberately only fires when the cursor is at the end — if someone is
 * editing earlier text and presses Enter there, this backs off and lets
 * the textarea insert a normal newline instead of guessing.
 */
export interface CompletedLine {
  /** The line that was just finished, trimmed. */
  line: string
  /** The textarea's new value with that line removed. */
  remaining: string
}

export function extractCompletedLineOnEnter(
  value: string,
  selectionStart: number,
  selectionEnd: number
): CompletedLine | undefined {
  if (selectionStart !== value.length || selectionEnd !== value.length) return undefined

  const lines = value.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  if (!lastLine) return undefined

  const remainingLines = lines.slice(0, -1).join('\n')
  return { line: lastLine, remaining: remainingLines ? `${remainingLines}\n` : '' }
}
