import { ipcMain } from 'electron'
import { getDb, persist } from '../db'

export interface BrowsingRecord {
  id?: number
  url: string
  title?: string
  visited_at: number
}

function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function registerBrowsingHandlers(): void {
  // 添加/更新浏览记录（同 URL 只保留一条，更新时间）
  ipcMain.handle('browsing:visit', async (_evt, record: { url: string; title?: string }) => {
    if (!record.url) return false
    const db = getDb()
    // 删除旧的同 URL 记录
    db.run('DELETE FROM browsing_history WHERE url = ?', [record.url])
    db.run('INSERT INTO browsing_history (url, title, visited_at) VALUES (?, ?, ?)', [
      record.url,
      record.title ?? '',
      Date.now()
    ])
    persist()
    return true
  })

  // 列表（最近 200 条）
  ipcMain.handle('browsing:list', async () => {
    return all('SELECT * FROM browsing_history ORDER BY visited_at DESC LIMIT 200')
  })

  // 删除单条
  ipcMain.handle('browsing:remove', async (_evt, id: number) => {
    getDb().run('DELETE FROM browsing_history WHERE id = ?', [id])
    persist()
    return true
  })

  // 清空
  ipcMain.handle('browsing:clear', async () => {
    getDb().run('DELETE FROM browsing_history')
    persist()
    return true
  })
}
