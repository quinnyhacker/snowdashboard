import {
  findDeviceExact,
  findDevicesContaining,
  findUserExact,
  findUsersContaining,
  type DeviceIndex
} from './lookupIndex'
import { isOnLegalHold } from './legalHold'
import { getDistrict, type DistrictLookupResult, type DistrictMap } from './district'

export type SearchMode = 'user' | 'device'

/** Default domain appended to a bare username in "by user" search, same as
 * the original tool hardcoded for Kiewit accounts. */
export const DEFAULT_EMAIL_DOMAIN = 'kiewit.com'

export interface MatchEnrichment {
  /** undefined when no legal hold list is loaded (vs. false = checked, clear) */
  legalHold?: boolean
  /** undefined when no district list is loaded */
  district?: DistrictLookupResult
}

export interface ExactMatchResult {
  kind: 'exact'
  mode: SearchMode
  device?: string
  user?: string
  devices?: string[]
  enrichment: MatchEnrichment
}

export interface PartialMatchRow {
  label: string
  counterpart: string | string[]
  enrichment: MatchEnrichment
}

export interface PartialMatchResult {
  kind: 'partial'
  mode: SearchMode
  rows: PartialMatchRow[]
}

export interface NoMatchResult {
  kind: 'none'
  mode: SearchMode
  term: string
}

export type SearchResult = ExactMatchResult | PartialMatchResult | NoMatchResult

export function enrich(userString: string, legalHoldSet?: Set<string>, districtMap?: DistrictMap): MatchEnrichment {
  return {
    legalHold: legalHoldSet ? isOnLegalHold(legalHoldSet, userString) : undefined,
    district: districtMap ? getDistrict(districtMap, userString) : undefined
  }
}

export interface RunSearchParams {
  mode: SearchMode
  term: string
  index: DeviceIndex
  legalHoldSet?: Set<string>
  districtMap?: DistrictMap
}

/** Ported from the original tool's search button handler: exact match
 * first, then a substring fallback across all keys, then "no match". User
 * mode appends @kiewit.com to a bare username for the exact-match lookup
 * only — substring matching always uses the raw typed term, same as the
 * original. */
export function runSearch(params: RunSearchParams): SearchResult {
  const { mode, term, index, legalHoldSet, districtMap } = params
  const trimmed = term.trim()
  if (!trimmed) return { kind: 'none', mode, term: trimmed }

  if (mode === 'device') {
    const exact = findDeviceExact(index, trimmed)
    if (exact) {
      return {
        kind: 'exact',
        mode,
        device: exact.device,
        user: exact.user,
        enrichment: enrich(exact.user, legalHoldSet, districtMap)
      }
    }
    const matches = findDevicesContaining(index, trimmed)
    if (matches.length > 0) {
      return {
        kind: 'partial',
        mode,
        rows: matches.map((m) => ({
          label: m.device,
          counterpart: m.user,
          enrichment: enrich(m.user, legalHoldSet, districtMap)
        }))
      }
    }
    return { kind: 'none', mode, term: trimmed }
  }

  const lookupTerm = trimmed.includes('@') ? trimmed : `${trimmed}@${DEFAULT_EMAIL_DOMAIN}`
  const exact = findUserExact(index, lookupTerm)
  if (exact) {
    return {
      kind: 'exact',
      mode,
      user: exact.user,
      devices: exact.devices,
      enrichment: enrich(exact.user, legalHoldSet, districtMap)
    }
  }
  const matches = findUsersContaining(index, trimmed)
  if (matches.length > 0) {
    return {
      kind: 'partial',
      mode,
      rows: matches.map((m) => ({
        label: m.user,
        counterpart: m.devices,
        enrichment: enrich(m.user, legalHoldSet, districtMap)
      }))
    }
  }
  return { kind: 'none', mode, term: trimmed }
}
