import type { InitialState, SectionSummary } from '../types/sections'
import type { SearchMode, SearchResult } from '../domain/search'

export interface PreloadApi {
  app: {
    getInitialState: () => Promise<InitialState>
    setAlwaysOnTop: (value: boolean) => Promise<void>
  }
  device: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { deviceCol: string; userCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
  }
  legalHold: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { firstCol: string; lastCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
  }
  district: {
    browse: () => Promise<SectionSummary | undefined>
    confirmColumns: (columns: { firstCol: string; lastCol: string; workCol: string; homeCol: string }) => Promise<SectionSummary>
    changeColumns: () => Promise<SectionSummary | undefined>
  }
  search: {
    run: (params: { mode: SearchMode; term: string }) => Promise<SearchResult>
  }
}
