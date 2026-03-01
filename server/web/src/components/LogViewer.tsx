import { useEffect, useRef } from 'react'
import type { LogEntry } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  logs: LogEntry[]
}

const LEVEL_STYLE: Record<string, string> = {
  INFO:  'text-matcha-600',
  WARN:  'text-amber-500',
  ERROR: 'text-destructive',
  DEBUG: 'text-muted-foreground',
}

export default function LogViewer({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No logs yet</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3 font-mono text-xs space-y-0.5">
      {logs.map((log, i) => (
        <div key={i} className="flex gap-3 items-start hover:bg-muted/30 rounded px-1 py-0.5">
          <span className="text-muted-foreground flex-shrink-0 w-[140px] truncate">
            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={cn('font-semibold flex-shrink-0 w-12', LEVEL_STYLE[log.level] ?? 'text-foreground')}>
            {log.level}
          </span>
          <span className="text-foreground break-all">{log.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
