import { useEffect, useRef, useState, useCallback } from 'react'
import type { Client, Metrics, Alert } from '@/lib/api'

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export interface DashboardEvent {
  event: string
  payload: Record<string, unknown>
}

interface UseSocketOptions {
  token: string | null
  onEvent?: (e: DashboardEvent) => void
}

export function useDashboardSocket({ token, onEvent }: UseSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!token) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}/ws/dashboard?token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as DashboardEvent
        onEvent?.(msg)
      } catch {}
    }

    ws.onerror = () => {
      setStatus('disconnected')
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      // Reconnect after 3s
      reconnectRef.current = setTimeout(connect, 3000)
    }
  }, [token, onEvent])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  return { status, send }
}
