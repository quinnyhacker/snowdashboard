import type { Ticket } from './ticket'

/**
 * Heuristic detector for data-sensitivity / CUI markings on ServiceNow
 * ticket content. Per Kiewit data classification policy, content carrying
 * one of these markings (or an explicit sensitivity_label field) must be
 * flagged rather than surfaced in the UI — the raw text is withheld and the
 * user is pointed to Data Privacy / the record directly in ServiceNow.
 *
 * This is a heuristic, defense-in-depth check on top of the source
 * system's own classification field — it does not replace it, and a false
 * negative here is possible for unconventional markings. It intentionally
 * favors over-flagging (a false positive just means "open it in ServiceNow
 * directly") over under-flagging.
 */
const SENSITIVITY_MARKERS: RegExp[] = [
  /\bCUI\b/,
  /controlled unclassified information/i,
  /\bITAR\b/,
  /\bEAR99?\b/,
  /export[- ]controlled/i,
  /\brestricted\b/i,
  /highly regulated/i,
  /\bNOFORN\b/,
  /\bFOUO\b/,
  /for official use only/i,
  /attorney[- ]client privileged/i,
  /\bPII\b.{0,20}\bdo not (share|distribute)/i
]

const EXPLICIT_LABELS = new Set(['cui', 'restricted', 'restricted or highly regulated'])

export function isMarkedSensitive(text: string | undefined | null): boolean {
  if (!text) return false
  return SENSITIVITY_MARKERS.some((re) => re.test(text))
}

/** Evaluate a ticket's classification label field plus its free-text
 * content and comments for sensitivity markers. */
export function evaluateSensitivity(input: {
  sensitivityLabel?: string
  shortDescription?: string
  description?: string
  comments?: { body: string }[]
}): boolean {
  const label = input.sensitivityLabel?.trim().toLowerCase()
  if (label && EXPLICIT_LABELS.has(label)) return true

  if (isMarkedSensitive(input.shortDescription)) return true
  if (isMarkedSensitive(input.description)) return true
  if (input.comments?.some((c) => isMarkedSensitive(c.body))) return true

  return false
}

/** Applies evaluateSensitivity and returns the ticket's isSensitivityFlagged
 * bit set accordingly. Does not mutate the input. */
export function withSensitivityFlag<T extends Pick<Ticket, 'sensitivityLabel' | 'shortDescription' | 'description' | 'comments'>>(
  ticket: T
): T & { isSensitivityFlagged: boolean } {
  return {
    ...ticket,
    isSensitivityFlagged: evaluateSensitivity(ticket)
  }
}
