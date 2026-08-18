import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { db } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '2mb' }))

const row = (r) => ({
  id: r.id,
  name: r.name,
  grand: r.grand,
  data: JSON.parse(r.data),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// List — summary only (no need to ship every field to the dashboard)
app.get('/api/customers', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, grand, data, created_at, updated_at FROM customers ORDER BY updated_at DESC')
    .all()
  res.json(rows.map(row))
})

app.get('/api/customers/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json(row(r))
})

app.post('/api/customers', (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const name = req.body?.name ?? ''
  const grand = Number(req.body?.grand) || 0
  const data = JSON.stringify(req.body?.data ?? {})
  db.prepare(
    'INSERT INTO customers (id, name, grand, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, name, grand, data, now, now)
  res.status(201).json(row(db.prepare('SELECT * FROM customers WHERE id = ?').get(id)))
})

app.put('/api/customers/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })
  const now = new Date().toISOString()
  const name = req.body?.name ?? ''
  const grand = Number(req.body?.grand) || 0
  const data = JSON.stringify(req.body?.data ?? {})
  db.prepare('UPDATE customers SET name = ?, grand = ?, data = ?, updated_at = ? WHERE id = ?').run(
    name,
    grand,
    data,
    now,
    req.params.id,
  )
  res.json(row(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)))
})

app.delete('/api/customers/:id', (req, res) => {
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

// In production there's no separate Vite dev server — this process also
// serves the built frontend, so the whole app is one deployable service.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../dist')
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

const port = parseInt(process.env.PORT || process.env.API_PORT || '4001')
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
