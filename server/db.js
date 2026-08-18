import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// On a host with a persistent disk (e.g. Render), point DATA_DIR at the
// mounted volume so the SQLite file survives redeploys.
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'customers.sqlite'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    grand REAL NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)
