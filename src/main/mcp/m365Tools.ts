import { M365_SERVER_NAME } from '@shared/types/mcpConfig'
import type { EmailSummaryEntry } from '@shared/types/email'
import { mcpClientManager } from './mcpClientManager'
import { extractToolPayload } from './normalize'

/**
 * Direct (non-chat) Microsoft 365 MCP calls. Drafting emails requires
 * Claude to compose the actual text, so that flow always goes through the
 * chat/agent engine (src/main/agent), which holds its own MCP connection
 * to the same server. This module covers the read-only lookups that don't
 * need an LLM turn — e.g. pulling recent emails related to a ticket so the
 * chat engine can be handed real context instead of guessing at it.
 */

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

export async function searchEmailsForTicket(ticketNumber: string): Promise<EmailSummaryEntry[]> {
  const result = await mcpClientManager.callTool(M365_SERVER_NAME, 'outlook_email_search', {
    query: ticketNumber
  })
  const payload = extractToolPayload(result)
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.results)
      ? ((payload as Record<string, unknown>).results as unknown[])
      : []

  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((record, index) => ({
      id: firstString(record, ['id', 'messageId']) ?? String(index),
      from: firstString(record, ['from', 'sender']) ?? 'Unknown sender',
      subject: firstString(record, ['subject']) ?? '(no subject)',
      receivedAt: firstString(record, ['receivedAt', 'received_at', 'date']) ?? new Date().toISOString(),
      snippet: firstString(record, ['snippet', 'bodyPreview', 'preview']) ?? ''
    }))
}
