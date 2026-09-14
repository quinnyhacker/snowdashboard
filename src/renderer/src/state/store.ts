import { create } from 'zustand'
import type { Ticket } from '@shared/domain/ticket'
import type { ActivityLogEntry, ChatMessage, PendingConfirmation } from '@shared/types/chat'
import { DEFAULT_PREFERENCES, type ViewPreferences } from '@shared/types/preferences'

export type ViewName = 'dashboard' | 'ticket-detail' | 'settings' | 'daily-summary'

interface AppState {
  view: ViewName
  tickets: Ticket[]
  isLoadingTickets: boolean
  lastRefreshedAt: string | undefined
  selectedTicketNumber: string | undefined

  preferences: ViewPreferences

  chatMessages: ChatMessage[]
  chatStreamingText: string
  isChatStreaming: boolean
  pendingConfirmations: PendingConfirmation[]
  activityLog: ActivityLogEntry[]

  setView: (view: ViewName) => void
  setTickets: (tickets: Ticket[]) => void
  setLoadingTickets: (loading: boolean) => void
  selectTicket: (number: string | undefined) => void
  setPreferences: (prefs: ViewPreferences) => void

  appendUserMessage: (message: ChatMessage) => void
  appendStreamDelta: (text: string) => void
  completeAssistantMessage: (message: ChatMessage) => void
  addConfirmation: (confirmation: PendingConfirmation) => void
  removeConfirmation: (id: string) => void
  addActivity: (entry: ActivityLogEntry) => void
  setChatStreaming: (streaming: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  tickets: [],
  isLoadingTickets: false,
  lastRefreshedAt: undefined,
  selectedTicketNumber: undefined,

  preferences: DEFAULT_PREFERENCES,

  chatMessages: [],
  chatStreamingText: '',
  isChatStreaming: false,
  pendingConfirmations: [],
  activityLog: [],

  setView: (view) => set({ view }),
  setTickets: (tickets) => set({ tickets, lastRefreshedAt: new Date().toISOString() }),
  setLoadingTickets: (isLoadingTickets) => set({ isLoadingTickets }),
  selectTicket: (selectedTicketNumber) =>
    set({ selectedTicketNumber, view: selectedTicketNumber ? 'ticket-detail' : 'dashboard' }),
  setPreferences: (preferences) => set({ preferences }),

  appendUserMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message], chatStreamingText: '' })),
  appendStreamDelta: (text) =>
    set((s) => ({ chatStreamingText: s.chatStreamingText + text, isChatStreaming: true })),
  completeAssistantMessage: (message) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, message],
      chatStreamingText: '',
      isChatStreaming: false
    })),
  addConfirmation: (confirmation) =>
    set((s) => ({ pendingConfirmations: [...s.pendingConfirmations, confirmation] })),
  removeConfirmation: (id) =>
    set((s) => ({ pendingConfirmations: s.pendingConfirmations.filter((c) => c.id !== id) })),
  addActivity: (entry) => set((s) => ({ activityLog: [entry, ...s.activityLog].slice(0, 100) })),
  setChatStreaming: (isChatStreaming) => set({ isChatStreaming })
}))
