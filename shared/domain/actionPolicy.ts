/**
 * Classifies a proposed ServiceNow field update as either something the
 * chat agent may apply automatically, or something that must be shown to
 * the user for explicit confirmation before it is submitted.
 *
 * Rules (per product spec):
 *  - Routine: state changes (except into a terminal/closing state), work
 *    notes, comments, and other "standard" field updates.
 *  - Always confirm: reassignment (assignment_group / assigned_to),
 *    priority changes, and closing/resolving a ticket.
 *  - Fail-safe default: any field not on the known-routine allowlist is
 *    treated as high-impact and requires confirmation. This is the
 *    mechanism that catches "anything unusual" per the spec, without
 *    trying to enumerate every unusual case.
 */

export type ActionClass = 'auto' | 'confirm'

export const TERMINAL_STATES = new Set(['Resolved', 'Closed', 'Cancelled'])

/** Fields that are always high-impact regardless of value. */
const ALWAYS_CONFIRM_FIELDS = new Set(['assignment_group', 'assigned_to', 'priority', 'urgency', 'impact'])

/** Fields that are routine as long as they don't hit a special case above. */
const ROUTINE_FIELDS = new Set([
  'state',
  'work_notes',
  'comments',
  'comment',
  'short_description',
  'description',
  'category',
  'subcategory'
])

export interface FieldChange {
  field: string
  fromValue?: string
  toValue?: string
}

export function classifyFieldChange(change: FieldChange): ActionClass {
  const { field, toValue } = change

  if (ALWAYS_CONFIRM_FIELDS.has(field)) return 'confirm'

  if (field === 'state') {
    if (toValue && TERMINAL_STATES.has(toValue)) return 'confirm'
    return 'auto'
  }

  if (ROUTINE_FIELDS.has(field)) return 'auto'

  // Unknown field: fail safe.
  return 'confirm'
}

/** A batch of changes is auto-appliable only if every individual change is.
 * One high-impact field in a multi-field update pulls the whole update into
 * confirmation, so the user reviews it as a single coherent change. */
export function classifyChangeSet(changes: FieldChange[]): ActionClass {
  if (changes.length === 0) return 'auto'
  return changes.some((c) => classifyFieldChange(c) === 'confirm') ? 'confirm' : 'auto'
}
