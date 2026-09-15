export type SectionKind = 'device' | 'legalHold' | 'district'

/** Status of one of the three loadable data sources, mirrored in the
 * sidebar. "needs-columns" means a file was read and is waiting on the
 * user to confirm which columns to use (shown as a modal). */
export type SectionStatus = 'empty' | 'loaded' | 'needs-columns' | 'error'

export interface SectionSummary {
  status: SectionStatus
  fileName?: string
  count?: number
  message?: string
  /** Present only when status is 'needs-columns': headers to populate the
   * column picker with, plus best-guess selections. */
  headers?: string[]
  guesses?: Record<string, string | undefined>
}

export interface InitialState {
  device: SectionSummary
  legalHold: SectionSummary
  district: SectionSummary
  alwaysOnTop: boolean
}
