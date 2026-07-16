import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getBooks: () => ipcRenderer.invoke('library:list'),
  openBook: (id: number) => ipcRenderer.invoke('team:openBook', id),
  close: () => ipcRenderer.invoke('team:close')
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
}

export type TeamTrayApi = typeof api
