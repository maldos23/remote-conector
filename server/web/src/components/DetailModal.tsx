import { useEffect, useRef } from 'react'
import { X, CheckCircle, XCircle, Clock, Terminal, FileText } from 'lucide-react'
import type { LogEntry, ActivityEntry } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModalItem =
  | { kind: 'log';      data: LogEntry & { client_id: string; hostname?: string } }
  | { kind: 'activity'; data: ActivityEntry & { client_id: string; hostname?: string } }

interface Props {
  item: ModalItem | null
  onClose: () => void
}

// ── Level styles ──────────────────────────────────────────────────────────────

const LEVEL_BG: Record<string, string> = {
  INFO:  'bg-matcha-100 text-matcha-700 border-matcha-200',
  WARN:  'bg-amber-50 text-amber-700 border-amber-200',
  ERROR: 'bg-red-50 text-destructive border-red-200',
  DEBUG: 'bg-muted text-muted-foreground border-border',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function DetailModal({ item, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {item.kind === 'log'
              ? <FileText className="w-4 h-4 text-muted-foreground" />
              : <Terminal className="w-4 h-4 text-muted-foreground" />
            }
            <span className="text-sm font-semibold text-foreground">
              {item.kind === 'log' ? 'Detalle del log' : 'Detalle de actividad'}
            </span>
            {item.data.hostname && (
              <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                {item.data.hostname}
              </span>
            )}
            <span className="text-[10px] font-mono bg-muted/50 border border-border px-1.5 py-0.5 rounded text-muted-foreground hidden sm:inline">
              {item.data.client_id.slice(0, 8)}…
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {item.kind === 'log' ? (
            <LogDetail entry={item.data} />
          ) : (
            <ActivityDetail entry={item.data} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Log detail ────────────────────────────────────────────────────────────────

function LogDetail({ entry }: { entry: LogEntry & { client_id: string; hostname?: string } }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nivel">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded border', LEVEL_BG[entry.level] ?? LEVEL_BG.DEBUG)}>
            {entry.level}
          </span>
        </Field>
        <Field label="Timestamp">
          <span className="text-sm font-mono text-foreground">{formatDate(entry.timestamp)}</span>
        </Field>
        <Field label="Client ID">
          <span className="text-xs font-mono text-muted-foreground break-all">{entry.client_id}</span>
        </Field>
        {entry.hostname && (
          <Field label="Hostname">
            <span className="text-sm text-foreground">{entry.hostname}</span>
          </Field>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mensaje</p>
        <pre className="bg-muted/50 border border-border rounded-lg p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
          {entry.message}
        </pre>
      </div>
    </div>
  )
}

// ── Activity detail ───────────────────────────────────────────────────────────

function ActivityDetail({ entry }: { entry: ActivityEntry & { client_id: string; hostname?: string } }) {
  const ok = entry.response?.exit_code === 0
  const hasResponse = entry.response !== undefined

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado">
          {hasResponse ? (
            <span className={cn(
              'flex items-center gap-1.5 text-xs font-semibold',
              ok ? 'text-matcha-600' : 'text-destructive'
            )}>
              {ok
                ? <><CheckCircle className="w-3.5 h-3.5" /> Éxito (exit {entry.response!.exit_code})</>
                : <><XCircle className="w-3.5 h-3.5" /> Falló (exit {entry.response!.exit_code})</>
              }
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> Pendiente
            </span>
          )}
        </Field>
        <Field label="Enviado a">
          <span className="text-sm text-foreground">{entry.hostname ?? entry.client_id.slice(0, 8)}</span>
        </Field>
        <Field label="Fecha">
          <span className="text-sm font-mono text-foreground">{formatDate(entry.sent_at)}</span>
        </Field>
        <Field label="Por">
          <span className="text-sm text-foreground">{entry.sent_by}</span>
        </Field>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Comando</p>
        <pre className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
          {entry.command}
        </pre>
      </div>

      {entry.response?.output && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Salida</p>
          <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
            {entry.response.output}
          </pre>
        </div>
      )}

      {entry.response?.error && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Stderr</p>
          <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs font-mono text-destructive whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {entry.response.error}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}
