import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let trayWindow: BrowserWindow | null = null

export function createTrayWindow(parent: BrowserWindow): BrowserWindow {
  if (trayWindow && !trayWindow.isDestroyed()) {
    trayWindow.show()
    return trayWindow
  }
  trayWindow = new BrowserWindow({
    width: 360,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    parent,
    webPreferences: {
      preload: join(__dirname, '../preload/team-tray.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  trayWindow.on('ready-to-show', () => trayWindow?.show())
  trayWindow.webContents.setWindowOpenHandler((d) => {
    shell.openExternal(d.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    trayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/team-tray.html')
  } else {
    trayWindow.loadFile(join(__dirname, '../renderer/team-tray.html'))
  }
  return trayWindow
}

export function getTrayWindow(): BrowserWindow | null {
  return trayWindow
}
