import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ApprovalDecision,
  PendingApproval,
  Session,
  SessionMessage,
  SessionSummary,
  StreamEvent,
} from '@/types'
import { fetchWithAuth } from '@/api/http'
import { useWebSocketContext } from '@/context/WebSocketContext'
import {
  useDeleteSessionMutation,
  useSendMessageMutation,
  useSessionQuery,
  useSessionsQuery,
} from './queries/useSessions'
import { createMockStream } from '@/lib/mockStream'

const USE_MOCK_STREAM = import.meta.env.VITE_STREAM_MODE === 'mock'
const nowSec = () => Math.floor(Date.now() / 1000)
const isLocalSessionId = (id?: string | null) =>
  !id || id.startsWith('local_') || id.startsWith('mock_')

function parseSseEvent(rawEvent: string): StreamEvent | null {
  let eventType = ''
  const dataLines: string[] = []

  for (const line of rawEvent.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) return null

  const payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
  if (eventType && typeof payload.type !== 'string') {
    payload.type = eventType
  }
  return payload as StreamEvent
}

async function* readSseEvents(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new Error('流式响应为空')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = parseSseEvent(rawEvent)
      if (event) yield event
      boundary = buffer.indexOf('\n\n')
    }
  }

  const event = parseSseEvent(buffer)
  if (event) yield event
}

type SessionsContextValue = {
  sessions: SessionSummary[]
  currentSession: Session | null
  loading: boolean
  sending: boolean
  loadSessions: () => Promise<void>
  openSession: (id: string) => Promise<void>
  newSession: () => void
  deleteSession: (id: string) => Promise<void>
  sendMessage: (text: string) => Promise<SessionMessage | null>
  retryLastMessage: () => Promise<SessionMessage | null>
  stopGeneration: () => void
  resumeApproval: (
    approval: PendingApproval,
    decision: ApprovalDecision,
  ) => Promise<SessionMessage | null>
}

const SessionsContext = createContext<SessionsContextValue | null>(null)

function toSummary(session: Session): SessionSummary {
  const normalized = normalizeSession(session)
  return {
    id: normalized.id,
    title: normalized.title,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    message_count: normalized.message_count,
    preview: normalized.preview,
  }
}

function normalizeSession(session: Session): Session {
  const messages = session.messages ?? []
  const lastMessage = messages[messages.length - 1]
  return {
    ...session,
    message_count: session.message_count ?? messages.length,
    preview: session.preview ?? lastMessage?.content?.slice(0, 60) ?? '',
    messages,
  }
}

function sortSessions(items: Session[]) {
  return [...items].sort((a, b) => b.updated_at - a.updated_at)
}

function useSessionsController(): SessionsContextValue {
  const { on: wsOn } = useWebSocketContext()
  const queryClient = useQueryClient()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [mockSessions, setMockSessions] = useState<Session[]>([])
  const [sending, setSending] = useState(false)
  const pendingSessionId = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // 保存最新会话快照，供 sendMessage/retryLastMessage 同步读取（规避闭包过期）
  const currentSessionRef = useRef<Session | null>(null)
  useEffect(() => {
    currentSessionRef.current = currentSession
  }, [currentSession])

  const { data: serverSessions = [], isLoading: loadingList } = useSessionsQuery()
  const { isLoading: loadingSession } = useSessionQuery(currentSessionId)
  const deleteSessionMutation = useDeleteSessionMutation()
  const sendMessageMutation = useSendMessageMutation()

  const sessions = useMemo(
    () => (USE_MOCK_STREAM ? mockSessions.map(toSummary) : serverSessions),
    [mockSessions, serverSessions],
  )
  const loading = !currentSession && (loadingList || loadingSession)

  const upsertServerSessionCache = useCallback(
    (session: Session) => {
      if (USE_MOCK_STREAM || isLocalSessionId(session.id)) return
      const normalized = normalizeSession(session)
      queryClient.setQueryData(['session', normalized.id], normalized)
      queryClient.setQueryData<SessionSummary[]>(['sessions'], (prev = []) => {
        const summary = toSummary(normalized)
        return [summary, ...prev.filter((item) => item.id !== summary.id)]
          .sort((a, b) => b.updated_at - a.updated_at)
          .slice(0, 50)
      })
    },
    [queryClient],
  )

  const upsertMockSession = useCallback((session: Session) => {
    if (!USE_MOCK_STREAM) return
    setMockSessions((prev) =>
      sortSessions([session, ...prev.filter((item) => item.id !== session.id)]),
    )
  }, [])

  const updateCurrentMessage = useCallback(
    (messageId: string, updater: (message: SessionMessage) => SessionMessage) => {
      const updatedAt = nowSec()
      const applyUpdate = (session: Session): Session => {
        let changed = false
        const messages = session.messages.map((message) => {
          if (message.id !== messageId) return message
          changed = true
          return updater(message)
        })

        if (!changed) return session

        return {
          ...session,
          messages,
          message_count: messages.length,
          preview: messages[messages.length - 1]?.content.slice(0, 60) || session.preview,
          updated_at: updatedAt,
        }
      }

      setCurrentSession((prev) => (prev ? applyUpdate(prev) : prev))
      if (USE_MOCK_STREAM) {
        setMockSessions((prev) => sortSessions(prev.map((session) => applyUpdate(session))))
      }
    },
    [],
  )

  const loadSessions = useCallback(async () => {
    // Server sessions are handled by TanStack Query; mock sessions live in local state.
  }, [])

  const openSession = useCallback(
    async (id: string) => {
      setCurrentSessionId(id)

      if (USE_MOCK_STREAM) {
        const local = mockSessions.find((session) => session.id === id)
        if (local) {
          setCurrentSession(local)
          pendingSessionId.current = id
        }
        return
      }

      try {
        const res = await fetchWithAuth(`/api/v1/sessions/${id}`)
        if (res.ok) {
          const data: Session = normalizeSession(await res.json())
          setCurrentSession(data)
          pendingSessionId.current = id
          upsertServerSessionCache(data)
        }
      } catch {
        // Keep the current UI state if the history request fails.
      }
    },
    [mockSessions],
  )

  const newSession = useCallback(() => {
    setCurrentSession(null)
    setCurrentSessionId(null)
    pendingSessionId.current = null
  }, [])

  const deleteSession = useCallback(
    async (id: string) => {
      if (USE_MOCK_STREAM) {
        setMockSessions((prev) => prev.filter((session) => session.id !== id))
        if (currentSession?.id === id) {
          setCurrentSession(null)
          setCurrentSessionId(null)
          pendingSessionId.current = null
        }
        return
      }

      try {
        await deleteSessionMutation.mutateAsync(id)
        if (currentSession?.id === id) {
          setCurrentSession(null)
          setCurrentSessionId(null)
          pendingSessionId.current = null
        }
      } catch {
        // Keep the existing list if deletion fails.
      }
    },
    [currentSession, deleteSessionMutation],
  )

  const sendMessage = useCallback(
    async (text: string): Promise<SessionMessage | null> => {
      const trimmed = text.trim()
      if (!trimmed || sending) return null
      setSending(true)

      const requestId = Date.now()
      const createdAt = nowSec()
      const existingSessionId = pendingSessionId.current ?? currentSessionRef.current?.id ?? null
      const localSessionId =
        existingSessionId ??
        (USE_MOCK_STREAM ? `mock_${requestId}` : `local_${requestId}`)

      if (!pendingSessionId.current) {
        pendingSessionId.current = localSessionId
      }

      const userMsg: SessionMessage = {
        id: `local_${requestId}`,
        role: 'user',
        content: trimmed,
        sources: [],
        created_at: createdAt,
      }

      const sessionAfterUser: Session =
        currentSessionRef.current && currentSessionRef.current.id === localSessionId
          ? {
              ...currentSessionRef.current,
              messages: [...currentSessionRef.current.messages, userMsg],
              message_count: currentSessionRef.current.messages.length + 1,
              preview: trimmed.slice(0, 60),
              updated_at: createdAt,
            }
          : {
              id: localSessionId,
              title: trimmed.slice(0, 30),
              created_at: createdAt,
              updated_at: createdAt,
              message_count: 1,
              preview: trimmed.slice(0, 60),
              messages: [userMsg],
            }

      setCurrentSession(sessionAfterUser)
      upsertMockSession(sessionAfterUser)

      if (USE_MOCK_STREAM) {
        const assistantId = `stream_${requestId}`
        let assistantMsg: SessionMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          sources: [],
          stream_events: [],
          streaming: true,
          created_at: nowSec(),
        }

        const sessionWithAssistant: Session = {
          ...sessionAfterUser,
          messages: [...sessionAfterUser.messages, assistantMsg],
          message_count: sessionAfterUser.messages.length + 1,
          preview: trimmed.slice(0, 60),
          updated_at: assistantMsg.created_at,
        }

        setCurrentSession(sessionWithAssistant)
        upsertMockSession(sessionWithAssistant)

        try {
          for await (const event of createMockStream(trimmed)) {
            if (event.type === 'token') {
              assistantMsg = {
                ...assistantMsg,
                content: assistantMsg.content + event.content,
              }
            } else {
              assistantMsg = {
                ...assistantMsg,
                stream_events: [...(assistantMsg.stream_events ?? []), event],
                streaming: event.type === 'done' ? false : assistantMsg.streaming,
              }
            }

            updateCurrentMessage(assistantId, () => assistantMsg)
          }

          assistantMsg = { ...assistantMsg, streaming: false }
          updateCurrentMessage(assistantId, () => assistantMsg)
          return assistantMsg
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: 'error',
            code: 'MOCK_STREAM_ERROR',
            message: error instanceof Error ? error.message : '流式响应中断',
            recoverable: true,
          }
          assistantMsg = {
            ...assistantMsg,
            stream_events: [...(assistantMsg.stream_events ?? []), errorEvent],
            streaming: false,
            error: true,
          }
          updateCurrentMessage(assistantId, () => assistantMsg)
          return assistantMsg
        } finally {
          setSending(false)
        }
      }

      let streamStarted = false
      let streamAssistantId = ''
      let streamAssistantMsg: SessionMessage | null = null

      try {
        const controller = new AbortController()
        abortRef.current = controller
        const res = await fetchWithAuth('/api/v1/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            session_id: isLocalSessionId(existingSessionId) ? null : existingSessionId,
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

        streamStarted = true
        streamAssistantId = `stream_${requestId}`
        streamAssistantMsg = {
          id: streamAssistantId,
          role: 'assistant',
          content: '',
          sources: [],
          stream_events: [],
          streaming: true,
          created_at: nowSec(),
        }

        setCurrentSession((prev) => {
          if (!prev) return prev
          const messages = [...prev.messages, streamAssistantMsg as SessionMessage]
          return {
            ...prev,
            messages,
            message_count: messages.length,
            updated_at: (streamAssistantMsg as SessionMessage).created_at,
          }
        })

        let completed = false
        for await (const event of readSseEvents(res)) {
          if (!streamAssistantMsg) continue

          if (event.type === 'token') {
            streamAssistantMsg = {
              ...streamAssistantMsg,
              content: streamAssistantMsg.content + event.content,
            }
          } else if (event.type === 'interrupt') {
            // 人工审批中断：在助手消息上挂载待审批卡片，停止流式并提醒
            const sid = event.session_id ?? (!isLocalSessionId(existingSessionId) ? existingSessionId : null)
            if (sid) {
              pendingSessionId.current = sid
              setCurrentSessionId(sid)
            }
            const toolNames = event.action_requests.map((a) => a.name).join(', ') || '工具调用'
            streamAssistantMsg = {
              ...streamAssistantMsg,
              content:
                streamAssistantMsg.content ||
                event.message ||
                'Agent 请求执行以下操作，需人工审批：',
              pending_approval: {
                approval_id: event.approval_id,
                session_id: sid || '',
                action_requests: event.action_requests,
                review_configs: event.review_configs,
                status: 'pending',
              },
              stream_events: [...(streamAssistantMsg.stream_events ?? []), event],
              streaming: false,
            }
            toast.warning('有待审批事项', { description: `Agent 请求调用：${toolNames}` })
          } else if (event.type === 'done') {
            completed = true
            const sid = event.session_id ?? (!isLocalSessionId(existingSessionId) ? existingSessionId : null)
            if (sid) {
              pendingSessionId.current = sid
              setCurrentSessionId(sid)
            }
            streamAssistantMsg = {
              ...streamAssistantMsg,
              content: event.message ?? streamAssistantMsg.content,
              compliance_result: event.compliance_result ?? streamAssistantMsg.compliance_result,
              intent: event.intent ?? streamAssistantMsg.intent,
              browser_result: event.browser_result ?? streamAssistantMsg.browser_result,
              action_chain_id: event.action_chain_id ?? streamAssistantMsg.action_chain_id,
              sources: event.sources ?? streamAssistantMsg.sources,
              files: event.files ?? streamAssistantMsg.files,
              suggestions: event.suggestions ?? streamAssistantMsg.suggestions,
              stream_events: [...(streamAssistantMsg.stream_events ?? []), event],
              streaming: false,
            }
            setCurrentSession((prev) => {
              if (!prev) return prev
              const nextSession = normalizeSession({
                ...prev,
                id: sid || prev.id,
                messages: prev.messages,
                message_count: prev.messages.length,
                preview: streamAssistantMsg?.content.slice(0, 60) || prev.preview,
                updated_at: nowSec(),
              })
              if (sid) upsertServerSessionCache(nextSession)
              return {
                ...nextSession,
              }
            })
          } else {
            streamAssistantMsg = {
              ...streamAssistantMsg,
              stream_events: [...(streamAssistantMsg.stream_events ?? []), event],
              streaming: event.type === 'error' ? false : streamAssistantMsg.streaming,
              error: event.type === 'error' ? true : streamAssistantMsg.error,
            }
          }

          updateCurrentMessage(streamAssistantId, () => streamAssistantMsg as SessionMessage)

          if (event.type === 'error') {
            completed = true
            break
          }
        }

        if (streamAssistantMsg && !completed) {
          streamAssistantMsg = { ...streamAssistantMsg, streaming: false }
          updateCurrentMessage(streamAssistantId, () => streamAssistantMsg as SessionMessage)
        }

        // L15: 对话完成后跨域联动 — 扩展 invalidateQueries
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['productTodos'] })
        setSending(false)
        abortRef.current = null
        return streamAssistantMsg
      } catch (error) {
        // 用户主动中断（AbortController.abort）
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (streamStarted && streamAssistantMsg) {
            streamAssistantMsg = { ...streamAssistantMsg, streaming: false }
            updateCurrentMessage(streamAssistantId, () => streamAssistantMsg as SessionMessage)
          }
          setSending(false)
          abortRef.current = null
          return streamAssistantMsg
        }
        if (streamStarted && streamAssistantMsg) {
          const errorEvent: StreamEvent = {
            type: 'error',
            code: 'STREAM_ERROR',
            message: error instanceof Error ? error.message : '流式响应中断',
            recoverable: true,
          }
          streamAssistantMsg = {
            ...streamAssistantMsg,
            stream_events: [...(streamAssistantMsg.stream_events ?? []), errorEvent],
            streaming: false,
            error: true,
          }
          updateCurrentMessage(streamAssistantId, () => streamAssistantMsg as SessionMessage)
          setSending(false)
          abortRef.current = null
          return streamAssistantMsg
        }
      }

      try {
        const data = await sendMessageMutation.mutateAsync({
          message: trimmed,
          sessionId: isLocalSessionId(existingSessionId) ? null : existingSessionId,
        })

        const sid: string = data.session_id ?? ''
        if (sid) {
          pendingSessionId.current = sid
          setCurrentSessionId(sid)
        }

        const assistantMsg: SessionMessage = {
          id: `resp_${Date.now()}`,
          role: 'assistant',
          content: data.message ?? '',
          compliance_result: data.compliance_result ?? undefined,
          intent: data.intent ?? undefined,
          browser_result: data.browser_result ?? undefined,
          action_chain_id: data.action_chain_id ?? undefined,
          conflicts: data.conflicts ?? undefined,
          sources: data.sources ?? [],
          created_at: nowSec(),
        }

        setCurrentSession((prev) => {
          if (!prev) return null
          const messages = [...prev.messages, assistantMsg]
          const nextSession = normalizeSession({
            ...prev,
            id: sid || prev.id,
            messages,
            message_count: messages.length,
            preview: assistantMsg.content.slice(0, 60) || prev.preview,
            updated_at: assistantMsg.created_at,
          })
          if (sid) upsertServerSessionCache(nextSession)
          return nextSession
        })

        return assistantMsg
      } catch {
        const errMsg: SessionMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: '请求失败，请检查后端服务是否运行。',
          sources: [],
          error: true,
          created_at: nowSec(),
        }
        setCurrentSession((prev) => {
          if (!prev) return null
          const messages = [...prev.messages, errMsg]
          return {
            ...prev,
            messages,
            message_count: messages.length,
            preview: errMsg.content.slice(0, 60),
            updated_at: errMsg.created_at,
          }
        })
        return errMsg
      } finally {
        setSending(false)
      }
    },
    [
      currentSession,
      queryClient,
      sending,
      sendMessageMutation,
      updateCurrentMessage,
      upsertServerSessionCache,
      upsertMockSession,
    ],
  )

  // ── 重试上一条失败消息（U10）───────────────────────────────
  // 复用 sendMessage：移除末尾失败的助手回复及对应用户消息后重新发送。
  const retryLastMessage = useCallback(async (): Promise<SessionMessage | null> => {
    if (sending) return null
    const session = currentSessionRef.current
    if (!session) return null
    let lastUserIdx = -1
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const m = session.messages[i]
      if (m && m.role === 'user') {
        lastUserIdx = i
        break
      }
    }
    const lastUser = lastUserIdx >= 0 ? session.messages[lastUserIdx] : undefined
    if (!lastUser) return null
    const userContent = lastUser.content
    const trimmed: Session = {
      ...session,
      messages: session.messages.slice(0, lastUserIdx),
      message_count: lastUserIdx,
    }
    currentSessionRef.current = trimmed
    setCurrentSession(trimmed)
    return sendMessage(userContent)
  }, [sending, sendMessage])

  const resumeApproval = useCallback(
    async (
      approval: PendingApproval,
      decision: ApprovalDecision,
    ): Promise<SessionMessage | null> => {
      if (sending) return null
      setSending(true)

      const requestId = Date.now()
      // 标记审批卡片已处理（乐观更新）
      setCurrentSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.pending_approval?.approval_id === approval.approval_id
              ? {
                  ...m,
                  pending_approval: {
                    ...m.pending_approval,
                    status:
                      decision.type === 'reject'
                        ? ('rejected' as const)
                        : ('approved' as const),
                    resolved_by: 'frontend' as const,
                    decision,
                  },
                }
              : m,
          ),
        }
      })

      const assistantId = `resume_${requestId}`
      let assistantMsg: SessionMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources: [],
        stream_events: [],
        streaming: true,
        created_at: nowSec(),
      }
      setCurrentSession((prev) => {
        if (!prev) return prev
        const messages = [...prev.messages, assistantMsg]
        return { ...prev, messages, message_count: messages.length, updated_at: assistantMsg.created_at }
      })

      try {
        const res = await fetchWithAuth('/api/v1/chat/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: approval.session_id,
            approval_id: approval.approval_id,
            decision,
            comment: decision.comment ?? '',
            action_requests: approval.action_requests,
          }),
        })
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

        let completed = false
        for await (const event of readSseEvents(res)) {
          if (event.type === 'token') {
            assistantMsg = { ...assistantMsg, content: assistantMsg.content + event.content }
          } else if (event.type === 'interrupt') {
            // 链式审批：恢复后再次中断，挂载新的待审批卡片
            const toolNames = event.action_requests.map((a) => a.name).join(', ') || '工具调用'
            assistantMsg = {
              ...assistantMsg,
              content: assistantMsg.content || event.message || 'Agent 请求执行以下操作，需人工审批：',
              pending_approval: {
                approval_id: event.approval_id,
                session_id: event.session_id || approval.session_id,
                action_requests: event.action_requests,
                review_configs: event.review_configs,
                status: 'pending',
              },
              stream_events: [...(assistantMsg.stream_events ?? []), event],
              streaming: false,
            }
            toast.warning('有待审批事项', { description: `Agent 请求调用：${toolNames}` })
            completed = true
          } else if (event.type === 'done') {
            completed = true
            assistantMsg = {
              ...assistantMsg,
              files: event.files ?? assistantMsg.files,
              stream_events: [...(assistantMsg.stream_events ?? []), event],
              streaming: false,
            }
          } else {
            assistantMsg = {
              ...assistantMsg,
              stream_events: [...(assistantMsg.stream_events ?? []), event],
              streaming: event.type === 'error' ? false : assistantMsg.streaming,
            }
          }
          updateCurrentMessage(assistantId, () => assistantMsg)
          if (event.type === 'error') break
        }

        if (!completed) {
          assistantMsg = { ...assistantMsg, streaming: false }
          updateCurrentMessage(assistantId, () => assistantMsg)
        }
        return assistantMsg
      } catch (error) {
        const errorEvent: StreamEvent = {
          type: 'error',
          code: 'RESUME_ERROR',
          message: error instanceof Error ? error.message : '恢复执行失败',
          recoverable: true,
        }
        assistantMsg = {
          ...assistantMsg,
          stream_events: [...(assistantMsg.stream_events ?? []), errorEvent],
          streaming: false,
        }
        updateCurrentMessage(assistantId, () => assistantMsg)
        return assistantMsg
      } finally {
        setSending(false)
      }
    },
    [sending, updateCurrentMessage],
  )

  // ── 中断生成 ─────────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  // ── IM → 前端 审批双向同步（WS 监听）──────────────────────
  useEffect(() => {
    // IM 侧做出决策 → 更新审批卡片状态
    const offResolved = wsOn('approval:resolved', (msg) => {
      const payload = (msg.payload ?? {}) as {
        approval_id?: string
        decision?: ApprovalDecision
        resolved_by?: 'frontend' | 'im'
      }
      const approvalId = payload.approval_id
      if (!approvalId) return
      const dtype = payload.decision?.type
      setCurrentSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.pending_approval?.approval_id === approvalId
              ? {
                  ...m,
                  pending_approval: {
                    ...m.pending_approval,
                    status: dtype === 'reject' ? ('rejected' as const) : ('approved' as const),
                    resolved_by: payload.resolved_by ?? 'im',
                    decision: payload.decision,
                  },
                }
              : m,
          ),
        }
      })
      toast.info('审批已在 IM 处理', {
        description: dtype === 'reject' ? '该操作已在 IM 驳回' : '该操作已在 IM 批准',
      })
    })

    // IM 侧审批后 Agent 恢复执行 → 追加助手回复
    const offResumed = wsOn('approval:resumed', (msg) => {
      const payload = (msg.payload ?? {}) as {
        session_id?: string
        response?: string
        interrupt?: boolean
      }
      const responseText = payload.response ?? ''
      if (!responseText) return
      const resumedMsg: SessionMessage = {
        id: `im_resumed_${Date.now()}`,
        role: 'assistant',
        content: responseText,
        sources: [],
        created_at: nowSec(),
      }
      setCurrentSession((prev) => {
        if (!prev) return prev
        const messages = [...prev.messages, resumedMsg]
        return {
          ...prev,
          messages,
          message_count: messages.length,
          preview: responseText.slice(0, 60) || prev.preview,
          updated_at: resumedMsg.created_at,
        }
      })
    })

    return () => {
      offResolved()
      offResumed()
    }
  }, [wsOn])

  return {
    sessions,
    currentSession,
    loading,
    sending,
    loadSessions,
    openSession,
    newSession,
    deleteSession,
    sendMessage,
    retryLastMessage,
    stopGeneration,
    resumeApproval,
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionsController()
  return createElement(SessionsContext.Provider, { value }, children)
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) {
    throw new Error('useSessions must be used inside SessionProvider')
  }
  return ctx
}
