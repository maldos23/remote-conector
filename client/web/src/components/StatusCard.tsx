import { Server, Radio, CheckCircle, XCircle } from 'lucide-react'
import type { Status } from '../App'

interface Props { status: Status }

export default function StatusCard({ status }: Props) {
  // Determine WS connection visually via server_uri
  const isSecure = status.server_uri.startsWith('wss://')

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Node identity</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-matcha-500 animate-pulse-dot" />
          <span className="text-xs text-matcha-600 font-medium">active</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Server className="w-4 h-4 text-matcha-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">IP address</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{status.ip}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Radio className="w-4 h-4 text-matcha-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400">WebSocket server</p>
            <p className="text-xs font-mono text-gray-700 truncate">{status.server_uri}</p>
          </div>
          {isSecure
            ? <CheckCircle className="w-4 h-4 text-matcha-500 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          }
        </div>

        <div className="pt-1 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-400">Hostname</p>
            <p className="font-medium text-gray-700 truncate">{status.hostname}</p>
          </div>
          <div>
            <p className="text-gray-400">Client ID</p>
            <p className="font-mono font-medium text-gray-700 truncate">{status.client_id.slice(0, 12)}…</p>
          </div>
        </div>
      </div>
    </div>
  )
}
