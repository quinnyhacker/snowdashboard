import { randomUUID } from 'node:crypto'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { CanUseTool, McpServerConfig, PermissionResult } from '@anthropic-ai/claude-agent-sdk'
import type { Ticket } from '@shared/domain/ticket'
import type { ActivityLogEntry, ChatMessage, PendingConfirmation } from '@shared/types/chat'
import type { McpServerConfigEntry } from '@shared/types/mcpConfig'
import { evaluateToolCall } from './toolGate'

const SYSTEM_PROMPT = `You are the embedded assistant inside the ServiceNow Command Center desktop app.
You help the user (a Kiewit employee) triage and act on their ServiceNow work items and draft related emails.

Rules you must follow:
- You only have access to ServiceNow and Microsoft 365 tools provided via MCP. You have no filesystem, shell, or code execution access.
- When asked to update a ticket, call the appropriate ServiceNow tool directly. Routine changes (state transitions that aren't closing the ticket, work notes, comments, standard field edits) are applied automatically. Reassignment, priority changes, and closing/resolving a ticket require the user's explicit confirmation — that confirmation is handled outside of you, by the app; just make the tool call and the app will pause for approval when needed.
- Never send an email yourself. Outlook drafting tools only create drafts for the user to review and send. If asked to "send" an email, create the draft and tell the user it is ready for their review — the app will require explicit confirmation before any send action.
- If ticket content appears to carry a data sensitivity marking (CUI, ITAR/export-controlled, Restricted, FOUO, attorney-client privileged), do not restate or summarize the sensitive content back to the user — tell them it is flagged and to review it directly in ServiceNow.
- Be concise. You are shown in a docked chat panel, not a document editor.`

export interface ChatEngineCallbacks {
  onTextDelta: (text: string) => void
  onMessageComplete: (message: ChatMessage) => void
  onConfirmationRequest: (confirmation: PendingConfirmation) => void
  onActivity: (entry: ActivityLogEntry) => void
  onError: (message: string) => void
}

interface PendingConfirmationHandle {
  confirmation: PendingConfirmation
  resolve: (result: PermissionResult) => void
}

function toAgentSdkServers(servers: Record<string, McpServerConfigEntry>): Record<string, McpServerConfig> {
  const out: Record<string, McpServerConfig> = {}
  for (const [name, config] of Object.entries(servers)) {
    if (config.type === 'sse' || config.type === 'http') {
      out[name] = config
    } else {
      out[name] = { type: 'stdio', command: config.command, args: config.args, env: config.env }
    }
  }
  return out
}

function buildTicketContextBlock(ticket: Ticket): string {
  return [
    `[Current ticket context: ${ticket.number} — ${ticket.shortDescription}]`,
    `State: ${ticket.state} | Priority: ${ticket.priority} | Assignment group: ${ticket.assignmentGroup}`,
    ticket.isSensitivityFlagged
      ? '(This ticket is flagged for a data sensitivity marking; its content is withheld from this chat.)'
      : '',
    ''
  ]
    .filter(Boolean)
    .join('\n')
}

function extractTextDelta(event: unknown): string | undefined {
  const e = event as { type?: string; delta?: { type?: string; text?: string } }
  if (e?.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
    return e.delta.text
  }
  return undefined
}

function extractFinalText(message: unknown): string {
  const content = (message as { message?: { content?: unknown[] } })?.message?.content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block): block is { type: string; text: string } => (block as { type?: string }).type === 'text')
    .map((block) => block.text)
    .join('')
}

export class ChatEngine {
  private sessionId: string | undefined
  private pendingConfirmations = new Map<string, PendingConfirmationHandle>()

  constructor(
    private readonly callbacks: ChatEngineCallbacks,
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getMcpServers: () => Promise<Record<string, McpServerConfigEntry>>
  ) {}

  resolveConfirmation(id: string, approve: boolean, editedInput?: Record<string, unknown>): void {
    const pending = this.pendingConfirmations.get(id)
    if (!pending) return
    this.pendingConfirmations.delete(id)

    if (approve) {
      this.callbacks.onActivity({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        kind: 'confirmed-update',
        message: pending.confirmation.summary,
        ticketNumber: pending.confirmation.ticketNumber
      })
      pending.resolve({
        behavior: 'allow',
        updatedInput: editedInput ?? pending.confirmation.rawInput
      })
    } else {
      this.callbacks.onActivity({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        kind: 'declined-update',
        message: `Declined: ${pending.confirmation.summary}`,
        ticketNumber: pending.confirmation.ticketNumber
      })
      pending.resolve({
        behavior: 'deny',
        message: 'The user declined this change. Do not retry it silently — ask if they want to do something different.',
        interrupt: false
      })
    }
  }

  /** Rejects any confirmations left waiting when a query ends/aborts, so we
   * never leak a hung promise. */
  private cancelAllPending(reason: string): void {
    for (const [id, pending] of this.pendingConfirmations) {
      pending.resolve({ behavior: 'deny', message: reason, interrupt: true })
      this.pendingConfirmations.delete(id)
    }
  }

  startNewConversation(): void {
    this.sessionId = undefined
  }

  async sendMessage(text: string, ticketContext?: Ticket): Promise<void> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      this.callbacks.onError('No Anthropic API key configured. Add one in Settings before chatting.')
      return
    }

    const servers = await this.getMcpServers()
    const mcpServers = toAgentSdkServers(servers)

    const prompt = ticketContext ? `${buildTicketContextBlock(ticketContext)}${text}` : text

    const canUseTool: CanUseTool = async (toolName, input, opts) => {
      const decision = evaluateToolCall(toolName, input)

      if (!decision.requiresConfirmation) {
        this.callbacks.onActivity({
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          kind: 'auto-update',
          message: decision.summary,
          ticketNumber: ticketContext?.number
        })
        return { behavior: 'allow', updatedInput: input }
      }

      return new Promise<PermissionResult>((resolve) => {
        const confirmation: PendingConfirmation = {
          id: randomUUID(),
          kind: decision.kind,
          toolName,
          summary: decision.summary,
          ticketNumber: ticketContext?.number,
          changes: decision.changes,
          rawInput: input,
          requestedAt: new Date().toISOString()
        }
        this.pendingConfirmations.set(confirmation.id, { confirmation, resolve })
        this.callbacks.onConfirmationRequest(confirmation)

        opts.signal.addEventListener('abort', () => {
          if (this.pendingConfirmations.delete(confirmation.id)) {
            resolve({ behavior: 'deny', message: 'Cancelled.', interrupt: true })
          }
        })
      })
    }

    try {
      const stream = query({
        prompt,
        options: {
          resume: this.sessionId,
          model: 'claude-sonnet-4-5-20250929',
          systemPrompt: SYSTEM_PROMPT,
          tools: [],
          mcpServers,
          permissionMode: 'default',
          includePartialMessages: true,
          persistSession: false,
          env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
          canUseTool
        }
      })

      let finalText = ''

      for await (const message of stream) {
        if (message.type === 'system' && message.subtype === 'init') {
          this.sessionId = message.session_id
        } else if (message.type === 'stream_event') {
          const delta = extractTextDelta(message.event)
          if (delta) this.callbacks.onTextDelta(delta)
        } else if (message.type === 'assistant') {
          const text = extractFinalText(message)
          if (text) finalText = text
        } else if (message.type === 'result') {
          this.sessionId = message.session_id
          if (message.is_error) {
            this.callbacks.onError(`Chat turn ended with an error: ${message.subtype}`)
          }
        }
      }

      this.callbacks.onMessageComplete({
        id: randomUUID(),
        role: 'assistant',
        content: finalText,
        createdAt: new Date().toISOString(),
        ticketContext: ticketContext?.number
      })
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown chat error')
    } finally {
      this.cancelAllPending('The conversation turn ended before this could be confirmed.')
    }
  }
}
