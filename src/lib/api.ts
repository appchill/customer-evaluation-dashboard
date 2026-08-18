import type { CustomerData } from './pyramid'

export type CustomerSummary = {
  id: string
  name: string
  grand: number
  data: CustomerData
  createdAt: string
  updatedAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  list: () => request<CustomerSummary[]>('/api/customers'),
  get: (id: string) => request<CustomerSummary>(`/api/customers/${id}`),
  create: (payload: { name: string; grand: number; data: CustomerData }) =>
    request<CustomerSummary>('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: { name: string; grand: number; data: CustomerData }) =>
    request<CustomerSummary>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => request<void>(`/api/customers/${id}`, { method: 'DELETE' }),
}
