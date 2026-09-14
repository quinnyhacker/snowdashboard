import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc/channels'
import type { PreloadApi } from '@shared/ipc/api'

const api: PreloadApi = {
  app: {
    getInitialState: () => ipcRenderer.invoke(IPC.appGetInitialState),
    setAlwaysOnTop: (value) => ipcRenderer.invoke(IPC.appSetAlwaysOnTop, value)
  },
  device: {
    browse: () => ipcRenderer.invoke(IPC.deviceBrowse),
    confirmColumns: (columns) => ipcRenderer.invoke(IPC.deviceConfirmColumns, columns),
    changeColumns: () => ipcRenderer.invoke(IPC.deviceChangeColumns)
  },
  legalHold: {
    browse: () => ipcRenderer.invoke(IPC.legalHoldBrowse),
    confirmColumns: (columns) => ipcRenderer.invoke(IPC.legalHoldConfirmColumns, columns),
    changeColumns: () => ipcRenderer.invoke(IPC.legalHoldChangeColumns)
  },
  district: {
    browse: () => ipcRenderer.invoke(IPC.districtBrowse),
    confirmColumns: (columns) => ipcRenderer.invoke(IPC.districtConfirmColumns, columns),
    changeColumns: () => ipcRenderer.invoke(IPC.districtChangeColumns)
  },
  search: {
    run: (params) => ipcRenderer.invoke(IPC.searchRun, params)
  }
}

contextBridge.exposeInMainWorld('api', api)
