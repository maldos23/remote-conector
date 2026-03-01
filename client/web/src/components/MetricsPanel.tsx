import { Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { formatBytes } from '../lib/utils'
import type { Status } from '../App'

interface Props {
  metrics: Status['metrics']
}

function Bar({ value }: { value: number }) {
  const color = value >= 90 ? 'bg-red-400' : value >= 75 ? 'bg-amber-400' : 'bg-matcha-500'
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function MetricRow({ icon: Icon, label, value, detail }: {
  icon: React.ElementType
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-matcha-400 flex-shrink-0" />
      <div className="w-10 flex-shrink-0">
        <p className="text-[10px] text-gray-400">{label}</p>
      </div>
      <Bar value={value} />
      <div className="text-right flex-shrink-0 w-24">
        <span className="text-xs font-semibold text-gray-800">{value.toFixed(0)}%</span>
        <span className="text-[10px] text-gray-400 ml-1">{detail}</span>
      </div>
    </div>
  )
}

export default function MetricsPanel({ metrics }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">System resources</p>
      <MetricRow
        icon={Cpu}
        label="CPU"
        value={metrics.cpu_percent}
        detail=""
      />
      <MetricRow
        icon={MemoryStick}
        label="RAM"
        value={metrics.ram_percent}
        detail={`${formatBytes(metrics.ram_used_mb)} / ${formatBytes(metrics.ram_total_mb)}`}
      />
      <MetricRow
        icon={HardDrive}
        label="Disk"
        value={metrics.disk_percent}
        detail={`${metrics.disk_used_gb.toFixed(1)} / ${metrics.disk_total_gb.toFixed(1)} GB`}
      />
      <p className="text-[10px] text-gray-300 pt-1">
        Updated {new Date(metrics.timestamp).toLocaleTimeString()}
      </p>
    </div>
  )
}
