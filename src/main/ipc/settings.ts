import { ipcMain } from 'electron'
import { getDb, persist } from '../db'

function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_evt, key: string) => {
    const rows = all('SELECT value FROM settings WHERE key = ?', [key])
    return rows[0]?.value ?? null
  })

  ipcMain.handle('settings:set', async (_evt, key: string, value: string) => {
    getDb().run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
    persist()
    return true
  })

  ipcMain.handle('settings:getAll', async () => {
    const rows = all('SELECT key, value FROM settings')
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key] = r.value
    return out
  })
}
