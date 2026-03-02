import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Copy, Check, Terminal, RefreshCw, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Provisioned {
  client_id: string
  token: string
  expires_days: number
  ws_port: number
}

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'docker' | 'manual' | 'compose'

export default function AddClientModal({ open, onClose }: Props) {
  const [data, setData] = useState<Provisioned | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('docker')
  const [copied, setCopied] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const provision = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await api.provisionClient()
      setData(res)
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el token')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-provision on open
  useEffect(() => {
    if (open) {
      setTab('docker')
      provision()
    }
  }, [open, provision])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const serverHost = window.location.hostname
  const wssPort = data?.ws_port ?? 8443

  const dockerCmd = data
    ? `docker run -d \\
  --name matcha-client \\
  --restart=always \\
  -p 8000:8000 \\
  -e SERVER_URI="wss://${serverHost}:${wssPort}" \\
  -e CLIENT_TOKEN="${data.token}" \\
  -e HTTP_PORT=8000 \\
  ghcr.io/maldos23/remote-conector/client:latest`
    : ''

  const composeSnippet = data
    ? `services:
  matcha-client:
    image: ghcr.io/maldos23/remote-conector/client:latest
    restart: always
    ports:
      - "8000:8000"
    environment:
      SERVER_URI: "wss://${serverHost}:${wssPort}"
      CLIENT_TOKEN: "${data.token}"
      HTTP_PORT: "8000"`
    : ''

  const buildCmd = data
    ? `# 1. Clona el repositorio
git clone https://github.com/maldos23/remote-conector.git
cd remote-conector

# 2. Construye la imagen
docker build -f client/Dockerfile -t matcha-client:latest .

# 3. Arranca el contenedor
docker run -d \\
  --name matcha-client \\
  --restart=always \\
  -p 8000:8000 \\
  -e SERVER_URI="wss://${serverHost}:${wssPort}" \\
  -e CLIENT_TOKEN="${data.token}" \\
  -e HTTP_PORT=8000 \\
  matcha-client:latest`
    : ''

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Agregar cliente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se generó un token exclusivo para este cliente. Cópialo y úsalo para conectarlo al servidor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted ml-4 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">No se pudo generar el token</p>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
              </div>
              <button
                onClick={provision}
                className="text-xs text-destructive hover:underline font-medium flex-shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generando token...</span>
            </div>
          )}

          {/* Token + client_id */}
          {data && (
            <>
              {/* client_id */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Client ID
                </p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-foreground flex-1 break-all">{data.client_id}</code>
                  <button
                    onClick={() => copy(data.client_id, 'id')}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {copied === 'id' ? <Check className="w-3.5 h-3.5 text-matcha-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* token */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  CLIENT_TOKEN  <span className="normal-case text-[10px]">(válido {data.expires_days} días)</span>
                </p>
                <div className="flex items-start gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <code className="text-[11px] font-mono text-foreground flex-1 break-all leading-relaxed">
                    {data.token}
                  </code>
                  <button
                    onClick={() => copy(data.token, 'token')}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                  >
                    {copied === 'token' ? <Check className="w-3.5 h-3.5 text-matcha-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Install tabs */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  <Terminal className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  Instrucciones de instalación
                </p>

                {/* Tab buttons */}
                <div className="flex gap-1 mb-3">
                  {(['docker', 'compose', 'manual'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        tab === t
                          ? 'bg-matcha-500/10 text-matcha-700 border border-matcha-200'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {t === 'docker' ? 'Docker run' : t === 'compose' ? 'docker-compose' : 'Build local'}
                    </button>
                  ))}
                </div>

                {/* Code block */}
                <div className="relative">
                  <pre className="bg-zinc-950 text-zinc-100 rounded-xl p-4 text-[11px] font-mono whitespace-pre overflow-x-auto leading-relaxed">
                    {tab === 'docker' ? dockerCmd : tab === 'compose' ? composeSnippet : buildCmd}
                  </pre>
                  <button
                    onClick={() => copy(tab === 'docker' ? dockerCmd : tab === 'compose' ? composeSnippet : buildCmd, 'cmd')}
                    className="absolute top-2.5 right-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md px-2 py-1 text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copied === 'cmd'
                      ? <><Check className="w-3 h-3 text-matcha-400" /> Copiado</>
                      : <><Copy className="w-3 h-3" /> Copiar</>
                    }
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground mt-2">
                  El cliente se conectará automáticamente a <code className="bg-muted px-1 rounded">wss://{serverHost}:{wssPort}</code> al iniciar.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={provision}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Generar nuevo token
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-matcha-500 text-white text-xs font-medium hover:bg-matcha-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
