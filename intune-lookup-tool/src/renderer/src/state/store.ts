import { create } from 'zustand'
import type { SearchMode, SearchResult } from '@shared/domain/search'
import type { BulkSearchRow } from '@shared/domain/bulkSearch'
import type { SectionKind, SectionSummary } from '@shared/types/sections'

export type { SectionKind }

export type ViewMode = 'single' | 'bulk'

export interface ColumnPickerState {
  kind: SectionKind
  headers: string[]
  guesses: Record<string, string | undefined>
}

export interface ToastState {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

interface AppState {
  device: SectionSummary
  legalHold: SectionSummary
  district: SectionSummary
  alwaysOnTop: boolean

  sectionOpen: Record<SectionKind, boolean>
  /** The column picker currently shown, if any. */
  columnPicker: ColumnPickerState | undefined
  /** Additional column pickers waiting their turn — e.g. if the device
   * export, legal hold list, and district list all need re-confirming on
   * the same startup, they're shown one at a time rather than clobbering
   * each other. */
  columnPickerQueue: ColumnPickerState[]

  searchMode: SearchMode
  searchTerm: string
  searchResult: SearchResult | undefined
  isSearching: boolean

  viewMode: ViewMode
  bulkInput: string
  bulkRows: BulkSearchRow[] | undefined
  isBulkSearching: boolean

  toast: ToastState | undefined

  setSection: (kind: SectionKind, summary: SectionSummary) => void
  toggleSection: (kind: SectionKind) => void
  setAlwaysOnTop: (value: boolean) => void
  /** Shows the picker immediately if none is active, otherwise queues it. */
  openColumnPicker: (state: ColumnPickerState) => void
  /** Dismisses the current picker and advances to the next queued one, if any. */
  closeColumnPicker: () => void
  setSearchMode: (mode: SearchMode) => void
  setSearchTerm: (term: string) => void
  setSearchResult: (result: SearchResult | undefined) => void
  setIsSearching: (value: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setBulkInput: (value: string) => void
  setBulkRows: (rows: BulkSearchRow[] | undefined) => void
  setIsBulkSearching: (value: boolean) => void
  showToast: (message: string, tone?: ToastState['tone']) => void
  dismissToast: () => void
}

let toastCounter = 0

export const useAppStore = create<AppState>((set) => ({
  device: { status: 'empty' },
  legalHold: { status: 'empty' },
  district: { status: 'empty' },
  alwaysOnTop: true,

  sectionOpen: { device: true, legalHold: true, district: true },
  columnPicker: undefined,
  columnPickerQueue: [],

  searchMode: 'user',
  searchTerm: '',
  searchResult: undefined,
  isSearching: false,

  viewMode: 'single',
  bulkInput: '',
  bulkRows: undefined,
  isBulkSearching: false,

  toast: undefined,

  setSection: (kind, summary) =>
    set((s) => ({
      [kind]: summary,
      sectionOpen: { ...s.sectionOpen, [kind]: summary.status !== 'loaded' }
    })),
  toggleSection: (kind) => set((s) => ({ sectionOpen: { ...s.sectionOpen, [kind]: !s.sectionOpen[kind] } })),
  setAlwaysOnTop: (alwaysOnTop) => set({ alwaysOnTop }),
  openColumnPicker: (state) =>
    set((s) => (s.columnPicker ? { columnPickerQueue: [...s.columnPickerQueue, state] } : { columnPicker: state })),
  closeColumnPicker: () =>
    set((s) => {
      const [next, ...rest] = s.columnPickerQueue
      return { columnPicker: next, columnPickerQueue: rest }
    }),
  setSearchMode: (searchMode) => set({ searchMode, searchResult: undefined }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSearchResult: (searchResult) => set({ searchResult }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setViewMode: (viewMode) => set({ viewMode }),
  setBulkInput: (bulkInput) => set({ bulkInput }),
  setBulkRows: (bulkRows) => set({ bulkRows }),
  setIsBulkSearching: (isBulkSearching) => set({ isBulkSearching }),
  showToast: (message, tone = 'info') => {
    const id = ++toastCounter
    set({ toast: { id, message, tone } })
  },
  dismissToast: () => set({ toast: undefined })
}))
