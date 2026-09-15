import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc/channels'
import type { InitialState } from '@shared/types/sections'
import { buildBulkResultsCsv } from '@shared/domain/bulkCsv'
import type { BulkSearchRow } from '@shared/domain/bulkSearch'
import { loadConfig, saveConfig } from './config'
import {
  confirmDeviceColumns,
  confirmDistrictColumns,
  confirmLegalHoldColumns,
  deviceColumnsPrompt,
  districtColumnsPrompt,
  hasDeviceIndex,
  importDevice,
  importDistrict,
  importLegalHold,
  legalHoldColumnsPrompt,
  pollForChanges,
  refreshDevice,
  refreshDistrict,
  refreshLegalHold,
  runBulkSearchNow,
  runSearchNow,
  tryAutoLoadDevice,
  tryAutoLoadDistrict,
  tryAutoLoadLegalHold
} from './fileState'

// How often to check loaded files for changes made by someone else (e.g. a
// teammate overwriting a shared network export). Re-parsing a CSV is cheap,
// and pollForChanges() skips the work entirely when a file's modification
// time hasn't changed, so this can run fairly often without real cost.
const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000

// Matches the original PowerShell tool's config location exactly, so a
// config.json from that version works here unmodified (and vice versa).
app.setPath('userData', join(app.getPath('appData'), 'IntuneLookupTool'))

let mainWindow: BrowserWindow | null = null
let autoSyncTimer: ReturnType<typeof setInterval> | undefined

function startAutoSync(): void {
  if (autoSyncTimer) return
  autoSyncTimer = setInterval(async () => {
    const updates = await pollForChanges()
    for (const update of updates) {
      mainWindow?.webContents.send(IPC.syncSectionUpdated, update)
    }
  }, AUTO_SYNC_INTERVAL_MS)
}

async function pickCsvFile(title: string): Promise<string | undefined> {
  const cfg = await loadConfig()
  const result = await dialog.showOpenDialog({
    title,
    defaultPath: cfg.LastFolder,
    filters: [
      { name: 'CSV files', extensions: ['csv'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return undefined
  return result.filePaths[0]
}

async function pickCsvSaveFile(defaultName: string): Promise<string | undefined> {
  const cfg = await loadConfig()
  const result = await dialog.showSaveDialog({
    title: 'Save bulk lookup results',
    defaultPath: cfg.LastFolder ? join(cfg.LastFolder, defaultName) : defaultName,
    filters: [{ name: 'CSV files', extensions: ['csv'] }]
  })
  if (result.canceled || !result.filePath) return undefined
  return result.filePath
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 560,
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.appGetInitialState, async (): Promise<InitialState> => {
    const [device, legalHold, district] = await Promise.all([
      tryAutoLoadDevice(),
      tryAutoLoadLegalHold(),
      tryAutoLoadDistrict()
    ])
    const cfg = await loadConfig()
    const alwaysOnTop = cfg.AlwaysOnTop ?? true
    mainWindow?.setAlwaysOnTop(alwaysOnTop)
    return { device, legalHold, district, alwaysOnTop }
  })

  ipcMain.handle(IPC.appSetAlwaysOnTop, async (_event, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value)
    await saveConfig({ AlwaysOnTop: value })
  })

  ipcMain.handle(IPC.deviceBrowse, async () => {
    const filePath = await pickCsvFile('Select the device export CSV')
    if (!filePath) return undefined
    return importDevice(filePath)
  })
  ipcMain.handle(IPC.deviceConfirmColumns, async (_event, columns: { deviceCol: string; userCol: string }) =>
    confirmDeviceColumns(columns.deviceCol, columns.userCol)
  )
  ipcMain.handle(IPC.deviceChangeColumns, async () => {
    if (!hasDeviceIndex()) return undefined
    return deviceColumnsPrompt()
  })
  ipcMain.handle(IPC.deviceRefresh, async () => refreshDevice())

  ipcMain.handle(IPC.legalHoldBrowse, async () => {
    const filePath = await pickCsvFile('Select the legal hold list CSV')
    if (!filePath) return undefined
    return importLegalHold(filePath)
  })
  ipcMain.handle(IPC.legalHoldConfirmColumns, async (_event, columns: { firstCol: string; lastCol: string }) =>
    confirmLegalHoldColumns(columns.firstCol, columns.lastCol)
  )
  ipcMain.handle(IPC.legalHoldChangeColumns, async () => legalHoldColumnsPrompt())
  ipcMain.handle(IPC.legalHoldRefresh, async () => refreshLegalHold())

  ipcMain.handle(IPC.districtBrowse, async () => {
    const filePath = await pickCsvFile('Select the district list CSV (needs first name, last name, work district, and home district columns)')
    if (!filePath) return undefined
    return importDistrict(filePath)
  })
  ipcMain.handle(
    IPC.districtConfirmColumns,
    async (_event, columns: { firstCol: string; lastCol: string; workCol: string; homeCol: string }) =>
      confirmDistrictColumns(columns.firstCol, columns.lastCol, columns.workCol, columns.homeCol)
  )
  ipcMain.handle(IPC.districtChangeColumns, async () => districtColumnsPrompt())
  ipcMain.handle(IPC.districtRefresh, async () => refreshDistrict())

  ipcMain.handle(IPC.searchRun, async (_event, params: { mode: 'user' | 'device'; term: string }) =>
    runSearchNow(params.mode, params.term)
  )
  ipcMain.handle(IPC.searchRunBulk, async (_event, params: { mode: 'user' | 'device'; terms: string[] }) =>
    runBulkSearchNow(params.mode, params.terms)
  )
  ipcMain.handle(IPC.searchSaveBulkCsv, async (_event, params: { mode: 'user' | 'device'; rows: BulkSearchRow[] }) => {
    const defaultName = `hardware-recovery-${new Date().toISOString().slice(0, 10)}.csv`
    const filePath = await pickCsvSaveFile(defaultName)
    if (!filePath) return { saved: false }

    const csv = buildBulkResultsCsv(params.rows, params.mode)
    // A leading BOM keeps Excel from mangling the encoding of any special
    // characters when it opens the file directly.
    await writeFile(filePath, '﻿' + csv, 'utf8')
    return { saved: true, path: filePath }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  startAutoSync()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (autoSyncTimer) clearInterval(autoSyncTimer)
})
