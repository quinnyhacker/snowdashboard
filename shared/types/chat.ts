import type { FieldChange } from '../domain/actionPolicy'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  /** Ticket number this message was sent with as context, if any. */
  ticketContext?: string
}

export type ConfirmationKind = 'ticket_update' | 'email_send' | 'other'

export interface PendingConfirmation {
  id: string
  kind: ConfirmationKind
  toolName: string
  /** Human-readable summary of what's about to happen, for the modal. */
  summary: string
  ticketNumber?: string
  changes: FieldChange[]
  rawInput: Record<string, unknown>
  requestedAt: string
}

export type ActivityLogKind = 'auto-update' | 'confirmed-update' | 'declined-update' | 'chat' | 'error' | 'notification'

export interface ActivityLogEntry {
  id: string
  timestamp: string
  kind: ActivityLogKind
  message: string
  ticketNumber?: string
}
