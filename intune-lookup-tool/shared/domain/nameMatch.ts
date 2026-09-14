/**
 * Name-matching logic ported from the original PowerShell tool's
 * Get-NameParts / Normalize-NamePart / Get-NameKey functions, used to
 * cross-reference a user (from the device export, "first.last@kiewit.com"
 * style) against the legal hold and district lists (which are keyed by
 * separate First/Last name columns).
 */

export interface NameParts {
  first: string
  last: string
}

/** Splits a "first.last@domain" (or first_last / first last) style user
 * string into first/last name guesses. Trailing digits on the last name
 * (e.g. disambiguation suffixes like "smith2") are stripped. Returns
 * undefined when the input doesn't look like it has at least two parts. */
export function getNameParts(userString: string | undefined | null): NameParts | undefined {
  if (!userString) return undefined

  const local = userString.split('@')[0]
  const pieces = local.split(/[.\s_]/)
  if (pieces.length < 2) return undefined

  const first = pieces[0]
  const last = pieces[pieces.length - 1].replace(/\d+$/, '')
  if (!first || !last) return undefined

  return { first, last }
}

/** Lowercases and strips everything but letters, so "O'Brien", "obrien",
 * and "O.Brien" all normalize to the same key. */
export function normalizeNamePart(text: string | undefined | null): string {
  if (!text) return ''
  return text.replace(/[^a-zA-Z]/g, '').toLowerCase()
}

export function getNameKey(first: string, last: string): string {
  return `${normalizeNamePart(first)}|${normalizeNamePart(last)}`
}

/** Convenience: derive the lookup key directly from a user string (email
 * or "first.last"), or undefined if it can't be parsed into two parts. */
export function getNameKeyFromUser(userString: string | undefined | null): string | undefined {
  const parts = getNameParts(userString)
  if (!parts) return undefined
  return getNameKey(parts.first, parts.last)
}
