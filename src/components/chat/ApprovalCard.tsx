import { useMemo, useState } from 'react'
import { Check, MessageSquare, PencilLine, ShieldAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useSessions } from '@/hooks/useSessions'
import type {
  ActionRequest,
  ApprovalDecisionType,
  PendingApproval,
} from '@/types'

const ALL_DECISIONS: ApprovalDecisionType[] = ['approve', 'edit', 'reject', 'respond']

const STATUS_META = {
  approved: {
    label: '已批准',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  rejected: {
    label: '已拒绝',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  },
  resolved: {
    label: '已处理',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
  },
} as const

function ActionRequestBlock({ action }: { action: ActionRequest }) {
  const argsText = useMemo(() => {
    const args = action.args ?? {}
    return Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : ''
  }, [action.args])
  return (
    <div className="rounded-md bg-muted/35 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[12.5px] font-semibold tracking-tight">{action.name}</span>
        {action.description && (
          <span className="truncate text-[11px] text-muted-foreground">
            {action.description}
          </span>
        )}
      </div>
      {argsText && (
        <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11.5px] leading-5 text-muted-foreground">
          {argsText}
        </pre>
      )}
    </div>
  )
}

export function ApprovalCard({ approval }: { approval: PendingApproval }) {
  const { resumeApproval } = useSessions()
  const [mode, setMode] = useState<'idle' | 'edit' | 'reject' | 'respond'>('idle')
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const primaryAction = approval.action_requests[0]
  const allowed = useMemo(() => {
    const config = approval.review_configs.find(
      (c) => c.action_name === primaryAction?.name,
    )
    return config?.allowed_decisions?.length ? config.allowed_decisions : ALL_DECISIONS
  }, [approval.review_configs, primaryAction?.name])

  const pending = approval.status === 'pending'
  const statusMeta = !pending
    ? STATUS_META[approval.status === 'approved' ? 'approved' : approval.status === 'rejected' ? 'rejected' : 'resolved']
    : null

  const enterMode = (next: 'edit' | 'reject' | 'respond') => {
    setDraftError('')
    setDraft(
      next === 'edit'
        ? JSON.stringify(primaryAction?.args ?? {}, null, 2)
        : '',
    )
    setMode(next)
  }

  const submit = async (type: ApprovalDecisionType) => {
    if (submitting) return
    if (type === 'edit') {
      try {
        const args = JSON.parse(draft || '{}') as Record<string, unknown>
        setSubmitting(true)
        await resumeApproval(approval, { type: 'edit', args })
      } catch (e) {
        if (e instanceof SyntaxError) {
          setDraftError('参数不是合法的 JSON，请修正后重试')
          return
        }
        throw e
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (type === 'respond' && !draft.trim()) {
      setDraftError('回复内容不能为空')
      return
    }
    setSubmitting(true)
    try {
      if (type === 'approve') {
        await resumeApproval(approval, { type: 'approve' })
      } else if (type === 'reject') {
        await resumeApproval(approval, { type: 'reject', comment: draft.trim() })
      } else {
        await resumeApproval(approval, { type: 'respond', response: draft.trim() })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-300/50 bg-card p-3.5 dark:border-amber-700/40">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
        <span className="text-[13px] font-semibold tracking-tight">
          Agent 请求执行敏感操作，需人工审批
        </span>
        {statusMeta && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
              statusMeta.cls,
            )}
          >
            {statusMeta.label}
          </span>
        )}
        {approval.resolved_by && (
          <Badge variant="secondary" className="text-[11px] font-medium">
            {approval.resolved_by === 'im' ? '经 IM 处理' : '经前端处理'}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {approval.action_requests.map((action, i) => (
          <ActionRequestBlock key={`${action.name}-${i}`} action={action} />
        ))}
      </div>

      {pending && mode !== 'idle' && (
        <div className="space-y-1.5">
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setDraftError('')
            }}
            rows={mode === 'edit' ? 6 : 3}
            className={cn('text-[12.5px]', mode === 'edit' && 'font-mono')}
            placeholder={
              mode === 'edit'
                ? '编辑工具参数（JSON）'
                : mode === 'reject'
                  ? '拒绝原因（可选）'
                  : '回复 Agent 的内容'
            }
          />
          {draftError && (
            <div className="text-[11.5px] text-rose-600 dark:text-rose-400">{draftError}</div>
          )}
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'idle' ? (
            <>
              {allowed.includes('approve') && (
                <Button size="sm" disabled={submitting} onClick={() => void submit('approve')}>
                  <Check className="mr-1 size-3.5" />
                  批准
                </Button>
              )}
              {allowed.includes('edit') && (
                <Button size="sm" variant="outline" disabled={submitting} onClick={() => enterMode('edit')}>
                  <PencilLine className="mr-1 size-3.5" />
                  编辑参数
                </Button>
              )}
              {allowed.includes('respond') && (
                <Button size="sm" variant="outline" disabled={submitting} onClick={() => enterMode('respond')}>
                  <MessageSquare className="mr-1 size-3.5" />
                  回复
                </Button>
              )}
              {allowed.includes('reject') && (
                <Button size="sm" variant="destructive" disabled={submitting} onClick={() => enterMode('reject')}>
                  <X className="mr-1 size-3.5" />
                  拒绝
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant={mode === 'reject' ? 'destructive' : 'default'}
                disabled={submitting}
                onClick={() => void submit(mode)}
              >
                {submitting ? '提交中…' : mode === 'edit' ? '按修改后参数批准' : mode === 'reject' ? '确认拒绝' : '发送回复'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  setMode('idle')
                  setDraftError('')
                }}
              >
                取消
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
