import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts'
import type { Metrics } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  history: Metrics[]
  latest: Metrics | null
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-semibold mt-0.5', color)}>
        {value.toFixed(0)}<span className="text-xs text-muted-foreground">%</span>
      </p>
    </div>
  )
}

function statColor(v: number) {
  if (v >= 90) return 'text-destructive'
  if (v >= 75) return 'text-amber-500'
  return 'text-matcha-600'
}

const customTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-1">{new Date(label).toLocaleTimeString()}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export default function ResourceChart({ history, latest }: Props) {
  const data = history.map((m) => ({
    timestamp: m.timestamp,
    CPU: m.cpu_percent,
    RAM: m.ram_percent,
    Disk: m.disk_percent,
  }))

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-foreground">Resource usage · live</p>
        {latest && (
          <div className="flex items-center gap-6">
            <StatBadge label="CPU" value={latest.cpu_percent} color={statColor(latest.cpu_percent)} />
            <StatBadge label="RAM" value={latest.ram_percent} color={statColor(latest.ram_percent)} />
            <StatBadge label="Disk" value={latest.disk_percent} color={statColor(latest.disk_percent)} />
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => new Date(v).toLocaleTimeString('en-US', { minute: '2-digit', second: '2-digit' })}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={customTooltip} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Line type="monotone" dataKey="CPU" stroke="#4a8c4a" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="RAM" stroke="#65a065" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="Disk" stroke="#96c096" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Collecting metrics…</p>
        </div>
      )}
    </div>
  )
}
