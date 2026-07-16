import { ipcMain } from 'electron'
import { getDb, persist } from '../db'

export interface BookRecord {
  id?: number
  title: string
  author?: string
  format: string
  file_path: string
  cover?: string
  file_size?: number
  added_at: number
  last_read_at?: number
  progress: number
  cfi?: string
  chapter?: string
  metadata?: string
}

function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:add', async (_evt, book: BookRecord) => {
    const db = getDb()
    db.run(
      `INSERT INTO books (title, author, format, file_path, cover, file_size, added_at, progress, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.title,
        book.author ?? null,
        book.format,
        book.file_path,
        book.cover ?? null,
        book.file_size ?? null,
        book.added_at,
        book.progress ?? 0,
        book.metadata ?? null
      ]
    )
    persist()
    const row = all('SELECT last_insert_rowid() AS id')[0]
    return row.id as number
  })

  ipcMain.handle('library:list', async () => {
    return all('SELECT * FROM books ORDER BY last_read_at DESC, added_at DESC')
  })

  ipcMain.handle('library:get', async (_evt, id: number) => {
    return all('SELECT * FROM books WHERE id = ?', [id])[0]
  })

  ipcMain.handle('library:remove', async (_evt, id: number) => {
    getDb().run('DELETE FROM books WHERE id = ?', [id])
    persist()
    return true
  })

  ipcMain.handle(
    'library:updateProgress',
    async (_evt, payload: { id: number; progress: number; cfi?: string; chapter?: string }) => {
      getDb().run(
        `UPDATE books SET progress = ?, cfi = ?, chapter = ?, last_read_at = ? WHERE id = ?`,
        [payload.progress, payload.cfi ?? null, payload.chapter ?? null, Date.now(), payload.id]
      )
      persist()
      return true
    }
  )
}
