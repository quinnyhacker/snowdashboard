import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc/channels'
import type { RespondConfirmationPayload, SendMessagePayload, SettingsStatus } from '@shared/ipc/api'
import type { Ticket } from '@shared/domain/ticket'
import { McpConfigFileSchema, type McpConfigFile } from '@shared/types/mcpConfig'
import { ChatEngine } from './agent/chatEngine'
import { loadMcpConfig, saveMcpConfig } from './mcp/config'
import { mcpClientManager } from './mcp/mcpClientManager'
import { getAllMyWork, findTask, getTaskDetail } from './mcp/serviceNowTools'
import { searchEmailsForTicket } from './mcp/m365Tools'
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from './settings/secureKeyStore'
import { getPreferences, updatePreferences } from './settings/preferencesStore'
import { detectNotifiableChanges, notifyNewAssignment, notifySlaApproaching } from './notifications/notifier'

let mainWindow: BrowserWindow | null = null

// In-memory only — cleared on restart, never written to disk. Used solely
// to detect "this ticket is new since last refresh" for notifications.
let lastSeenTickets = new Map<string, Ticket>()

async function refreshMcpConnections(): Promise<void> {
  const { servers } = await loadMcpConfig(getPreferences().mcpConfigPath)
  mcpClientManager.configure(servers)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
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
  ipcMain.handle(IPC.dashboardGetAllWork, async () => {
    const tickets = await getAllMyWork()
    const { newAssignments, slaApproaching } = detectNotifiableChanges(lastSeenTickets, tickets)
    newAssignments.forEach(notifyNewAssignment)
    slaApproaching.forEach(notifySlaApproaching)
    lastSeenTickets = new Map(tickets.map((t) => [t.sysId, t]))
    return tickets
  })

  ipcMain.handle(IPC.dashboardGetTicketDetail, async (_event, numberOrSysId: string) => {
    return getTaskDetail(numberOrSysId)
  })

  ipcMain.handle(IPC.dashboardFindTask, async (_event, query: string) => {
    return findTask(query)
  })

  ipcMain.handle(IPC.chatSendMessage, async (_event, payload: SendMessagePayload) => {
    let ticket: Ticket | undefined
    if (payload.ticketNumber) {
      ticket = await getTaskDetail(payload.ticketNumber).catch(() => undefined)
    }
    await chatEngine.sendMessage(payload.text, ticket)
  })

  ipcMain.handle(IPC.chatRespondConfirmation, async (_event, payload: RespondConfirmationPayload) => {
    chatEngine.resolveConfirmation(payload.id, payload.approve, payload.editedInput)
  })

  ipcMain.handle(IPC.chatStartNewConversation, async () => {
    chatEngine.startNewConversation()
  })

  ipcMain.handle(IPC.settingsGetStatus, async (): Promise<SettingsStatus> => {
    const prefs = getPreferences()
    const { source, configPath, servers } = await loadMcpConfig(prefs.mcpConfigPath)
    return {
      hasApiKey: await hasApiKey(),
      mcpConfigPath: configPath,
      mcpSource: source,
      configuredServers: Object.keys(servers)
    }
  })

  ipcMain.handle(IPC.settingsSetApiKey, async (_event, apiKey: string) => {
    await setApiKey(apiKey)
  })

  ipcMain.handle(IPC.settingsClearApiKey, async () => {
    await clearApiKey()
  })

  ipcMain.handle(IPC.settingsSaveMcpConfig, async (_event, config: McpConfigFile) => {
    const validated = McpConfigFileSchema.parse(config)
    const configPath = await saveMcpConfig(validated, getPreferences().mcpConfigPath)
    await refreshMcpConnections()
    return { configPath }
  })

  ipcMain.handle(IPC.settingsGetMcpConfigRaw, async () => {
    const { configPath } = await loadMcpConfig(getPreferences().mcpConfigPath)
    try {
      return await fs.readFile(configPath, 'utf-8')
    } catch {
      return JSON.stringify({ mcpServers: {} }, null, 2)
    }
  })

  ipcMain.handle(IPC.prefsGet, async () => getPreferences())

  ipcMain.handle(IPC.prefsUpdate, async (_event, partial) => updatePreferences(partial))

  ipcMain.handle(IPC.emailSearchForTicket, async (_event, ticketNumber: string) => {
    return searchEmailsForTicket(ticketNumber)
  })
}

const chatEngine = new ChatEngine(
  {
    onTextDelta: (text) => mainWindow?.webContents.send(IPC.chatTextDelta, text),
    onMessageComplete: (message) => mainWindow?.webContents.send(IPC.chatMessageComplete, message),
    onConfirmationRequest: (confirmation) =>
      mainWindow?.webContents.send(IPC.chatConfirmationRequest, confirmation),
    onActivity: (entry) => mainWindow?.webContents.send(IPC.chatActivity, entry),
    onError: (message) => mainWindow?.webContents.send(IPC.chatError, message)
  },
  getApiKey,
  async () => (await loadMcpConfig(getPreferences().mcpConfigPath)).servers
)

app.whenReady().then(async () => {
  await refreshMcpConnections()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void mcpClientManager.disconnectAll()
})
