import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Link2, FileText, FileCode2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { SessionMessage, StreamEvent } from '@/types'
import { ApprovalCard } from '@/components/chat/ApprovalCard'
import { ComplianceCard } from '@/components/chat/ComplianceCard'
import { CostBar } from '@/components/chat/CostBar'
import { StreamMessageRenderer } from '@/components/chat/StreamMessageRenderer'
import { TypewriterEffect } from './TypewriterEffect'
import {
  ActionChainPanel,
  ArbitrationPanel,
  BrowserResultCard,
} from './RuntimePanels'

export function MessageBubble({
  msg,
  isLatest = false,
  sending = false,
  onOpenArtifact,
  onRetry,
}: {
  msg: SessionMessage
  isLatest?: boolean
  sending?: boolean
  onOpenArtifact?: (artifactId?: string) => void
  onRetry?: () => void
}) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)
  const [typingComplete, setTypingComplete] = useState(!isLatest || isUser)
  const [showSources, setShowSources] = useState(false)
  const hasStreamEvents = !isUser && ((msg.stream_events?.length ?? 0) > 0 || msg.streaming)
  // 打字机仅在当前正在接收新回复时触发，历史消息直接渲染
  const shouldType = !isUser && isLatest && !typingComplete && !hasStreamEvents && sending
  const messageComplete = !isUser && !msg.streaming && (hasStreamEvents || typingComplete)
  const hasSources = Boolean(msg.sources?.length)
  // 助手消息发生错误（流式中断/请求失败）时展示「重试」入口（U10）
  const hasError =
    !isUser && (msg.error === true || (msg.stream_events?.some((e) => e.type === 'error') ?? false))
  const artifactFiles = (msg.files ?? []).filter((f) => f.exists !== false)
  // R8: done 事件携带的 usage — 回复完成后展示成本条（无 token 数时 CostBar 自行隐藏）
  const doneUsage = !isUser
    ? (msg.stream_events?.find((e) => e.type === 'done') as
        | Extract<StreamEvent, { type: 'done' }>
        | undefined)?.usage
    : undefined

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'group/bubble mb-8 flex w-full animate-fade-in items-start gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'flex min-w-0 flex-col',
          isUser ? 'items-end' : 'items-start',
          isUser ? 'w-fit max-w-[min(78%,920px)]' : 'w-full max-w-full',
        )}
      >
        <div
          className={cn(
            'w-full text-[15px] leading-[1.7]',
            isUser
              ? 'rounded-lg bg-muted/50 px-4 py-3 text-foreground'
              : 'px-0 py-1 text-foreground',
          )}
        >
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </span>
          ) : hasStreamEvents ? (
            <StreamMessageRenderer
              content={msg.content}
              events={msg.stream_events ?? []}
              streaming={msg.streaming}
            />
          ) : shouldType ? (
            <TypewriterEffect
              text={msg.content}
              speed={20}
              onComplete={() => setTypingComplete(true)}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-headings:mb-2 prose-headings:mt-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && msg.pending_approval && (
          <div className="mt-2 w-full max-w-full">
            <ApprovalCard approval={msg.pending_approval} />
          </div>
        )}

        {messageComplete && msg.compliance_result && (
          <div className="mt-2 w-full max-w-full">
            <ComplianceCard result={msg.compliance_result} />
          </div>
        )}

        {messageComplete && artifactFiles.length > 0 && (
          <div className="mt-2 w-full max-w-full rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              产物 · {artifactFiles.length}
            </div>
            <div className="flex flex-col gap-1">
              {artifactFiles.map((f, idx) => (
                <button
                  key={`${f.path}_${idx}`}
                  type="button"
                  onClick={() => onOpenArtifact?.(`file_${msg.id}_${idx}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/\.(md|markdown)$/i.test(f.name) ? (
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{f.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground/60">查看</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messageComplete && (
          <div className="mt-2 w-full max-w-full">
            <BrowserResultCard result={msg.browser_result} />
            <ArbitrationPanel conflicts={msg.conflicts} />
            <ActionChainPanel chainId={msg.action_chain_id} />
          </div>
        )}

        {messageComplete && <CostBar usage={doneUsage} />}

        {messageComplete && (
          <div className="mt-2 flex gap-2 opacity-0 transition-opacity group-hover/bubble:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title={copied ? '已复制' : '复制'}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>复制</span>
                </>
              )}
            </button>
            {hasSources && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {showSources ? (
                  <>
                    <ChevronUp className="size-3" />
                    <span>收起来源</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    <span>查看来源</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {messageComplete && hasSources && showSources && (
          <div className="mt-2 flex w-full max-w-full flex-wrap gap-1.5">
            {msg.sources.slice(0, 3).map((s, i) => (
              <a
                key={s}
                href={s}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-md border border-border/60 bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground no-underline transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Link2 className="size-3 shrink-0" />
                来源 {i + 1}
              </a>
            ))}
          </div>
        )}

        {hasError && (
          <div className="mt-2 flex w-full max-w-full items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <RotateCcw className="size-3.5 shrink-0" />
            <span className="flex-1">回复生成失败。</span>
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={sending}
                className="shrink-0 rounded-md border border-rose-300 px-2 py-0.5 text-[12px] font-medium transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-900/40"
                title="重新发送上一条消息"
              >
                重试
              </button>
            )}
          </div>
        )}

        <div
          className={cn(
            'mt-1.5 text-[10.5px] text-muted-foreground/50 transition-opacity',
            'opacity-0 group-hover/bubble:opacity-100',
            isUser ? 'text-right' : 'text-left',
          )}
        >
          {new Date(msg.created_at * 1000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}
