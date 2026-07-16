// 主窗口 API 类型声明
export interface AppApi {
  getVersion(): Promise<string>
  readTxt(p: string): Promise<{ text: string; encoding: string; name: string }>
  readEpub(p: string): Promise<{ title: string; author?: string; description?: string; publisher?: string }>
  readBuffer(p: string): Promise<{ buffer: ArrayBuffer }>
  fileStat(p: string): Promise<{ name: string; size: number; ext: string }>
  openFilePicker(): Promise<string[]>
  library: {
    add(b: any): Promise<number>
    list(): Promise<any[]>
    get(id: number): Promise<any>
    remove(id: number): Promise<boolean>
    updateProgress(p: { id: number; progress: number; cfi?: string; chapter?: string }): Promise<boolean>
  }
  settings: {
    get(k: string): Promise<string | null>
    set(k: string, v: string): Promise<boolean>
    getAll(): Promise<Record<string, string>>
  }
  ai: {
    chat(m: { role: string; content: string }[]): Promise<string>
    history(): Promise<any[]>
    clearHistory(): Promise<boolean>
  }
  window: {
    setOpacity(o: number): Promise<boolean>
    getOpacity(): Promise<number>
    setAlwaysOnTop(on: boolean): Promise<boolean>
    getAlwaysOnTop(): Promise<boolean>
    enterMini(): Promise<boolean>
    exitMini(): Promise<boolean>
    toggleMinimize(): Promise<boolean>
    hide(): Promise<boolean>
    getBounds(): Promise<{ x: number; y: number; width: number; height: number } | null>
    setBounds(b: { x: number; y: number; width: number; height: number }): Promise<boolean>
    mouseHideOn(): Promise<boolean>
    mouseHideOff(): Promise<boolean>
  }
  shortcut: {
    setBoss(which: 1 | 2, accel: string): Promise<boolean>
    getBoss(): Promise<{ boss1: string; boss2: string }>
  }
  browsing: {
    visit(url: string, title?: string): Promise<boolean>
    list(): Promise<{ id: number; url: string; title: string; visited_at: number }[]>
    remove(id: number): Promise<boolean>
    clear(): Promise<boolean>
  }
}

declare global {
  interface Window {
    api: AppApi
    electron: any
  }
}

export {}
