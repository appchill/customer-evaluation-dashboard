import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '2mb' }))

const row = (r) => ({
  id: r.id,
  name: r.name,
  grand: r.grand,
  data: r.data,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// List — summary only (no need to ship every field to the dashboard)
app.get('/api/customers', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, grand, data, created_at, updated_at FROM customers ORDER BY updated_at DESC',
    )
    res.json(rows.map(row))
  } catch (e) {
    next(e)
  }
})

app.get('/api/customers/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'not found' })
    res.json(row(rows[0]))
  } catch (e) {
    next(e)
  }
})

app.post('/api/customers', async (req, res, next) => {
  try {
    const id = randomUUID()
    const now = new Date().toISOString()
    const name = req.body?.name ?? ''
    const grand = Number(req.body?.grand) || 0
    const data = JSON.stringify(req.body?.data ?? {})
    const { rows } = await pool.query(
      'INSERT INTO customers (id, name, grand, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, name, grand, data, now, now],
    )
    res.status(201).json(row(rows[0]))
  } catch (e) {
    next(e)
  }
})

app.put('/api/customers/:id', async (req, res, next) => {
  try {
    const now = new Date().toISOString()
    const name = req.body?.name ?? ''
    const grand = Number(req.body?.grand) || 0
    const data = JSON.stringify(req.body?.data ?? {})
    const { rows } = await pool.query(
      'UPDATE customers SET name = $1, grand = $2, data = $3, updated_at = $4 WHERE id = $5 RETURNING *',
      [name, grand, data, now, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'not found' })
    res.json(row(rows[0]))
  } catch (e) {
    next(e)
  }
})

app.delete('/api/customers/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
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
