import type { Ticket } from '../domain/ticket'
import type { ActivityLogEntry, ChatMessage, PendingConfirmation } from '../types/chat'
import type { McpConfigFile } from '../types/mcpConfig'
import type { ViewPreferences } from '../types/preferences'
import type { EmailSummaryEntry } from '../types/email'

export interface SettingsStatus {
  hasApiKey: boolean
  mcpConfigPath: string
  mcpSource: 'local' | 'claude-desktop' | 'none'
  configuredServers: string[]
}

export interface SendMessagePayload {
  text: string
  ticketNumber?: string
}

export interface RespondConfirmationPayload {
  id: string
  approve: boolean
  editedInput?: Record<string, unknown>
}

/** The full surface exposed to the renderer via contextBridge as
 * `window.api`. Kept in one place so preload and renderer share exactly
 * the same shape. */
export interface PreloadApi {
  dashboard: {
    getAllWork: () => Promise<Ticket[]>
    getTicketDetail: (numberOrSysId: string) => Promise<Ticket | undefined>
    findTask: (query: string) => Promise<Ticket[]>
  }
  chat: {
    sendMessage: (payload: SendMessagePayload) => Promise<void>
    respondConfirmation: (payload: RespondConfirmationPayload) => Promise<void>
    startNewConversation: () => Promise<void>
    onTextDelta: (cb: (text: string) => void) => () => void
    onMessageComplete: (cb: (message: ChatMessage) => void) => () => void
    onConfirmationRequest: (cb: (confirmation: PendingConfirmation) => void) => () => void
    onActivity: (cb: (entry: ActivityLogEntry) => void) => () => void
    onError: (cb: (message: string) => void) => () => void
  }
  settings: {
    getStatus: () => Promise<SettingsStatus>
    setApiKey: (apiKey: string) => Promise<void>
    clearApiKey: () => Promise<void>
    saveMcpConfig: (config: McpConfigFile) => Promise<{ configPath: string }>
    getMcpConfigRaw: () => Promise<string>
  }
  prefs: {
    get: () => Promise<ViewPreferences>
    update: (partial: Partial<ViewPreferences>) => Promise<ViewPreferences>
  }
  email: {
    searchForTicket: (ticketNumber: string) => Promise<EmailSummaryEntry[]>
  }
}
