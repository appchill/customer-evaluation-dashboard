import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Assessment from './components/Assessment'

function idFromUrl() {
  return new URLSearchParams(window.location.search).get('customer')
}

export default function App() {
  const [customerId, setCustomerId] = useState<string | null>(idFromUrl)

  useEffect(() => {
    const onPop = () => setCustomerId(idFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openCustomer = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('customer', id)
    window.history.pushState({}, '', url)
    setCustomerId(id)
  }

  const backToDashboard = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('customer')
    window.history.pushState({}, '', url)
    setCustomerId(null)
  }

  if (customerId) return <Assessment id={customerId} onBack={backToDashboard} />
  return <Dashboard onOpen={openCustomer} />
}
