import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, Bot, Files, Loader2, Wrench } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSessions } from '@/hooks/useSessions'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { ChainHistoryDrawer } from '@/components/chat/ChainHistoryDrawer'
import { ArtifactsPanel, collectArtifacts, type ChatArtifact } from '@/components/chat/ArtifactsPanel'
import { NextSteps } from '@/components/chat/NextSteps'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { SessionMessage } from '@/types'
import { fetchWithAuth } from '@/api/http'

const chatProfiles = {
  agents: ['合规查询智能体', '风险预警智能体', '知识检索智能体'],
}

interface AgentListItem {
  id: string
  name: string
  enabled: boolean
  sort_order: number
}

const SUGGESTIONS = [
  'LED 灯出口德国需要哪些认证？',
  '无线蓝牙耳机出口美国，FCC 怎么办理？',
  '锂离子电池出口日本 PSE 要求？',
  '玩具出口法国需要 CE 认证吗？',
]

const CHAT_WIDTH_CLASS = 'mx-auto w-full max-w-[1280px]'

const agentDisplayLabels: Record<string, string> = {
  '合规查询 Agent': '合规查询智能体',
  '风险预警 Agent': '风险预警智能体',
  '知识检索 Agent': '知识检索智能体',
  CodexAgent: '通用智能体',
  'Codex Agent': '通用智能体',
  codex_agent: '通用智能体',
  TestComplianceWorker: '合规检查智能体',
  ComplianceWorker: '合规检查智能体',
  RuleEngine: '规则引擎智能体',
  rule_engine: '规则引擎智能体',
  RAG: '法规检索智能体',
  rag_search: '法规检索智能体',
  NLU: '意图解析智能体',
  nlu_parser: '意图解析智能体',
  ConflictArbiter: '冲突仲裁智能体',
  conflict_arbiter: '冲突仲裁智能体',
}

function displayAgentName(agent: string) {
  const mapped = agentDisplayLabels[agent]
  if (mapped) return mapped

  const normalized = agent.replace(/[_-]/g, ' ')
  const withoutAgentSuffix = normalized.replace(/\s*Agent\b/i, '智能体')
  const hasEnglish = /[A-Za-z]/.test(withoutAgentSuffix)
  return hasEnglish ? '自定义智能体' : withoutAgentSuffix
}

function WorkbenchBar({
  agents,
  activeAgent,
  onAgentChange,
  artifactCount,
  onOpenArtifacts,
  toolCount,
}: {
  agents: string[]
  activeAgent: string
  onAgentChange: (value: string) => void
  artifactCount: number
  onOpenArtifacts: () => void
  toolCount: number
}) {
  return (
    <div className="border-b border-border/60 px-6 py-3 sm:px-10 lg:px-14">
      <div className={`${CHAT_WIDTH_CLASS} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-[12px] transition-colors hover:border-border hover:bg-accent/30">
            <Bot className="size-3.5 text-muted-foreground" />
            <Select value={activeAgent} onValueChange={onAgentChange}>
              <SelectTrigger
                aria-label="选择智能体"
                className="h-6 min-w-[148px] border-0 bg-transparent px-0 py-0 text-[12px] font-medium shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&>svg]:size-3.5 [&>svg]:opacity-60"
              >
                <span className="truncate">{displayAgentName(activeAgent)}</span>
              </SelectTrigger>
              <SelectContent className="min-w-[168px] rounded-lg p-1 shadow-md">
                {agents.map((agent) => (
                  <SelectItem key={agent} value={agent} className="rounded-md py-1.5 text-[12px] data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground">
                    {displayAgentName(agent)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground">
            <Wrench className="size-3.5" />
            {toolCount > 0 ? `已启用 ${toolCount} 个工具` : '工具加载中...'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenArtifacts}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Files className="size-3.5" />
            产物 · {artifactCount}
          </button>
          <ChainHistoryDrawer />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onSuggest, onNew }: { onSuggest: (text: string) => void; onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16">
      <div className="mb-16 text-center">
        <h1 className="mb-3 text-[36px] font-semibold leading-tight tracking-tight">
          跨境合规，一问便知
        </h1>
        <p className="text-[15px] text-muted-foreground/80">
          输入产品 + 目标国家，生成 HS 编码、税率、认证清单、风险分级和整改建议
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="rounded-md border border-border/60 bg-background px-4 py-3 text-left text-[13px] transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={onNew}
        className="mt-8 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded"
      >
        或者新建一个空白对话
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[13px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      加载中
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="mb-8 flex items-center gap-2 text-[13px] text-muted-foreground">
      <span>正在诊断</span>
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-1 animate-pulse rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
    </div>
  )
}

export default function ChatPage() {
  const { authFetch } = useAuth()
  const {
    currentSession,
    loading,
    sending,
    loadSessions,
    newSession,
    sendMessage,
    retryLastMessage,
    stopGeneration,
  } = useSessions()

  const location = useLocation()
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const routeState = location.state as { initialMessage?: string; productId?: string } | null
  const [initialMessage, setInitialMessage] = useState<string | null>(
    routeState?.initialMessage ?? null,
  )
  const [agentOptions, setAgentOptions] = useState(chatProfiles.agents)
  const [activeAgent, setActiveAgent] = useState(chatProfiles.agents[0] ?? '')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [autoFollow, setAutoFollow] = useState(true)
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [focusArtifactId, setFocusArtifactId] = useState<string | null>(null)
  const [deletedArtifactIds, setDeletedArtifactIds] = useState<Set<string>>(() => new Set())
  const [createdArtifacts, setCreatedArtifacts] = useState<Extract<ChatArtifact, { kind: 'file' }>[]>([])
  const [productArtifacts, setProductArtifacts] = useState<Extract<ChatArtifact, { kind: 'file' }>[]>([])
  const initSentRef = useRef(false)
  const autoFollowRef = useRef(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessage = currentSession?.messages[currentSession.messages.length - 1]
  const latestAssistantStreaming =
    lastMessage?.role === 'assistant' && lastMessage.streaming

  const setAutoFollowState = useCallback((next: boolean) => {
    autoFollowRef.current = next
    setAutoFollow((current) => (current === next ? current : next))
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior })
    })
  }, [])

  const handleMessagesScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    setAutoFollowState(distanceToBottom < 120)
  }, [setAutoFollowState])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    let cancelled = false
    authFetch('/api/v1/agents')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AgentListItem[] | null) => {
        if (cancelled || !Array.isArray(data)) return
        const enabledAgents = data
          .filter((agent) => agent.enabled)
          .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
          .map((agent) => agent.name)
        if (enabledAgents.length > 0) setAgentOptions(enabledAgents)
      })
      .catch(() => {
        // Agent 列表只影响工作台展示；主对话由 /api/v1/chat/stream 承载。
      })
    return () => {
      cancelled = true
    }
  }, [authFetch])

  // L10: 工具展示接真实注册表
  useEffect(() => {
    let cancelled = false
    fetchWithAuth('/api/v1/tools')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tools?: { display_name: string }[] } | null) => {
        if (cancelled || !data?.tools) return
        setToolNames(data.tools.map((t) => t.display_name))
      })
      .catch(() => {
        // 工具列表只影响展示，不阻塞主流程
      })
    return () => {
      cancelled = true
    }
  }, [])

  // L16: 产物面板按产品 scope 加载 — 当 productId 存在时加载该产品既有产物
  const loadProductArtifacts = useCallback(async () => {
    if (!productId) {
      setProductArtifacts([])
      return
    }
    try {
      const res = await fetchWithAuth(`/api/v1/products/${productId}/artifacts`)
      if (!res.ok) return
      const data = (await res.json()) as {
        artifacts?: { id: string; title: string; file_path: string }[]
      } | null
      if (!data?.artifacts) return
      setProductArtifacts(
        data.artifacts.map((a) => ({
          id: a.id,
          kind: 'file' as const,
          name: a.title,
          path: a.file_path,
          messageId: `product-${productId}`,
          // 携带真实标识以支持产物面板上传附件/按记录删除
          productId,
          artifactId: a.id,
        })),
      )
    } catch {
      // 产物加载失败不阻塞主流程
    }
  }, [productId])

  useEffect(() => {
    void loadProductArtifacts()
  }, [loadProductArtifacts])

  const agentNames = useMemo(
    () => (agentOptions.length > 0 ? agentOptions : chatProfiles.agents),
    [agentOptions],
  )

  useEffect(() => {
    const firstAgent = agentNames[0]
    if (firstAgent && !agentNames.includes(activeAgent)) {
      setActiveAgent(firstAgent)
    }
  }, [activeAgent, agentNames])

  useEffect(() => {
    const next =
      (location.state as { initialMessage?: string } | null)?.initialMessage ?? null
    if (next) {
      setInitialMessage(next)
      initSentRef.current = false
    }
  }, [location.state])

  useEffect(() => {
    if (!initialMessage || initSentRef.current) return
    initSentRef.current = true
    newSession()
    const timer = setTimeout(async () => {
      await sendMessage(initialMessage)
      setInitialMessage(null)
      navigate(location.pathname, { replace: true, state: null })
    }, 50)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage])

  useEffect(() => {
    if (!autoFollowRef.current) return
    scrollToBottom(latestAssistantStreaming ? 'auto' : 'smooth')
  }, [
    currentSession?.messages.length,
    lastMessage?.content,
    lastMessage?.stream_events?.length,
    lastMessage?.streaming,
    latestAssistantStreaming,
    scrollToBottom,
  ])

  const handleSend = async (text: string) => {
    setAutoFollowState(true)
    scrollToBottom('auto')
    await sendMessage(text)
  }

  const handleSuggest = (text: string) => {
    handleSend(text)
  }

  const artifacts = useMemo(
    () =>
      [...collectArtifacts(currentSession?.messages ?? []), ...createdArtifacts, ...productArtifacts].filter(
        (a) => !deletedArtifactIds.has(a.id),
      ),
    [currentSession?.messages, createdArtifacts, productArtifacts, deletedArtifactIds],
  )

  const handleArtifactCreated = useCallback(
    (artifact: Extract<ChatArtifact, { kind: 'file' }>) => {
      setCreatedArtifacts((prev) => [...prev.filter((a) => a.path !== artifact.path), artifact])
    },
    [],
  )

  const handleArtifactDeleted = useCallback((id: string) => {
    setDeletedArtifactIds((prev) => new Set(prev).add(id))
  }, [])

  const handleOpenArtifact = useCallback((artifactId?: string) => {
    setFocusArtifactId(artifactId ?? null)
    setArtifactsOpen(true)
  }, [])

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      <div className="relative flex min-w-0 flex-1 flex-col">
      {currentSession && (
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-4 sm:px-8">
          <h2 className="text-[15px] font-medium tracking-tight">
            {currentSession.title || '新对话'}
          </h2>
          <span className="text-[12px] tabular-nums text-muted-foreground/70">
            {currentSession.messages.length} 条消息
          </span>
        </header>
      )}

      <WorkbenchBar
        agents={agentNames}
        activeAgent={activeAgent}
        onAgentChange={setActiveAgent}
        artifactCount={artifacts.length}
        onOpenArtifacts={() => handleOpenArtifact()}
        toolCount={toolNames.length}
      />

      <div
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-6 py-12 sm:px-10 lg:px-14"
      >
        <div className={`${CHAT_WIDTH_CLASS} flex h-full flex-col`} aria-live="polite" aria-label="对话消息">
          {loading ? (
            <LoadingState />
          ) : !currentSession || currentSession.messages.length === 0 ? (
            <EmptyState onSuggest={handleSuggest} onNew={newSession} />
          ) : (
            currentSession.messages.map((msg: SessionMessage, index: number) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLatest={index === currentSession.messages.length - 1}
                sending={sending}
                onOpenArtifact={handleOpenArtifact}
                onRetry={retryLastMessage}
              />
            ))
          )}
          {sending && !latestAssistantStreaming && <ThinkingDots />}
          {lastMessage?.role === 'assistant' &&
            !lastMessage.streaming &&
            !sending &&
            (lastMessage.suggestions?.length ?? 0) > 0 && (
              <NextSteps
                suggestions={lastMessage.suggestions!}
                onExecute={handleSend}
                disabled={sending}
              />
            )}
          <div ref={bottomRef} />
        </div>
      </div>

      {!autoFollow && currentSession && currentSession.messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setAutoFollowState(true)
            scrollToBottom()
          }}
          className="absolute bottom-24 right-6 z-10 inline-flex h-9 items-center gap-1.5 rounded-md border border-border/70 bg-background/95 px-3 text-[12px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-8"
        >
          <ArrowDown className="size-3.5" />
          回到底部
        </button>
      )}

      <div className="shrink-0 px-4 pb-5 sm:px-6">
        <div className="mx-auto w-full max-w-[720px]">
          <ChatComposer
            onSend={handleSend}
            onStop={stopGeneration}
            sending={sending}
            footer="MiMo v2.5 Pro | 规则引擎 + 法规知识库 + Skill 调用"
          />
        </div>
      </div>
      </div>

      <ArtifactsPanel
        open={artifactsOpen}
        artifacts={artifacts}
        focusId={focusArtifactId}
        onClose={() => setArtifactsOpen(false)}
        onDeleted={handleArtifactDeleted}
        uploadPathPrefix={productId ? `products/${productId}/files` : 'output/chat'}
        onCreated={handleArtifactCreated}
        onChanged={loadProductArtifacts}
      />
    </div>
  )
}
