import { X, AlertTriangle, AlertCircle } from 'lucide-react'
import type { Alert } from '@/lib/api'

interface Props {
  alerts: Alert[]
  onDismiss: (index: number) => void
}

export default function AlertBanner({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
            alert.severity === 'critical'
              ? 'bg-destructive/5 border-destructive/20 text-destructive'
              : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400'
          }`}
        >
          {alert.severity === 'critical'
            ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-medium">{alert.message}</p>
            <p className="text-xs opacity-70 mt-0.5">
              {alert.client_id.slice(0, 8)}… · {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button onClick={() => onDismiss(i)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      {alerts.length > 5 && (
        <p className="text-xs text-muted-foreground px-1">+{alerts.length - 5} more alerts</p>
      )}
    </div>
  )
}
