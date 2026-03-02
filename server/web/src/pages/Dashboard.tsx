import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, LogOut, Wifi, WifiOff, Users, RefreshCw,
  Terminal, FileText, CheckCircle, XCircle, Clock, UserPlus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardSocket, type DashboardEvent } from '@/hooks/useSocket'
import { api, type Client, type Alert, type LogEntry, type ActivityEntry } from '@/lib/api'
import ClientCard from '@/components/ClientCard'
import AlertBanner from '@/components/AlertBanner'
import DetailModal, { type ModalItem } from '@/components/DetailModal'
import AddClientModal from '@/components/AddClientModal'
import { timeAgo, cn } from '@/lib/utils'

type RichLog = LogEntry & { client_id: string; hostname?: string }
type RichActivity = ActivityEntry & { client_id: string; hostname?: string }
type FeedTab = 'logs' | 'activity'

export default function Dashboard() {
  const { token, username, logout } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [broadcastCmd, setBroadcastCmd] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)

  // Global feed
  const [globalLogs, setGlobalLogs] = useState<RichLog[]>([])
  const [globalActivity, setGlobalActivity] = useState<RichActivity[]>([])
  const [feedTab, setFeedTab] = useState<FeedTab>('logs')
  const loadedClientsRef = useRef<Set<string>>(new Set())
  const [modalItem, setModalItem] = useState<ModalItem | null>(null)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const clientsRef = useRef<Client[]>([])
  useEffect(() => { clientsRef.current = clients }, [clients])
  const clientHostname = useCallback((id: string) => clientsRef.current.find((c) => c.client_id === id)?.hostname, [])

  const fetchClients = useCallback(async () => {
    try {
      const data = await api.getClients()
      setClients(data)
    } catch {
      // token may be expired
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  // Fetch logs + activity for newly seen clients
  useEffect(() => {
    const newClients = clients.filter((c) => !loadedClientsRef.current.has(c.client_id))
    if (newClients.length === 0) return
    newClients.forEach((c) => loadedClientsRef.current.add(c.client_id))
    newClients.forEach(async (c) => {
      try {
        const [logsRes, actRes] = await Promise.all([
          api.getLogs(c.client_id, 100),
          api.getActivity(c.client_id, 50),
        ])
        setGlobalLogs((prev) =>
          [...prev.filter((l) => l.client_id !== c.client_id),
           ...logsRes.logs.map((l) => ({ ...l, client_id: c.client_id, hostname: c.hostname }))]
            .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')).slice(0, 500)
        )
        setGlobalActivity((prev) =>
          [...prev.filter((a) => a.client_id !== c.client_id),
           ...actRes.activity.map((a) => ({ ...a, client_id: c.client_id, hostname: c.hostname }))]
            .sort((a, b) => (b.sent_at ?? '').localeCompare(a.sent_at ?? '')).slice(0, 200)
        )
      } catch { /* ignore */ }
    })
  }, [clients])

  const handleEvent = useCallback((e: DashboardEvent) => {
    const { event, payload } = e

    if (event === 'initial_state') {
      setClients((payload as any).clients ?? [])
      return
    }

    if (event === 'client_connected') {
      setClients((prev) => {
        const exists = prev.find((c) => c.client_id === (payload as any).client_id)
        if (exists) return prev.map((c) => c.client_id === (payload as any).client_id ? { ...c, ...(payload as any) } : c)
        return [...prev, payload as unknown as Client]
      })
    }

    if (event === 'client_disconnected') {
      setClients((prev) => prev.filter((c) => c.client_id !== (payload as any).client_id))
    }

    if (event === 'metrics') {
      const { client_id, metrics } = payload as any
      setClients((prev) =>
        prev.map((c) => c.client_id === client_id ? { ...c, latest_metrics: metrics, last_seen: metrics.timestamp } : c)
      )
    }

    if (event === 'log') {
      const { client_id, log } = payload as any
      setGlobalLogs((prev) => [{ ...log, client_id, hostname: clientHostname(client_id) }, ...prev].slice(0, 500))
    }
    if (event === 'activity') {
      const { client_id, entry } = payload as any
      setGlobalActivity((prev) => [{ ...entry, client_id, hostname: clientHostname(client_id) }, ...prev].slice(0, 200))
    }
    if (event === 'alert') {
      const alert = (payload as any).alert as Alert
      setAlerts((prev) => [alert, ...prev].slice(0, 20))
    }
  }, [clientHostname])

  const { status } = useDashboardSocket({ token, onEvent: handleEvent })

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastCmd.trim()) return
    setBroadcasting(true)
    try {
      await api.broadcast(broadcastCmd)
      setBroadcastCmd('')
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-matcha-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground tracking-tight">matcha-cloud</span>
            <span className="text-xs text-muted-foreground hidden sm:block">server</span>
          </div>

          <div className="flex items-center gap-3">
            {/* WS status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {status === 'connected'
                ? <><Wifi className="w-3.5 h-3.5 text-matcha-500" /> <span className="hidden sm:block">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-muted-foreground" /> <span className="hidden sm:block">Offline</span></>
              }
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-xs text-muted-foreground hidden sm:block">{username}</span>
            <button
              onClick={() => setAddClientOpen(true)}
              title="Agregar cliente"
              className="flex items-center gap-1.5 text-xs font-medium text-matcha-600 hover:text-matcha-700 border border-matcha-200 hover:border-matcha-300 bg-matcha-500/5 hover:bg-matcha-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Agregar cliente</span>
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} onDismiss={(i) => setAlerts((prev) => prev.filter((_, idx) => idx !== i))} />
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clients</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-semibold text-foreground">{clients.length}</span>
              <span className="text-xs text-muted-foreground mb-0.5">connected</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stream</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-matcha-500 animate-pulse-dot' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium text-foreground capitalize">{status}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alerts</p>
            <span className="text-2xl font-semibold text-foreground">{alerts.length}</span>
          </div>
        </div>

        {/* Broadcast bar */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Broadcast command to all clients</p>
          <form onSubmit={handleBroadcast} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-md px-3 h-9">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                value={broadcastCmd}
                onChange={(e) => setBroadcastCmd(e.target.value)}
                placeholder="ls -la | uptime"
                className="flex-1 text-sm bg-transparent focus:outline-none font-mono placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={broadcasting || !broadcastCmd.trim()}
              className="h-9 px-4 text-sm font-medium bg-matcha-500 hover:bg-matcha-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {broadcasting ? 'Sending…' : 'Broadcast'}
            </button>
          </form>
        </div>

        {/* Client grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Connected clients</h2>
            <button
              onClick={fetchClients}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-40 animate-pulse" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No clients connected</p>
              <p className="text-xs text-muted-foreground mt-1">Start a client instance to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((c) => (
                <ClientCard
                  key={c.client_id}
                  client={c}
                  onClick={() => navigate(`/client/${c.client_id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Global Feed ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-1">
              <FeedTabBtn active={feedTab === 'logs'} onClick={() => setFeedTab('logs')}>
                <FileText className="w-3.5 h-3.5" /> Logs
                {globalLogs.length > 0 && <Pill n={globalLogs.length} />}
              </FeedTabBtn>
              <FeedTabBtn active={feedTab === 'activity'} onClick={() => setFeedTab('activity')}>
                <Activity className="w-3.5 h-3.5" /> Activity
                {globalActivity.length > 0 && <Pill n={globalActivity.length} />}
              </FeedTabBtn>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:block">Todas las instancias · haz clic para ver detalle</span>
          </div>
          <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
            {feedTab === 'logs' ? (
              globalLogs.length === 0 ? <FeedEmpty label="No hay logs todavía" /> :
              globalLogs.map((log, i) => (
                <LogRow key={`${log.client_id}-${log.timestamp}-${i}`} log={log}
                  onClick={() => setModalItem({ kind: 'log', data: log })} />
              ))
            ) : (
              globalActivity.length === 0 ? <FeedEmpty label="Sin actividad todavía" /> :
              globalActivity.map((entry, i) => (
                <ActivityRow key={`${entry.command_id ?? i}-${entry.client_id}`} entry={entry}
                  onClick={() => setModalItem({ kind: 'activity', data: entry })} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
    <DetailModal item={modalItem} onClose={() => setModalItem(null)} />
    <AddClientModal open={addClientOpen} onClose={() => setAddClientOpen(false)} />
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FeedTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
      active ? 'bg-matcha-500/10 text-matcha-700 border border-matcha-200' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    )}>{children}</button>
  )
}

function Pill({ n }: { n: number }) {
  return (
    <span className="text-[9px] bg-muted border border-border rounded-full px-1.5 py-px text-muted-foreground font-mono">
      {n > 999 ? '999+' : n}
    </span>
  )
}

function FeedEmpty({ label }: { label: string }) {
  return <div className="py-10 text-center"><p className="text-xs text-muted-foreground">{label}</p></div>
}

function ClientBadge({ hostname, clientId }: { hostname?: string; clientId: string }) {
  return (
    <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-px rounded text-muted-foreground flex-shrink-0 max-w-[90px] truncate">
      {hostname ?? clientId.slice(0, 8)}
    </span>
  )
}

const LVL_DOT: Record<string, string> = {
  INFO: 'bg-matcha-500', WARN: 'bg-amber-400', ERROR: 'bg-destructive', DEBUG: 'bg-muted-foreground',
}
const LVL_TEXT: Record<string, string> = {
  INFO: 'text-matcha-600', WARN: 'text-amber-500', ERROR: 'text-destructive', DEBUG: 'text-muted-foreground',
}

function LogRow({ log, onClick }: { log: RichLog; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left">
      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', LVL_DOT[log.level] ?? 'bg-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <ClientBadge hostname={log.hostname} clientId={log.client_id} />
          <span className={cn('text-[10px] font-semibold flex-shrink-0', LVL_TEXT[log.level] ?? 'text-foreground')}>{log.level}</span>
          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{timeAgo(log.timestamp)}</span>
        </div>
        <p className="text-xs font-mono text-foreground truncate">{log.message}</p>
      </div>
    </button>
  )
}

function ActivityRow({ entry, onClick }: { entry: RichActivity; onClick: () => void }) {
  const has = entry.response !== undefined
  const ok = entry.response?.exit_code === 0
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left">
      <span className="flex-shrink-0 mt-0.5">
        {has ? ok
          ? <CheckCircle className="w-3.5 h-3.5 text-matcha-500" />
          : <XCircle className="w-3.5 h-3.5 text-destructive" />
          : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <ClientBadge hostname={entry.hostname} clientId={entry.client_id} />
          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{timeAgo(entry.sent_at)}</span>
        </div>
        <code className="text-xs font-mono text-foreground truncate block">{entry.command}</code>
        {entry.response?.output && (
          <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
            {entry.response.output.trimStart().slice(0, 120)}
          </p>
        )}
      </div>
    </button>
  )
}
