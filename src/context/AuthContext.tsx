import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { fetchWithAuth } from '@/api/http'

const API = '/api/v1'
const IS_MOCK = import.meta.env.VITE_STREAM_MODE === 'mock'

export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'user'
}

interface AuthContextValue {
  user: AuthUser | null
  isAdmin: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('astra_user')

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('astra_user')
      }
    }

    if (IS_MOCK) {
      // Demo / Vercel 部署：mock 模式下自动以 demo 管理员身份登录，
      // 避免访问任意路由时被 RequireAuth 踢回登录页（无需手动登录即可浏览界面）。
      if (!storedUser) {
        const demoUser: AuthUser = { id: 'demo-user', username: 'Demo', role: 'admin' }
        localStorage.setItem('astra_user', JSON.stringify(demoUser))
        setUser(demoUser)
      }
      setLoading(false)
      return
    }

    fetchWithAuth(`${API}/auth/me`)
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('astra_user')
          setUser(null)
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    if (IS_MOCK) {
      const mockUser: AuthUser = { id: 'demo-user', username, role: 'admin' }
      localStorage.setItem('astra_user', JSON.stringify(mockUser))
      setUser(mockUser)
      return
    }

    const res = await fetchWithAuth(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || '登录失败')
    }
    const data = await res.json()
    const newUser: AuthUser = {
      id: data.user_id,
      username: data.username,
      role: data.role,
    }
    localStorage.setItem('astra_user', JSON.stringify(newUser))
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    if (!IS_MOCK) {
      try {
        await fetchWithAuth(`${API}/auth/logout`, { method: 'POST' })
      } catch { /* 登出失败不阻断前端清理 */ }
    }
    localStorage.removeItem('astra_user')
    setUser(null)
  }, [])

  /** 统一认证 fetch：委托集中层（Cookie + CSRF）。 */
  const authFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> =>
      fetchWithAuth(input, init),
    []
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
