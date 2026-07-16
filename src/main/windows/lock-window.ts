import { BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let lockWindow: BrowserWindow | null = null

export function createLockWindow(): BrowserWindow {
  if (lockWindow && !lockWindow.isDestroyed()) return lockWindow
  lockWindow = new BrowserWindow({
    width: 480,
    height: 320,
    show: false,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/password-lock.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    lockWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/password-lock.html')
  } else {
    lockWindow.loadFile(join(__dirname, '../renderer/password-lock.html'))
  }
  return lockWindow
}

export function showLockWindow(_parent: BrowserWindow): void {
  const w = createLockWindow()
  w.show()
  globalShortcut.register('Escape', () => {
    w.hide()
    globalShortcut.unregister('Escape')
  })
}

export function getLockWindow(): BrowserWindow | null {
  return lockWindow
}
