import { useState, useEffect, useCallback } from 'react'
import StatusCard from './components/StatusCard'
import MetricsPanel from './components/MetricsPanel'
import { RefreshCw } from 'lucide-react'

export interface Status {
  client_id: string
  hostname: string
  ip: string
  server_uri: string
  metrics: {
    cpu_percent: number
    ram_percent: number
    ram_used_mb: number
    ram_total_mb: number
    disk_percent: number
    disk_used_gb: number
    disk_total_gb: number
    timestamp: string
  }
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Status = await res.json()
      setStatus(data)
      setLastUpdate(new Date())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-8">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-matcha-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 leading-none">matcha-cloud</h1>
              <p className="text-xs text-gray-400 mt-0.5">client node</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {lastUpdate && <span>{lastUpdate.toLocaleTimeString()}</span>}
            <RefreshCw
              className="w-3.5 h-3.5 cursor-pointer hover:text-matcha-500 transition-colors"
              onClick={fetchStatus}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {status ? (
          <>
            <StatusCard status={status} />
            <MetricsPanel metrics={status.metrics} />
          </>
        ) : !error ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : null}

        <p className="text-center text-[10px] text-gray-300">
          matcha-cloud · updates every 5s
        </p>
      </div>
    </div>
  )
}
