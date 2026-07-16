import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  unlock: (password: string) => ipcRenderer.invoke('lock:unlock', password),
  close: () => ipcRenderer.invoke('lock:close')
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
}

export type PasswordLockApi = typeof api
