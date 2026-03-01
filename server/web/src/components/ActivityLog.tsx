import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { ActivityEntry } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'

interface Props {
  entries: ActivityEntry[]
}

export default function ActivityLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No commands sent yet</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-border">
      {entries.map((entry, i) => (
        <div key={entry.command_id ?? i} className="px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-2">
            {entry.response ? (
              entry.response.exit_code === 0
                ? <CheckCircle className="w-3.5 h-3.5 text-matcha-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-between">
                <code className="text-xs font-mono text-foreground truncate max-w-[300px]">{entry.command}</code>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(entry.sent_at)}</span>
              </div>
              {entry.response?.output && (
                <pre className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                  {entry.response.output.slice(0, 200)}
                </pre>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
