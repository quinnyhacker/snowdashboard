import type { InitialState, SectionKind, SectionSummary } from '../types/sections'
import type { SearchMode, SearchResult } from '../domain/search'
import type { BulkSearchRow } from '../domain/bulkSearch'

export interface SectionUpdate {
  kind: SectionKind
  summary: SectionSummary
}

export interface PreloadApi {
  app: {
    getInitialState: () => Promise<InitialState>
    setAlwaysOnTop: (value: boolean) => Promise<void>
  }
  device: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { deviceCol: string; userCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
    refresh: () => Promise<SectionSummary>
  }
  legalHold: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { firstCol: string; lastCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
    refresh: () => Promise<SectionSummary>
  }
  district: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { firstCol: string; lastCol: string; workCol: string; homeCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
    refresh: () => Promise<SectionSummary>
  }
  search: {
    run: (params: { mode: SearchMode; term: string }) => Promise<SearchResult>
    runBulk: (params: { mode: SearchMode; terms: string[] }) => Promise<BulkSearchRow[]>
  }
  sync: {
    /** Fires whenever a background poll finds that a loaded file's
     * contents changed on disk and re-parsed it automatically — e.g.
     * someone overwrote a shared network file. */
    onSectionUpdated: (cb: (update: SectionUpdate) => void) => () => void
  }
}
