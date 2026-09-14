import { classifyChangeSet, type FieldChange } from '@shared/domain/actionPolicy'
import type { ConfirmationKind } from '@shared/types/chat'

/** Keys that identify *what* is being changed rather than being a field
 * value themselves — excluded when turning a tool call's input into a set
 * of field changes to classify. */
const IDENTIFIER_KEYS = new Set([
  'sys_id',
  'sysId',
  'number',
  'ticket_number',
  'table',
  'query',
  'reason'
])

/** Tools that are always high-impact regardless of their field-level
 * content, because the action itself (sending mail) is not something to
 * silently auto-apply per the spec ("never auto-send"). */
const ALWAYS_CONFIRM_TOOLS = new Set(['outlook_send_mail', 'outlook_send_draft'])

/** Tools that never mutate anything Kiewit-side and are always safe to run
 * without confirmation (read-only lookups, or draft creation which the
 * user still has to review and send themselves). */
const ALWAYS_AUTO_TOOLS = new Set([
  'get_my_work',
  'get_my_opened_tickets',
  'get_my_groups_work',
  'find_task',
  'get_knowledge',
  'search_knowledge',
  'outlook_email_search',
  'outlook_calendar_search',
  'outlook_create_draft',
  'outlook_create_reply_draft',
  'outlook_create_reply_all_draft',
  'outlook_update_draft',
  'outlook_delete_draft'
])

export interface ToolGateDecision {
  requiresConfirmation: boolean
  kind: ConfirmationKind
  changes: FieldChange[]
  summary: string
}

function bareToolName(toolName: string): string {
  // MCP tool names surfaced to the model are namespaced like
  // "mcp__servicenow__write_task"; strip the server prefix for matching.
  const parts = toolName.split('__')
  return parts[parts.length - 1] ?? toolName
}

function fieldChangesFromInput(input: Record<string, unknown>): FieldChange[] {
  const changes: FieldChange[] = []
  for (const [key, value] of Object.entries(input)) {
    if (IDENTIFIER_KEYS.has(key)) continue
    if (value === undefined) continue
    changes.push({ field: key, toValue: typeof value === 'string' ? value : JSON.stringify(value) })
  }
  return changes
}

function summarize(toolName: string, input: Record<string, unknown>, changes: FieldChange[]): string {
  const ticketRef = (input.number as string) ?? (input.sys_id as string) ?? (input.ticket_number as string)
  const target = ticketRef ? ` on ${ticketRef}` : ''

  if (bareToolName(toolName) === 'outlook_send_mail' || bareToolName(toolName) === 'outlook_send_draft') {
    const to = Array.isArray(input.to) ? (input.to as string[]).join(', ') : (input.to as string) ?? 'recipient'
    return `Send an email to ${to}${input.subject ? `: "${input.subject}"` : ''}`
  }

  if (changes.length === 0) return `Run ${bareToolName(toolName)}${target}`

  const fieldSummary = changes.map((c) => `${c.field} → ${c.toValue ?? '(cleared)'}`).join(', ')
  return `Update${target}: ${fieldSummary}`
}

export function evaluateToolCall(toolName: string, input: Record<string, unknown>): ToolGateDecision {
  const bare = bareToolName(toolName)
  const changes = fieldChangesFromInput(input)

  if (ALWAYS_CONFIRM_TOOLS.has(bare)) {
    return { requiresConfirmation: true, kind: 'email_send', changes, summary: summarize(toolName, input, changes) }
  }

  if (ALWAYS_AUTO_TOOLS.has(bare)) {
    return { requiresConfirmation: false, kind: 'other', changes, summary: summarize(toolName, input, changes) }
  }

  // Ticket-mutating tools (write_task, write_state, and anything else not
  // explicitly known) are evaluated field-by-field against the routine vs.
  // high-impact policy, failing safe to "confirm" for anything unrecognized.
  const requiresConfirmation = classifyChangeSet(changes) === 'confirm'
  return {
    requiresConfirmation,
    kind: 'ticket_update',
    changes,
    summary: summarize(toolName, input, changes)
  }
}
