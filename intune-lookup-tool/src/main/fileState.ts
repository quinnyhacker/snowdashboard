import path from 'node:path'
import { promises as fs } from 'node:fs'
import { findBestColumn } from '@shared/domain/columnGuess'
import { buildDeviceIndex, type CsvRow, type DeviceIndex } from '@shared/domain/lookupIndex'
import { buildLegalHoldSet } from '@shared/domain/legalHold'
import { buildDistrictMap, type DistrictMap } from '@shared/domain/district'
import { runBulkSearch, type BulkSearchRow } from '@shared/domain/bulkSearch'
import { runSearch, type SearchMode, type SearchResult } from '@shared/domain/search'
import type { SectionKind, SectionSummary } from '@shared/types/sections'
import { loadConfig, saveConfig } from './config'
import { parseCsvFile } from './csv'

const DEVICE_GUESSES = {
  device: ['Device name', 'Device Name', 'DeviceName', 'Computer name', 'Hostname'],
  user: ['Primary user display name', 'Primary user UPN', 'User principal name', 'User Name', 'User']
}
const NAME_GUESSES = {
  first: ['First name', 'First Name', 'FirstName', 'First'],
  last: ['Last name', 'Last Name', 'LastName', 'Surname', 'Last']
}
const DISTRICT_GUESSES = {
  work: ['Work District', 'District', 'Location'],
  home: ['Home District', 'Previous Home District']
}

interface DeviceState {
  filePath: string
  headers: string[]
  rows: CsvRow[]
  deviceCol: string
  userCol: string
  index: DeviceIndex
}

interface LegalHoldState {
  filePath: string
  headers: string[]
  rows: CsvRow[]
  firstCol: string
  lastCol: string
  set: Set<string>
}

interface DistrictState {
  filePath: string
  headers: string[]
  rows: CsvRow[]
  firstCol: string
  lastCol: string
  workCol: string
  homeCol: string
  map: DistrictMap
}

let deviceState: DeviceState | undefined
let legalHoldState: LegalHoldState | undefined
let districtState: DistrictState | undefined

// Set whenever import*() returns 'needs-columns', so the follow-up
// confirm*Columns() call (from the column-picker modal) knows which
// freshly-browsed file to finalize, without the renderer having to plumb
// file paths back and forth. Cleared once finalized.
let pendingDevicePath: string | undefined
let pendingLegalHoldPath: string | undefined
let pendingDistrictPath: string | undefined

// Last-seen modification time per section's file, used by pollForChanges()
// to detect when someone else has overwritten a shared file — without
// this, every poll tick would re-parse and re-announce "loaded" even when
// nothing actually changed.
const lastMtimes: Partial<Record<SectionKind, number>> = {}

function fileName(filePath: string): string {
  return path.basename(filePath)
}

// ---------------- Device export ----------------

export async function importDevice(filePath: string): Promise<SectionSummary> {
  delete lastMtimes.device
  const { headers, rows } = await parseCsvFile(filePath)
  if (rows.length === 0) return { status: 'error', message: 'That file has no rows.' }

  const cfg = await loadConfig()
  const deviceCol = cfg.DeviceCol && headers.includes(cfg.DeviceCol) ? cfg.DeviceCol : undefined
  const userCol = cfg.UserCol && headers.includes(cfg.UserCol) ? cfg.UserCol : undefined

  if (deviceCol && userCol) {
    pendingDevicePath = undefined
    return finalizeDevice(filePath, headers, rows, deviceCol, userCol)
  }

  pendingDevicePath = filePath
  return {
    status: 'needs-columns',
    headers,
    guesses: {
      deviceCol: findBestColumn(headers, DEVICE_GUESSES.device),
      userCol: findBestColumn(headers, DEVICE_GUESSES.user)
    }
  }
}

function finalizeDevice(filePath: string, headers: string[], rows: CsvRow[], deviceCol: string, userCol: string): SectionSummary {
  const index = buildDeviceIndex(rows, deviceCol, userCol)
  deviceState = { filePath, headers, rows, deviceCol, userCol, index }
  return { status: 'loaded', fileName: fileName(filePath), count: rows.length }
}

export async function confirmDeviceColumns(deviceCol: string, userCol: string): Promise<SectionSummary> {
  const filePath = pendingDevicePath ?? deviceState?.filePath
  if (!filePath) return { status: 'error', message: 'No device export file to apply columns to.' }

  const { headers, rows } =
    pendingDevicePath || !deviceState ? await parseCsvFile(filePath) : { headers: deviceState.headers, rows: deviceState.rows }

  const summary = finalizeDevice(filePath, headers, rows, deviceCol, userCol)
  pendingDevicePath = undefined
  await saveConfig({ DeviceCol: deviceCol, UserCol: userCol, LastFile: filePath, LastFolder: path.dirname(filePath) })
  return summary
}

export function deviceColumnsPrompt(): SectionSummary | undefined {
  if (!deviceState) return undefined
  pendingDevicePath = undefined
  return {
    status: 'needs-columns',
    headers: deviceState.headers,
    guesses: { deviceCol: deviceState.deviceCol, userCol: deviceState.userCol }
  }
}

// ---------------- Legal hold ----------------

export async function importLegalHold(filePath: string): Promise<SectionSummary> {
  delete lastMtimes.legalHold
  const { headers, rows } = await parseCsvFile(filePath)
  if (rows.length === 0) return { status: 'error', message: 'That legal hold file has no rows.' }

  const cfg = await loadConfig()
  const firstCol = cfg.LegalHoldFirstCol && headers.includes(cfg.LegalHoldFirstCol) ? cfg.LegalHoldFirstCol : undefined
  const lastCol = cfg.LegalHoldLastCol && headers.includes(cfg.LegalHoldLastCol) ? cfg.LegalHoldLastCol : undefined

  if (firstCol && lastCol) {
    pendingLegalHoldPath = undefined
    return finalizeLegalHold(filePath, headers, rows, firstCol, lastCol)
  }

  pendingLegalHoldPath = filePath
  return {
    status: 'needs-columns',
    headers,
    guesses: {
      firstCol: findBestColumn(headers, NAME_GUESSES.first),
      lastCol: findBestColumn(headers, NAME_GUESSES.last)
    }
  }
}

function finalizeLegalHold(filePath: string, headers: string[], rows: CsvRow[], firstCol: string, lastCol: string): SectionSummary {
  const set = buildLegalHoldSet(rows, firstCol, lastCol)
  legalHoldState = { filePath, headers, rows, firstCol, lastCol, set }
  return { status: 'loaded', fileName: fileName(filePath), count: set.size }
}

export async function confirmLegalHoldColumns(firstCol: string, lastCol: string): Promise<SectionSummary> {
  const filePath = pendingLegalHoldPath ?? legalHoldState?.filePath
  if (!filePath) return { status: 'error', message: 'No legal hold file to apply columns to.' }

  const { headers, rows } =
    pendingLegalHoldPath || !legalHoldState ? await parseCsvFile(filePath) : { headers: legalHoldState.headers, rows: legalHoldState.rows }

  const summary = finalizeLegalHold(filePath, headers, rows, firstCol, lastCol)
  pendingLegalHoldPath = undefined
  await saveConfig({ LegalHoldFile: filePath, LegalHoldFirstCol: firstCol, LegalHoldLastCol: lastCol })
  return summary
}

export function legalHoldColumnsPrompt(): SectionSummary | undefined {
  if (!legalHoldState) return undefined
  pendingLegalHoldPath = undefined
  return {
    status: 'needs-columns',
    headers: legalHoldState.headers,
    guesses: { firstCol: legalHoldState.firstCol, lastCol: legalHoldState.lastCol }
  }
}

// ---------------- District list ----------------

export async function importDistrict(filePath: string): Promise<SectionSummary> {
  delete lastMtimes.district
  const { headers, rows } = await parseCsvFile(filePath)
  if (rows.length === 0) return { status: 'error', message: 'That district file has no rows.' }

  const cfg = await loadConfig()
  const firstCol = cfg.DistrictFirstCol && headers.includes(cfg.DistrictFirstCol) ? cfg.DistrictFirstCol : undefined
  const lastCol = cfg.DistrictLastCol && headers.includes(cfg.DistrictLastCol) ? cfg.DistrictLastCol : undefined
  const workCol = cfg.DistrictWorkCol && headers.includes(cfg.DistrictWorkCol) ? cfg.DistrictWorkCol : undefined
  const homeCol = cfg.DistrictHomeCol && headers.includes(cfg.DistrictHomeCol) ? cfg.DistrictHomeCol : undefined

  if (firstCol && lastCol && workCol && homeCol) {
    pendingDistrictPath = undefined
    return finalizeDistrict(filePath, headers, rows, firstCol, lastCol, workCol, homeCol)
  }

  pendingDistrictPath = filePath
  return {
    status: 'needs-columns',
    headers,
    guesses: {
      firstCol: findBestColumn(headers, NAME_GUESSES.first),
      lastCol: findBestColumn(headers, NAME_GUESSES.last),
      workCol: findBestColumn(headers, DISTRICT_GUESSES.work),
      homeCol: findBestColumn(headers, DISTRICT_GUESSES.home)
    }
  }
}

function finalizeDistrict(
  filePath: string,
  headers: string[],
  rows: CsvRow[],
  firstCol: string,
  lastCol: string,
  workCol: string,
  homeCol: string
): SectionSummary {
  const map = buildDistrictMap(rows, firstCol, lastCol, workCol, homeCol)
  districtState = { filePath, headers, rows, firstCol, lastCol, workCol, homeCol, map }
  return { status: 'loaded', fileName: fileName(filePath), count: map.size }
}

export async function confirmDistrictColumns(
  firstCol: string,
  lastCol: string,
  workCol: string,
  homeCol: string
): Promise<SectionSummary> {
  const filePath = pendingDistrictPath ?? districtState?.filePath
  if (!filePath) return { status: 'error', message: 'No district file to apply columns to.' }

  const { headers, rows } =
    pendingDistrictPath || !districtState ? await parseCsvFile(filePath) : { headers: districtState.headers, rows: districtState.rows }

  const summary = finalizeDistrict(filePath, headers, rows, firstCol, lastCol, workCol, homeCol)
  pendingDistrictPath = undefined
  await saveConfig({
    DistrictFile: filePath,
    DistrictFirstCol: firstCol,
    DistrictLastCol: lastCol,
    DistrictWorkCol: workCol,
    DistrictHomeCol: homeCol
  })
  return summary
}

export function districtColumnsPrompt(): SectionSummary | undefined {
  if (!districtState) return undefined
  pendingDistrictPath = undefined
  return {
    status: 'needs-columns',
    headers: districtState.headers,
    guesses: {
      firstCol: districtState.firstCol,
      lastCol: districtState.lastCol,
      workCol: districtState.workCol,
      homeCol: districtState.homeCol
    }
  }
}

// ---------------- Startup auto-load ----------------

export async function tryAutoLoadDevice(): Promise<SectionSummary> {
  const cfg = await loadConfig()
  if (!cfg.LastFile) return { status: 'empty' }
  try {
    return await importDevice(cfg.LastFile)
  } catch {
    return { status: 'error', message: "Couldn't auto-load the last device export. It may have moved." }
  }
}

export async function tryAutoLoadLegalHold(): Promise<SectionSummary> {
  const cfg = await loadConfig()
  if (!cfg.LegalHoldFile) return { status: 'empty' }
  try {
    return await importLegalHold(cfg.LegalHoldFile)
  } catch {
    return { status: 'error', message: "Couldn't auto-load the last legal hold list. It may have moved." }
  }
}

export async function tryAutoLoadDistrict(): Promise<SectionSummary> {
  const cfg = await loadConfig()
  if (!cfg.DistrictFile) return { status: 'empty' }
  try {
    return await importDistrict(cfg.DistrictFile)
  } catch {
    return { status: 'error', message: "Couldn't auto-load the last district list. It may have moved." }
  }
}

// ---------------- Manual refresh ----------------
// Re-reads the currently loaded file from disk using its already-confirmed
// columns, without re-prompting or re-browsing. This is what makes
// pointing the app at a shared/network file useful: whoever owns that
// file can overwrite it, and everyone else just hits Refresh.

export async function refreshDevice(): Promise<SectionSummary> {
  if (!deviceState) return { status: 'empty' }
  const { filePath, deviceCol, userCol } = deviceState
  try {
    const { headers, rows } = await parseCsvFile(filePath)
    if (rows.length === 0) return { status: 'error', message: 'That file has no rows.' }
    if (!headers.includes(deviceCol) || !headers.includes(userCol)) {
      pendingDevicePath = filePath
      return {
        status: 'needs-columns',
        headers,
        guesses: {
          deviceCol: findBestColumn(headers, DEVICE_GUESSES.device),
          userCol: findBestColumn(headers, DEVICE_GUESSES.user)
        }
      }
    }
    return finalizeDevice(filePath, headers, rows, deviceCol, userCol)
  } catch {
    return { status: 'error', message: "Couldn't refresh — the file may be unreachable (e.g. off the network)." }
  }
}

export async function refreshLegalHold(): Promise<SectionSummary> {
  if (!legalHoldState) return { status: 'empty' }
  const { filePath, firstCol, lastCol } = legalHoldState
  try {
    const { headers, rows } = await parseCsvFile(filePath)
    if (rows.length === 0) return { status: 'error', message: 'That file has no rows.' }
    if (!headers.includes(firstCol) || !headers.includes(lastCol)) {
      pendingLegalHoldPath = filePath
      return {
        status: 'needs-columns',
        headers,
        guesses: {
          firstCol: findBestColumn(headers, NAME_GUESSES.first),
          lastCol: findBestColumn(headers, NAME_GUESSES.last)
        }
      }
    }
    return finalizeLegalHold(filePath, headers, rows, firstCol, lastCol)
  } catch {
    return { status: 'error', message: "Couldn't refresh — the file may be unreachable (e.g. off the network)." }
  }
}

export async function refreshDistrict(): Promise<SectionSummary> {
  if (!districtState) return { status: 'empty' }
  const { filePath, firstCol, lastCol, workCol, homeCol } = districtState
  try {
    const { headers, rows } = await parseCsvFile(filePath)
    if (rows.length === 0) return { status: 'error', message: 'That file has no rows.' }
    if (![firstCol, lastCol, workCol, homeCol].every((col) => headers.includes(col))) {
      pendingDistrictPath = filePath
      return {
        status: 'needs-columns',
        headers,
        guesses: {
          firstCol: findBestColumn(headers, NAME_GUESSES.first),
          lastCol: findBestColumn(headers, NAME_GUESSES.last),
          workCol: findBestColumn(headers, DISTRICT_GUESSES.work),
          homeCol: findBestColumn(headers, DISTRICT_GUESSES.home)
        }
      }
    }
    return finalizeDistrict(filePath, headers, rows, firstCol, lastCol, workCol, homeCol)
  } catch {
    return { status: 'error', message: "Couldn't refresh — the file may be unreachable (e.g. off the network)." }
  }
}

// ---------------- Background auto-sync ----------------
// Called on an interval from main/index.ts. Cheaply checks each loaded
// file's modification time and only re-parses (and reports back) the
// ones that actually changed — this is what makes "point everyone at the
// same shared file, overwrite it when you have an update" propagate to
// everyone automatically instead of requiring a manual Refresh click.

async function hasFileChanged(kind: SectionKind, filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    const previous = lastMtimes[kind]
    lastMtimes[kind] = stat.mtimeMs
    // First time checking this path (e.g. right after load): record the
    // baseline but don't report it as a change.
    return previous !== undefined && previous !== stat.mtimeMs
  } catch {
    // File unreachable this cycle (e.g. off the VPN/network) — leave the
    // baseline alone and try again next tick rather than erroring out.
    return false
  }
}

export interface SectionUpdate {
  kind: SectionKind
  summary: SectionSummary
}

export async function pollForChanges(): Promise<SectionUpdate[]> {
  const updates: SectionUpdate[] = []

  if (deviceState && (await hasFileChanged('device', deviceState.filePath))) {
    updates.push({ kind: 'device', summary: await refreshDevice() })
  }
  if (legalHoldState && (await hasFileChanged('legalHold', legalHoldState.filePath))) {
    updates.push({ kind: 'legalHold', summary: await refreshLegalHold() })
  }
  if (districtState && (await hasFileChanged('district', districtState.filePath))) {
    updates.push({ kind: 'district', summary: await refreshDistrict() })
  }

  return updates
}

// ---------------- Search ----------------

export function runSearchNow(mode: SearchMode, term: string): SearchResult {
  if (!deviceState) {
    return { kind: 'none', mode, term: term.trim() }
  }
  return runSearch({
    mode,
    term,
    index: deviceState.index,
    legalHoldSet: legalHoldState?.set,
    districtMap: districtState?.map
  })
}

export function runBulkSearchNow(mode: SearchMode, terms: string[]): BulkSearchRow[] {
  if (!deviceState) {
    return terms.map((term) => ({ term, found: false, enrichment: {} }))
  }
  return runBulkSearch({
    mode,
    terms,
    index: deviceState.index,
    legalHoldSet: legalHoldState?.set,
    districtMap: districtState?.map
  })
}

export function hasDeviceIndex(): boolean {
  return Boolean(deviceState)
}
