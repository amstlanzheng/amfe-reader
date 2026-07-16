import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // 应用
  getVersion: () => ipcRenderer.invoke('app:version'),
  // 文件
  readTxt: (p: string) => ipcRenderer.invoke('file:readTxt', p),
  readEpub: (p: string) => ipcRenderer.invoke('file:readEpub', p),
  readBuffer: (p: string) => ipcRenderer.invoke('file:readBuffer', p),
  fileStat: (p: string) => ipcRenderer.invoke('file:stat', p),
  openFilePicker: () => ipcRenderer.invoke('dialog:openFile'),
  // 书库
  library: {
    add: (b: any) => ipcRenderer.invoke('library:add', b),
    list: () => ipcRenderer.invoke('library:list'),
    get: (id: number) => ipcRenderer.invoke('library:get', id),
    remove: (id: number) => ipcRenderer.invoke('library:remove', id),
    updateProgress: (p: any) => ipcRenderer.invoke('library:updateProgress', p)
  },
  // 设置
  settings: {
    get: (k: string) => ipcRenderer.invoke('settings:get', k),
    set: (k: string, v: string) => ipcRenderer.invoke('settings:set', k, v),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },
  // AI
  ai: {
    chat: (m: any[]) => ipcRenderer.invoke('ai:chat', { messages: m }),
    history: () => ipcRenderer.invoke('ai:history'),
    clearHistory: () => ipcRenderer.invoke('ai:clearHistory')
  },
  // 窗口摸鱼控制
  window: {
    setOpacity: (o: number) => ipcRenderer.invoke('window:setOpacity', o),
    getOpacity: () => ipcRenderer.invoke('window:getOpacity'),
    setAlwaysOnTop: (on: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', on),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:getAlwaysOnTop'),
    enterMini: () => ipcRenderer.invoke('window:enterMini'),
    exitMini: () => ipcRenderer.invoke('window:exitMini'),
    toggleMinimize: () => ipcRenderer.invoke('window:toggleMinimize'),
    hide: () => ipcRenderer.invoke('window:hide'),
    getBounds: () => ipcRenderer.invoke('window:getBounds'),
    setBounds: (b: any) => ipcRenderer.invoke('window:setBounds', b),
    mouseHideOn: () => ipcRenderer.invoke('window:mouseHideOn'),
    mouseHideOff: () => ipcRenderer.invoke('window:mouseHideOff')
  },
  // 网页浏览历史
  browsing: {
    visit: (url: string, title?: string) => ipcRenderer.invoke('browsing:visit', { url, title }),
    list: () => ipcRenderer.invoke('browsing:list'),
    remove: (id: number) => ipcRenderer.invoke('browsing:remove', id),
    clear: () => ipcRenderer.invoke('browsing:clear')
  },
  shortcut: {
    setBoss: (which: 1 | 2, accel: string) => ipcRenderer.invoke('shortcut:setBoss', which, accel),
    getBoss: () => ipcRenderer.invoke('shortcut:getBoss')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type AppApi = typeof api
