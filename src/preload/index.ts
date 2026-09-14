import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc/channels'
import type { PreloadApi } from '@shared/ipc/api'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: PreloadApi = {
  dashboard: {
    getAllWork: () => ipcRenderer.invoke(IPC.dashboardGetAllWork),
    getTicketDetail: (numberOrSysId) => ipcRenderer.invoke(IPC.dashboardGetTicketDetail, numberOrSysId),
    findTask: (query) => ipcRenderer.invoke(IPC.dashboardFindTask, query)
  },
  chat: {
    sendMessage: (payload) => ipcRenderer.invoke(IPC.chatSendMessage, payload),
    respondConfirmation: (payload) => ipcRenderer.invoke(IPC.chatRespondConfirmation, payload),
    startNewConversation: () => ipcRenderer.invoke(IPC.chatStartNewConversation),
    onTextDelta: (cb) => subscribe(IPC.chatTextDelta, cb),
    onMessageComplete: (cb) => subscribe(IPC.chatMessageComplete, cb),
    onConfirmationRequest: (cb) => subscribe(IPC.chatConfirmationRequest, cb),
    onActivity: (cb) => subscribe(IPC.chatActivity, cb),
    onError: (cb) => subscribe(IPC.chatError, cb)
  },
  settings: {
    getStatus: () => ipcRenderer.invoke(IPC.settingsGetStatus),
    setApiKey: (apiKey) => ipcRenderer.invoke(IPC.settingsSetApiKey, apiKey),
    clearApiKey: () => ipcRenderer.invoke(IPC.settingsClearApiKey),
    saveMcpConfig: (config) => ipcRenderer.invoke(IPC.settingsSaveMcpConfig, config),
    getMcpConfigRaw: () => ipcRenderer.invoke(IPC.settingsGetMcpConfigRaw)
  },
  prefs: {
    get: () => ipcRenderer.invoke(IPC.prefsGet),
    update: (partial) => ipcRenderer.invoke(IPC.prefsUpdate, partial)
  },
  email: {
    searchForTicket: (ticketNumber) => ipcRenderer.invoke(IPC.emailSearchForTicket, ticketNumber)
  }
}

contextBridge.exposeInMainWorld('api', api)
