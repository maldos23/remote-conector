import { Cpu, MemoryStick, HardDrive } from 'lucide-react'
import type { Client } from '@/lib/api'
import { timeAgo, cn } from '@/lib/utils'

interface Props {
  client: Client
  onClick: () => void
}

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

function metricColor(v: number) {
  if (v >= 90) return 'bg-destructive'
  if (v >= 75) return 'bg-amber-400'
  return 'bg-matcha-500'
}

export default function ClientCard({ client, onClick }: Props) {
  const m = client.latest_metrics

  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-xl p-4 hover:border-matcha-300 hover:shadow-sm transition-all duration-150 animate-fade-in w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${client.connected ? 'bg-matcha-500 animate-pulse-dot' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">{client.ip}</span>
            <span className="text-[10px] text-muted-foreground font-mono">:{client.http_port ?? 8000}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-4 truncate">{client.hostname}</p>
        </div>
        <span className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded-full',
          client.connected
            ? 'bg-matcha-100 text-matcha-700'
            : 'bg-muted text-muted-foreground'
        )}>
          {client.connected ? 'online' : 'offline'}
        </span>
      </div>

      {/* Metrics */}
      {m ? (
        <div className="space-y-2">
          {[
            { icon: Cpu, label: 'CPU', value: m.cpu_percent },
            { icon: MemoryStick, label: 'RAM', value: m.ram_percent },
            { icon: HardDrive, label: 'Disk', value: m.disk_percent },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-8">{label}</span>
              <MetricBar value={value} color={metricColor(value)} />
              <span className="text-xs font-medium text-foreground w-10 text-right">{value.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Waiting for metrics…</p>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">{timeAgo(client.last_seen)}</p>
    </button>
  )
}
