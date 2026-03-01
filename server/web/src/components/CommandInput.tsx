import { useState } from 'react'
import { Terminal, Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { CommandResult } from '@/lib/api'

interface Props {
  onSend: (cmd: string) => Promise<CommandResult | undefined>
  disabled?: boolean
}

export default function CommandInput({ onSend, disabled }: Props) {
  const [cmd, setCmd] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandResult['result'] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cmd.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const res = await onSend(cmd)
      if (res) setResult(res.result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Terminal className="w-3.5 h-3.5 text-matcha-500" />
        Execute command
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-md px-3 h-9 font-mono">
          <span className="text-matcha-500 text-sm select-none">$</span>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            disabled={disabled || loading}
            placeholder={disabled ? 'Client disconnected' : 'ls -la / ps aux / uptime'}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || loading || !cmd.trim()}
          className="h-9 px-4 text-sm font-medium bg-matcha-500 hover:bg-matcha-600 text-white rounded-md transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {loading ? 'Running…' : 'Run'}
        </button>
      </form>

      {result && (
        <div className="rounded-lg bg-muted/50 border border-border overflow-hidden">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b border-border ${
            result.status === 'success' ? 'text-matcha-600' : 'text-destructive'
          }`}>
            {result.status === 'success'
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <XCircle className="w-3.5 h-3.5" />
            }
            exit {result.exit_code} · {result.status}
          </div>
          {result.output && (
            <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
              {result.output}
            </pre>
          )}
          {result.error && (
            <pre className="p-3 pt-0 text-xs font-mono text-destructive whitespace-pre-wrap max-h-32 overflow-y-auto">
              {result.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
