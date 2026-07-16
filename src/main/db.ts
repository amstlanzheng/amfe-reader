import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs, { type Database } from 'sql.js'

let db: Database | null = null
let dbPath = ''
let saveTimer: NodeJS.Timeout | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  cover TEXT,
  file_size INTEGER,
  added_at INTEGER NOT NULL,
  last_read_at INTEGER,
  progress REAL DEFAULT 0,
  cfi TEXT,
  chapter TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS ai_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS browsing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  visited_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_browsing_visited ON browsing_history(visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_books_added ON books(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
`

export async function initDatabase(): Promise<void> {
  const userData = app.getPath('userData')
  if (!existsSync(userData)) mkdirSync(userData, { recursive: true })
  dbPath = join(userData, 'amfe-reader.db')

  const SQL = await initSqlJs()
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath)
    db = new SQL.Database(new Uint8Array(buf))
  } else {
    db = new SQL.Database()
  }
  db.run(SCHEMA)
  scheduleSave()
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

// sql.js 不会自动写盘，需手动持久化；这里做防抖
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDatabase, 500)
}

export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

// 每次写操作后调度保存
export function persist(): void {
  scheduleSave()
}

export function closeDatabase(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  saveDatabase()
  db?.close()
  db = null
}
