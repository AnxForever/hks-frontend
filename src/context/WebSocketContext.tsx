import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// ── 类型 ─────────────────────────────────────────────────────────────────────

export interface WSNotification {
  type: string       // product_created | compliance_check_failed | certification_expiry | regulation_change | ...
  payload: unknown
  timestamp?: number
}

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketContextValue {
  status: WsStatus
  lastMessage: WSNotification | null
  reconnect: () => void
  /** 注册事件监听器（返回取消注册函数） */
  on: (eventType: string, handler: (msg: WSNotification) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// ── 配置 ─────────────────────────────────────────────────────────────────────

const IS_MOCK = import.meta.env.VITE_STREAM_MODE === 'mock'

// F1: WS 地址归一 — 删除 :8001 硬编码，改用 window.location 动态推导
const WS_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  : 'ws://localhost:8001'
const RECONNECT_DELAY = 5000
const HEARTBEAT_INTERVAL = 30_000

// ── Provider ─────────────────────────────────────────────────────────────────

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<WsStatus>(IS_MOCK ? 'connected' : 'disconnected')
  const [lastMessage, setLastMessage] = useState<WSNotification | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const handlersRef = useRef<Map<string, Set<(msg: WSNotification) => void>>>(new Map())

  const connect = useCallback(() => {
    // Mock mode: no WebSocket connection needed
    if (IS_MOCK) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    // 身份由后端从 Cookie/DEV_MODE 解析（与 HTTP 接口 get_current_user 同口径），
    // 不再拼 user_id 参数，避免告警推送身份与列表读取身份分叉
    const url = `${WS_BASE}/api/v1/ws`
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        // 启动心跳
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onclose = () => {
        setStatus('disconnected')
        wsRef.current = null
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }

      ws.onerror = () => {
        setStatus('error')
        ws.close()
      }

      ws.onmessage = (evt) => {
        try {
          const msg: WSNotification = JSON.parse(evt.data)
          setLastMessage(msg)
          // 根据消息类型自动失效 TanStack Query 缓存（合并自原 useWebSocket）
          switch (msg.type) {
            case 'session_update':
              queryClient.invalidateQueries({ queryKey: ['sessions'] })
              break
            case 'new_message': {
              const sessionId = (msg.payload as { session_id?: string })?.session_id
              if (sessionId) {
                queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
              }
              break
            }
            case 'product:updated':
              queryClient.invalidateQueries({ queryKey: ['products'] })
              queryClient.invalidateQueries({ queryKey: ['productTodos'] })
              break
            default:
              break
          }
          // 分发到注册的处理器
          const handlers = handlersRef.current.get(msg.type)
          if (handlers) {
            handlers.forEach(h => h(msg))
          }
          // 通配符 * 处理器
          const wildcardHandlers = handlersRef.current.get('*')
          if (wildcardHandlers) {
            wildcardHandlers.forEach(h => h(msg))
          }
        } catch {
          // ignore non-JSON
        }
      }
    } catch {
      setStatus('error')
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
    }
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
    wsRef.current?.close()
    connect()
  }, [connect])

  const on = useCallback((eventType: string, handler: (msg: WSNotification) => void) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set())
    }
    handlersRef.current.get(eventType)!.add(handler)
    return () => {
      handlersRef.current.get(eventType)?.delete(handler)
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ status, lastMessage, reconnect, on }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketContext must be used inside WebSocketProvider')
  return ctx
}
