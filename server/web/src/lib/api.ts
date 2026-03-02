const BASE = '/api'

function getToken(): string {
  return localStorage.getItem('matcha_token') ?? ''
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ access_token: string; username: string }>('POST', '/auth/login', { username, password }),

  // Clients
  getClients: () => request<Client[]>('GET', '/clients'),
  getClient: (id: string) => request<Client>('GET', `/clients/${id}`),
  getLogs: (id: string, limit = 200) =>
    request<{ logs: LogEntry[] }>('GET', `/clients/${id}/logs?limit=${limit}`),
  getMetrics: (id: string) =>
    request<{ latest: Metrics | null; history: Metrics[] }>('GET', `/clients/${id}/metrics`),
  getActivity: (id: string, limit = 100) =>
    request<{ activity: ActivityEntry[] }>('GET', `/clients/${id}/activity?limit=${limit}`),

  // Provision
  provisionClient: () =>
    request<{ client_id: string; token: string; expires_days: number; ws_port: number }>('POST', '/clients/provision'),

  // Commands
  sendCommand: (clientId: string, command: string, timeout = 30) =>
    request<CommandResult>('POST', `/commands/${clientId}`, { command, timeout }),
  broadcast: (command: string, timeout = 30) =>
    request<BroadcastResult>('POST', '/commands/broadcast/all', { command, timeout }),
}

// Types
export interface Client {
  client_id: string
  ip: string
  hostname: string
  http_port: number
  connected: boolean
  connected_at: string
  last_seen: string
  latest_metrics: Metrics | null
}

export interface Metrics {
  client_id: string
  timestamp: string
  cpu_percent: number
  ram_percent: number
  ram_used_mb: number
  ram_total_mb: number
  disk_percent: number
  disk_used_gb: number
  disk_total_gb: number
}

export interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
}

export interface ActivityEntry {
  command_id: string
  command: string
  sent_by: string
  sent_at: string
  response?: {
    status: string
    output: string
    exit_code: number
    error?: string
  }
}

export interface CommandResult {
  client_id: string
  command_id: string
  result: {
    status: string
    output: string
    error: string
    exit_code: number
  }
}

export interface BroadcastResult {
  broadcast: boolean
  results: Record<string, { status: string; output: string; exit_code: number }>
}

export interface Alert {
  client_id: string
  timestamp: string
  severity: 'warning' | 'critical'
  resource: 'cpu' | 'ram' | 'disk'
  value: number
  threshold: number
  message: string
}
