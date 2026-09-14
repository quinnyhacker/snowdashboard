import type { Ticket, TicketComment } from '@shared/domain/ticket'
import { evaluateSensitivity } from '@shared/domain/sensitivity'

/**
 * ServiceNow MCP tool responses are JSON but their exact field naming
 * varies by tool/instance configuration (snake_case ServiceNow field names
 * are common). This normalizer is deliberately tolerant of that and maps
 * whatever it can find into the app's internal Ticket shape, rather than
 * assuming one rigid schema.
 */

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
    if (value && typeof value === 'object' && 'display_value' in (value as Record<string, unknown>)) {
      const dv = (value as Record<string, unknown>).display_value
      if (typeof dv === 'string' && dv.length > 0) return dv
    }
  }
  return undefined
}

function normalizeComments(raw: unknown): TicketComment[] {
  if (!Array.isArray(raw)) return []
  return raw.map((entry, index) => {
    const record = (entry ?? {}) as Record<string, unknown>
    return {
      id: firstString(record, ['sys_id', 'id']) ?? String(index),
      author: firstString(record, ['author', 'sys_created_by', 'user']) ?? 'Unknown',
      body: firstString(record, ['value', 'body', 'text', 'comment']) ?? '',
      createdAt: firstString(record, ['sys_created_on', 'created_at', 'timestamp']) ?? new Date().toISOString(),
      isWorkNote: Boolean(record.is_work_note ?? record.isWorkNote ?? record.element === 'work_notes')
    }
  })
}

export function normalizeTicket(raw: Record<string, unknown>): Ticket {
  const shortDescription = firstString(raw, ['short_description', 'shortDescription', 'title']) ?? '(no title)'
  const description = firstString(raw, ['description', 'details'])
  const comments = normalizeComments(raw.comments ?? raw.activity ?? raw.journal)
  const sensitivityLabel = firstString(raw, ['sensitivity_label', 'u_data_classification', 'classification'])

  const ticket: Ticket = {
    sysId: firstString(raw, ['sys_id', 'sysId', 'id']) ?? crypto.randomUUID(),
    number: firstString(raw, ['number', 'ticket_number']) ?? '(unknown)',
    shortDescription,
    description,
    table: firstString(raw, ['table', 'sys_class_name']) ?? 'incident',
    state: firstString(raw, ['state', 'status']) ?? 'New',
    priority: firstString(raw, ['priority']) ?? 'Unspecified',
    assignmentGroup: firstString(raw, ['assignment_group', 'assignmentGroup']) ?? 'Unassigned',
    assignedTo: firstString(raw, ['assigned_to', 'assignedTo']),
    requestedFor: firstString(raw, ['requested_for', 'caller_id', 'requestedFor']),
    dueDate: firstString(raw, ['due_date', 'dueDate']),
    slaDueDate: firstString(raw, ['sla_due', 'business_duration', 'sla_due_date']),
    createdAt: firstString(raw, ['sys_created_on', 'opened_at', 'createdAt']) ?? new Date().toISOString(),
    updatedAt: firstString(raw, ['sys_updated_on', 'updatedAt']) ?? new Date().toISOString(),
    comments,
    sensitivityLabel,
    isSensitivityFlagged: false
  }

  ticket.isSensitivityFlagged = evaluateSensitivity(ticket)
  return ticket
}

/** MCP `callTool` results wrap the actual payload as one or more content
 * blocks; ServiceNow tools here are expected to return a JSON text block. */
export function extractToolPayload(result: unknown): unknown {
  const content = (result as { content?: unknown[] } | undefined)?.content
  if (!Array.isArray(content)) return result

  for (const block of content) {
    const b = block as { type?: string; text?: string }
    if (b.type === 'text' && typeof b.text === 'string') {
      try {
        return JSON.parse(b.text)
      } catch {
        return b.text
      }
    }
  }
  return result
}

export function normalizeTicketList(payload: unknown): Ticket[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.result)
      ? ((payload as Record<string, unknown>).result as unknown[])
      : Array.isArray((payload as Record<string, unknown>)?.tickets)
        ? ((payload as Record<string, unknown>).tickets as unknown[])
        : []

  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(normalizeTicket)
}
