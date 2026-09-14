import Store from 'electron-store'
import { DEFAULT_PREFERENCES, type ViewPreferences } from '@shared/types/preferences'

/**
 * Persists only UI view preferences (filters, sort, layout) between
 * sessions, as required by the spec. Deliberately does NOT persist ticket
 * content, chat transcripts, or anything derived from ServiceNow/Outlook
 * data — that stays in memory for the current app session only, per the
 * "don't cache raw ticket data outside the local app session" requirement.
 */
const store = new Store<ViewPreferences>({
  name: 'preferences',
  defaults: DEFAULT_PREFERENCES
})

export function getPreferences(): ViewPreferences {
  return store.store
}

export function updatePreferences(partial: Partial<ViewPreferences>): ViewPreferences {
  store.set({ ...store.store, ...partial })
  return store.store
}
