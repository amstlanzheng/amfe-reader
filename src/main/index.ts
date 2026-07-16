import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, dialog, globalShortcut, screen } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'
import { registerLibraryHandlers } from './ipc/library'
import { registerFileHandlers } from './ipc/file'
import { registerSettingsHandlers } from './ipc/settings'
import { registerAiHandlers } from './ipc/ai'
import { registerBrowsingHandlers } from './ipc/browsing'
import { createTrayWindow, getTrayWindow } from './windows/tray-window'
import { createLockWindow, getLockWindow, showLockWindow } from './windows/lock-window'
import { initDatabase, closeDatabase, getDb, persist } from './db'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 老板键当前注册的加速键
let bossKey1 = ''
let bossKey2 = ''

function getSetting(key: string): string | null {
  try {
    const stmt = getDb().prepare('SELECT value FROM settings WHERE key = ?')
    stmt.bind([key])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return (row as any)?.value ?? null
  } catch {
    return null
  }
}

function setSetting(key: string, value: string): void {
  getDb().run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
  persist()
}

// 鼠标移出隐藏相关变量（提到模块作用域，供 before-quit 清理）
let mouseHideTimer: NodeJS.Timeout | null = null
let mouseHideBounds: { x: number; y: number; width: number; height: number } | null = null
let mouseHideSavedOpacity = 1

// 透明窗口需要 transparent: true + frame: false，但完全无边框会丢失拖动。
// 这里采用：transparent + 自定义标题栏（在渲染层用 -webkit-app-region: drag 实现）
function createMainWindow(): BrowserWindow {
  const savedBounds = getSetting('window.bounds')
  let bounds: { x?: number; y?: number; width: number; height: number } | null = null
  try {
    bounds = savedBounds ? JSON.parse(savedBounds) : null
  } catch {
    bounds = null
  }

  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1100,
    height: bounds?.height ?? 720,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 240,
    minHeight: 160,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'AMFE Reader',
    icon: join(__dirname, '../../resources/icon.png'),
    alwaysOnTop: getSetting('window.alwaysOnTop') === '1',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true // 启用 <webview> 标签用于网页摸鱼
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 记忆窗口位置/尺寸（防抖）
  let boundsTimer: NodeJS.Timeout | null = null
  const saveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (!mainWindow) return
      const b = mainWindow.getBounds()
      setSetting('window.bounds', JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height }))
    }, 500)
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createTray(): Tray {
  // 加载真实图标，托盘可见
  let icon: Electron.NativeImage
  const trayIconPath = join(__dirname, '../../resources/tray.png')
  const appIconPath = join(__dirname, '../../resources/icon.png')
  try {
    icon = nativeImage.createFromPath(trayIconPath)
    if (icon.isEmpty()) icon = nativeImage.createFromPath(appIconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
    // Windows 托盘图标建议 16x16
    icon = icon.resize({ width: 16, height: 16 })
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.setSkipTaskbar(false)
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { label: '团队托盘', click: () => createTrayWindow(mainWindow!) },
    { type: 'separator' },
    { label: '锁定', click: () => showLockWindow(mainWindow!) },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        getTrayWindow()?.destroy()
        getLockWindow()?.destroy()
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip('AMFE Reader')

  // 单击托盘图标显示主窗口（恢复任务栏图标）
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.setSkipTaskbar(false)
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  return tray
}

// ============== 老板键 ==============
// 老板键1：最小化 / 从最小化恢复
// 最小化时窗口从任务栏消失，仅在托盘显示；再按恢复
function triggerBossKey1(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
    // 恢复：先取消跳过任务栏，再显示
    mainWindow.setSkipTaskbar(false)
    mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  } else {
    // 最小化并从任务栏隐藏
    mainWindow.setSkipTaskbar(true)
    mainWindow.minimize()
  }
}

// 老板键2：完全退出到后台，任务栏不显示图标，仅在系统托盘
// 需单击托盘图标才能再次显示
function triggerBossKey2(): void {
  if (!mainWindow) return
  mainWindow.setSkipTaskbar(true)
  mainWindow.hide()
}

function registerBossKeys(): void {
  // 先注销旧的
  if (bossKey1) globalShortcut.unregister(bossKey1)
  if (bossKey2) globalShortcut.unregister(bossKey2)

  bossKey1 = getSetting('shortcut.boss1') || 'Alt+Z'
  bossKey2 = getSetting('shortcut.boss2') || 'Alt+X'

  try {
    globalShortcut.register(bossKey1, triggerBossKey1)
  } catch (e) {
    console.error('注册老板键1失败:', e)
  }
  try {
    globalShortcut.register(bossKey2, triggerBossKey2)
  } catch (e) {
    console.error('注册老板键2失败:', e)
  }
}

function registerWindowHandlers(): void {
  // 设置窗口透明度（0-1）
  ipcMain.handle('window:setOpacity', (_evt, opacity: number) => {
    mainWindow?.setOpacity(Math.max(0.05, Math.min(1, opacity)))
    setSetting('window.opacity', String(opacity))
    return true
  })

  // 获取当前透明度
  ipcMain.handle('window:getOpacity', () => {
    return mainWindow?.getOpacity() ?? 1
  })

  // 置顶切换
  ipcMain.handle('window:setAlwaysOnTop', (_evt, on: boolean) => {
    mainWindow?.setAlwaysOnTop(on)
    setSetting('window.alwaysOnTop', on ? '1' : '0')
    return true
  })

  ipcMain.handle('window:getAlwaysOnTop', () => mainWindow?.isAlwaysOnTop() ?? false)

  // 迷你模式：缩到小窗口
  ipcMain.handle('window:enterMini', () => {
    if (!mainWindow) return
    const cur = mainWindow.getBounds()
    setSetting('window.lastBounds', JSON.stringify(cur))
    // 移到屏幕右下角小窗
    const display = screen.getDisplayNearestPoint({ x: cur.x, y: cur.y })
    const { workArea } = display
    const w = 320
    const h = 180
    mainWindow.setBounds({
      x: workArea.x + workArea.width - w - 20,
      y: workArea.y + workArea.height - h - 20,
      width: w,
      height: h
    })
    return true
  })

  ipcMain.handle('window:exitMini', () => {
    if (!mainWindow) return
    const last = getSetting('window.lastBounds')
    if (last) {
      try {
        const b = JSON.parse(last)
        mainWindow.setBounds(b)
      } catch {
        // ignore
      }
    }
    return true
  })

  // 最小化 / 恢复（程序化触发老板键1）
  ipcMain.handle('window:toggleMinimize', () => {
    triggerBossKey1()
    return true
  })

  // 隐藏到后台
  ipcMain.handle('window:hide', () => {
    triggerBossKey2()
    return true
  })

  // 鼠标移出隐藏：隐藏整个窗口（含内容），鼠标移回原区域恢复
  // 隐藏后渲染进程不接收事件，所以由主进程轮询鼠标位置判断是否移回
  // 恢复时还原用户之前设定的透明度，而非强制设为 1
  // （变量 mouseHideTimer/mouseHideBounds/mouseHideSavedOpacity 定义在模块作用域）

  const startMouseHidePolling = () => {
    if (mouseHideTimer) return
    mouseHideTimer = setInterval(() => {
      if (!mainWindow || !mouseHideBounds) return
      const cursor = screen.getCursorScreenPoint()
      const b = mouseHideBounds
      // 鼠标进入原窗口区域 → 恢复显示（还原原透明度）
      if (cursor.x >= b.x && cursor.x <= b.x + b.width && cursor.y >= b.y && cursor.y <= b.y + b.height) {
        mainWindow.setOpacity(mouseHideSavedOpacity)
        mainWindow.setIgnoreMouseEvents(false)
        mouseHideBounds = null
        if (mouseHideTimer) {
          clearInterval(mouseHideTimer)
          mouseHideTimer = null
        }
      }
    }, 150)
  }

  ipcMain.handle('window:mouseHideOn', () => {
    if (!mainWindow) return false
    // 保存当前透明度，恢复时还原
    try {
      mouseHideSavedOpacity = mainWindow.getOpacity()
    } catch {
      mouseHideSavedOpacity = 1
    }
    // 记录当前窗口位置，隐藏后轮询检测鼠标是否回到此区域
    const b = mainWindow.getBounds()
    mouseHideBounds = { x: b.x, y: b.y, width: b.width, height: b.height }
    mainWindow.setIgnoreMouseEvents(true, { forward: false })
    mainWindow.setOpacity(0)
    startMouseHidePolling()
    return true
  })
  ipcMain.handle('window:mouseHideOff', () => {
    if (!mainWindow) return false
    if (mouseHideTimer) {
      clearInterval(mouseHideTimer)
      mouseHideTimer = null
    }
    mouseHideBounds = null
    mainWindow.setIgnoreMouseEvents(false)
    // 还原保存的透明度（若未保存过则取当前设置）
    try {
      const saved = getSetting('window.opacity')
      mainWindow.setOpacity(saved ? parseFloat(saved) : 1)
    } catch {
      mainWindow.setOpacity(1)
    }
    return true
  })

  // 获取/设置窗口 bounds（供渲染层自实现透明窗口 resize）
  ipcMain.handle('window:getBounds', () => {
    if (!mainWindow) return null
    const b = mainWindow.getBounds()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
  })

  ipcMain.handle('window:setBounds', (_evt, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!mainWindow) return false
    mainWindow.setBounds(bounds)
    return true
  })

  // 自定义老板键
  ipcMain.handle('shortcut:setBoss', (_evt, which: 1 | 2, accel: string) => {
    setSetting(which === 1 ? 'shortcut.boss1' : 'shortcut.boss2', accel)
    registerBossKeys()
    return true
  })

  ipcMain.handle('shortcut:getBoss', () => {
    return {
      boss1: getSetting('shortcut.boss1') || 'Alt+Z',
      boss2: getSetting('shortcut.boss2') || 'Alt+X'
    }
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.amfe.reader')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initDatabase()

  registerLibraryHandlers()
  registerFileHandlers()
  registerSettingsHandlers()
  registerAiHandlers()
  registerBrowsingHandlers()
  registerWindowHandlers()

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('lock:unlock', () => {
    getLockWindow()?.hide()
    mainWindow?.show()
  })
  ipcMain.handle('lock:close', () => getLockWindow()?.hide())

  ipcMain.handle('team:openBook', (_evt, id: number) => {
    mainWindow?.show()
    mainWindow?.webContents.send('team:openBook', id)
  })
  ipcMain.handle('team:close', () => getTrayWindow()?.hide())

  ipcMain.handle('dialog:openFile', async () => {
    // 透明无边框窗口在模态对话框关闭后容易失焦被压下层，对话框返回后强制恢复
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择电子书',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '电子书', extensions: ['txt', 'epub', 'pdf', 'mobi', 'fb2', 'azw3'] }]
    })
    mainWindow?.show()
    mainWindow?.focus()
    return result.filePaths
  })

  createMainWindow()
  createTray()
  createLockWindow()
  registerBossKeys()

  // 恢复透明度
  const opacity = parseFloat(getSetting('window.opacity') || '1')
  if (opacity < 1) mainWindow?.setOpacity(opacity)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  globalShortcut.unregisterAll()
  if (mouseHideTimer) {
    clearInterval(mouseHideTimer)
    mouseHideTimer = null
  }
  closeDatabase()
})
