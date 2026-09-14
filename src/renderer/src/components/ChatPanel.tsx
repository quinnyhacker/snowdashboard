import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@renderer/state/store'
import { ConfirmationModal } from './ConfirmationModal'

export function ChatPanel(): JSX.Element {
  const messages = useAppStore((s) => s.chatMessages)
  const streamingText = useAppStore((s) => s.chatStreamingText)
  const isStreaming = useAppStore((s) => s.isChatStreaming)
  const pendingConfirmations = useAppStore((s) => s.pendingConfirmations)
  const removeConfirmation = useAppStore((s) => s.removeConfirmation)
  const appendUserMessage = useAppStore((s) => s.appendUserMessage)
  const setChatStreaming = useAppStore((s) => s.setChatStreaming)
  const selectedTicketNumber = useAppStore((s) => s.selectedTicketNumber)
  const activityLog = useAppStore((s) => s.activityLog)

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streamingText])

  const send = (): void => {
    const text = input.trim()
    if (!text) return
    appendUserMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      ticketContext: selectedTicketNumber
    })
    setChatStreaming(true)
    setInput('')
    window.api.chat.sendMessage({ text, ticketNumber: selectedTicketNumber })
  }

  const handleRespond = (id: string, approve: boolean): void => {
    removeConfirmation(id)
    window.api.chat.respondConfirmation({ id, approve })
  }

  const startNew = (): void => {
    window.api.chat.startNewConversation()
    useAppStore.setState({ chatMessages: [], chatStreamingText: '' })
  }

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="text-sm font-semibold text-slate-800">Assistant</div>
        <button type="button" onClick={startNew} className="text-xs text-slate-400 hover:text-slate-600">
          New chat
        </button>
      </div>

      {selectedTicketNumber && (
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          Context: <span className="font-medium text-slate-700">{selectedTicketNumber}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !isStreaming && (
          <p className="text-sm text-slate-400">
            Ask about any ticket, or just chat. If you have a ticket open, I&rsquo;ll use it as context automatically.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
              message.role === 'user' ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
            }`}
          >
            {message.content}
          </div>
        ))}
        {isStreaming && (
          <div className="max-w-[90%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
            {streamingText || <span className="text-slate-400">Thinking…</span>}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-3 py-2">
        <div className="max-h-24 space-y-1 overflow-y-auto text-xs text-slate-400">
          {activityLog.slice(0, 3).map((entry) => (
            <div key={entry.id} className={entry.kind === 'error' ? 'text-red-500' : ''}>
              {entry.message}
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the assistant…"
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {pendingConfirmations.map((confirmation) => (
        <ConfirmationModal key={confirmation.id} confirmation={confirmation} onRespond={handleRespond} />
      ))}
    </div>
  )
}
