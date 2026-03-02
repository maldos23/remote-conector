import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Terminal, Activity, Clock, Server, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardSocket, type DashboardEvent } from '@/hooks/useSocket'
import { api, type Client, type Metrics, type ActivityEntry, type LogEntry } from '@/lib/api'
import LogViewer from '@/components/LogViewer'
import CommandInput from '@/components/CommandInput'
import ResourceChart from '@/components/ResourceChart'
import ActivityLog from '@/components/ActivityLog'
import { formatDate, timeAgo } from '@/lib/utils'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [client, setClient] = useState<Client | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metricsHistory, setMetricsHistory] = useState<Metrics[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'logs' | 'activity'>('logs')

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [c, l, m, a] = await Promise.all([
        api.getClient(id),
        api.getLogs(id),
        api.getMetrics(id),
        api.getActivity(id),
      ])
      setClient(c)
      setLogs(l.logs)
      setMetricsHistory(m.history)
      setActivity(a.activity)
    } catch {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEvent = useCallback((e: DashboardEvent) => {
    const { event, payload } = e
    if (event === 'metrics' && (payload as any).client_id === id) {
      const m = (payload as any).metrics as Metrics
      setClient((prev) => prev ? { ...prev, latest_metrics: m, last_seen: m.timestamp } : prev)
      setMetricsHistory((prev) => [...prev.slice(-59), m])
    }
    if (event === 'log' && (payload as any).client_id === id) {
      setLogs((prev) => [...prev.slice(-499), (payload as any).log as LogEntry])
    }
    if (event === 'client_disconnected' && (payload as any).client_id === id) {
      setClient((prev) => prev ? { ...prev, connected: false } : prev)
    }
  }, [id])

  useDashboardSocket({ token, onEvent: handleEvent })

  async function sendCommand(command: string) {
    if (!id) return
    const res = await api.sendCommand(id, command)
    const entry: ActivityEntry = {
      command_id: res.command_id,
      command,
      sent_by: 'dashboard',
      sent_at: new Date().toISOString(),
      response: res.result,
    }
    setActivity((prev) => [entry, ...prev])
    return res
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-matcha-500 animate-spin" />
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${client.connected ? 'bg-matcha-500 animate-pulse-dot' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium text-foreground">{client.ip}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">· {client.hostname}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Server, label: 'IP', value: `${client.ip}:${client.http_port ?? 8000}` },
            { icon: Activity, label: 'Status', value: client.connected ? 'Connected' : 'Disconnected' },
            { icon: Clock, label: 'Connected', value: formatDate(client.connected_at) },
            { icon: Clock, label: 'Last seen', value: timeAgo(client.last_seen) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" />{label}
              </p>
              <p className="text-sm font-medium text-foreground truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Resources */}
        <ResourceChart history={metricsHistory} latest={client.latest_metrics} />

        {/* Command input */}
        <CommandInput onSend={sendCommand} disabled={!client.connected} />

        {/* Tabs: Logs / Activity */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            {(['logs', 'activity'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'text-matcha-600 border-b-2 border-matcha-500 -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t} {t === 'logs' ? `(${logs.length})` : `(${activity.length})`}
              </button>
            ))}
          </div>
          <div className="h-96">
            {tab === 'logs' ? (
              <LogViewer logs={logs} />
            ) : (
              <ActivityLog entries={activity} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
