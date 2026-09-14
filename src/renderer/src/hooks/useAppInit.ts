import { useEffect } from 'react'
import { randomId } from '@renderer/lib/randomId'
import { useAppStore } from '@renderer/state/store'

/** Wires up the renderer on mount: loads persisted preferences, fetches the
 * initial ticket set, subscribes to chat/activity events pushed from the
 * main process, and sets up the auto-refresh interval. */
export function useAppInit(): void {
  const setPreferences = useAppStore((s) => s.setPreferences)
  const setTickets = useAppStore((s) => s.setTickets)
  const setLoadingTickets = useAppStore((s) => s.setLoadingTickets)
  const appendStreamDelta = useAppStore((s) => s.appendStreamDelta)
  const completeAssistantMessage = useAppStore((s) => s.completeAssistantMessage)
  const addConfirmation = useAppStore((s) => s.addConfirmation)
  const addActivity = useAppStore((s) => s.addActivity)
  const preferences = useAppStore((s) => s.preferences)

  useEffect(() => {
    let cancelled = false

    window.api.prefs.get().then((prefs) => {
      if (!cancelled) setPreferences(prefs)
    })

    const refresh = (): void => {
      setLoadingTickets(true)
      window.api.dashboard
        .getAllWork()
        .then((tickets) => {
          if (!cancelled) setTickets(tickets)
        })
        .catch((error) => {
          addActivity({
            id: randomId(),
            timestamp: new Date().toISOString(),
            kind: 'error',
            message: `Failed to refresh tickets: ${error instanceof Error ? error.message : String(error)}`
          })
        })
        .finally(() => {
          if (!cancelled) setLoadingTickets(false)
        })
    }

    refresh()

    const unsubscribers = [
      window.api.chat.onTextDelta(appendStreamDelta),
      window.api.chat.onMessageComplete(completeAssistantMessage),
      window.api.chat.onConfirmationRequest(addConfirmation),
      window.api.chat.onActivity(addActivity),
      window.api.chat.onError((message) =>
        addActivity({ id: randomId(), timestamp: new Date().toISOString(), kind: 'error', message })
      )
    ]

    return () => {
      cancelled = true
      unsubscribers.forEach((unsub) => unsub())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      window.api.dashboard.getAllWork().then(setTickets).catch(() => undefined)
    }, preferences.autoRefreshMs)
    return () => clearInterval(interval)
  }, [preferences.autoRefreshMs, setTickets])
}
