import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface AuthState {
  token: string | null
  username: string | null
}

function getStored(): AuthState {
  const token = localStorage.getItem('matcha_token')
  const username = localStorage.getItem('matcha_user')
  return { token, username }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(getStored)

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    localStorage.setItem('matcha_token', res.access_token)
    localStorage.setItem('matcha_user', res.username)
    setState({ token: res.access_token, username: res.username })
    return res
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('matcha_token')
    localStorage.removeItem('matcha_user')
    setState({ token: null, username: null })
  }, [])

  return {
    isAuthenticated: !!state.token,
    token: state.token,
    username: state.username,
    login,
    logout,
  }
}
