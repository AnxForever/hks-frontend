/**
 * 产品待办详情页 — 点击产品卡片后进入。
 *
 * 展示该产品的全部业务待办（合规缺口/认证缺失/报关单/风控告警/自定义），
 * 每条待办可「执行」（喂给 Agent 编排执行）或手动管理状态。
 * 复用 NextSteps「点击→喂 Agent」范式。
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/hooks/useConfirm'
import { useProductsDashboard } from '@/hooks/queries/useProducts'
import {
  useCreateTodo,
  useDeleteTodo,
  useExecuteTodo,
  useProductTodos,
  useUpdateTodo,
} from '@/hooks/queries/useProductTodos'
import type { ProductTodo, ProductTodoPriority, ProductTodoStatus, ProductTodoType } from '@/types'
import { cn } from '@/lib/utils'

const statusConfig: Record<ProductTodoStatus, { label: string; icon: typeof Circle; tone: string }> = {
  pending: { label: '待执行', icon: Circle, tone: 'border-border bg-muted/40 text-muted-foreground' },
  running: { label: '执行中', icon: Loader2, tone: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300' },
  completed: { label: '已完成', icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' },
  failed: { label: '失败', icon: XCircle, tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' },
  cancelled: { label: '已取消', icon: XCircle, tone: 'border-border bg-muted/20 text-muted-foreground/60' },
}

const priorityTone: Record<ProductTodoPriority, string> = {
  low: 'border-border text-muted-foreground',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:text-amber-300',
  high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:text-orange-300',
  critical: 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:text-red-300',
}

const typeLabels: Record<ProductTodoType, string> = {
  compliance_gap: '合规缺口',
  cert_missing: '认证缺失',
  declaration: '报关单',
  risk_alert: '风控告警',
  custom: '自定义',
}

const typeIcons: Record<ProductTodoType, typeof FileText> = {
  compliance_gap: ShieldCheck,
  cert_missing: FileText,
  declaration: FileText,
  risk_alert: AlertTriangle,
  custom: Circle,
}

const sourceLabels: Record<string, string> = {
  compliance_check: '合规检查',
  risk_alert: '风控告警',
  manual: '手动创建',
  next_steps: '推荐操作',
}

export default function ProductTodoPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const dashboard = useProductsDashboard()
  const todosQuery = useProductTodos(productId)
  const createTodo = useCreateTodo(productId ?? '')
  const executeTodo = useExecuteTodo(productId ?? '')
  const updateTodo = useUpdateTodo(productId ?? '')
  const deleteTodo = useDeleteTodo(productId ?? '')
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<ProductTodoStatus | 'all'>('all')

  const product = dashboard.data?.products.find((p) => p.id === productId)
  const todos = todosQuery.data?.todos ?? []
  const filtered = filter === 'all' ? todos : todos.filter((t) => t.status === filter)
  const pendingCount = todos.filter((t) => t.status === 'pending').length

  const handleExecute = async (todo: ProductTodo) => {
    try {
      await executeTodo.mutateAsync(todo.id)
      toast.success(`待办「${todo.title}」已提交执行`)
    } catch (e) {
      toast.error(`执行失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }
  }

  const handleCancel = async (todo: ProductTodo) => {
    const ok = await confirm({
      title: '取消待办',
      description: `确认取消「${todo.title}」？`,
      variant: 'destructive',
      confirmLabel: '取消待办',
    })
    if (!ok) return
    await updateTodo.mutateAsync({ todoId: todo.id, status: 'cancelled' })
    toast.success('待办已取消')
  }

  const handleDelete = async (todo: ProductTodo) => {
    const ok = await confirm({
      title: '删除待办',
      description: `确认删除「${todo.title}」？此操作不可恢复。`,
      variant: 'destructive',
      confirmLabel: '删除',
    })
    if (!ok) return
    await deleteTodo.mutateAsync(todo.id)
    toast.success('待办已删除')
  }

  const handleCreate = async (body: { title: string; prompt: string; todo_type: string; priority: string }) => {
    await createTodo.mutateAsync({
      title: body.title,
      prompt: body.prompt,
      todo_type: body.todo_type,
      priority: body.priority,
    })
    toast.success('待办已创建')
    setAddOpen(false)
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* 顶部导航 */}
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-[1000px] px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate(`/app/products/${productId}`)}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            返回产品详情
          </button>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-semibold tracking-tight">
                {product?.name ?? '产品待办'}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {product?.target_markets?.join(' · ') || ''}
                {product?.hs_code ? ` · HS ${product.hs_code}` : ''}
                {pendingCount > 0 ? ` · ${pendingCount} 项待执行` : ' · 暂无待办'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => navigate(`/app/products/${productId}/chat`)}
              >
                <MessageSquare className="mr-1.5 size-3.5" />
                对话
              </Button>
              <Button size="sm" className="h-8 text-[12px]" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                新建待办
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] space-y-4 px-6 py-6 sm:px-8">
        {/* 状态筛选 */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'running', 'completed', 'failed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
                filter === s
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {s === 'all' ? `全部 (${todos.length})` : `${statusConfig[s].label} (${todos.filter((t) => t.status === s).length})`}
            </button>
          ))}
        </div>

        {/* 待办列表 */}
        {todosQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-border/60 bg-card py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            加载待办...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <div className="text-[14px] font-medium">
              {filter === 'all' ? '暂无待办' : `无${statusConfig[filter as ProductTodoStatus]?.label ?? ''}待办`}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              合规检查、风控告警和对话推荐会自动生成待办，也可手动创建
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((todo) => {
              const sc = statusConfig[todo.status]
              const StatusIcon = sc.icon
              const TypeIcon = typeIcons[todo.todo_type] ?? Circle
              return (
                <div
                  key={todo.id}
                  className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border"
                >
                  <TypeIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium">{todo.title}</span>
                      <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold', sc.tone)}>
                        <StatusIcon className={cn('mr-0.5 inline size-2.5', todo.status === 'running' && 'animate-spin')} />
                        {sc.label}
                      </span>
                      {todo.priority !== 'low' && (
                        <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold', priorityTone[todo.priority])}>
                          {todo.priority}
                        </span>
                      )}
                    </div>
                    {todo.description && (
                      <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{todo.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{typeLabels[todo.todo_type] ?? todo.todo_type}</Badge>
                      <span>{sourceLabels[todo.source] ?? todo.source}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock3 className="size-3" />
                        {new Date(todo.created_at).toLocaleDateString('zh-CN')}
                      </span>
                      {todo.result_summary && (
                        <span className="max-w-[200px] truncate text-emerald-600 dark:text-emerald-400">
                          {todo.result_summary}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {(todo.status === 'pending' || todo.status === 'failed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={executeTodo.isPending}
                        onClick={() => handleExecute(todo)}
                      >
                        <Play className="mr-1 size-3" />
                        执行
                      </Button>
                    )}
                    {todo.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleCancel(todo)}
                      >
                        取消
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive"
                      onClick={() => handleDelete(todo)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddTodoDialog
        open={addOpen}
        saving={createTodo.isPending}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

function AddTodoDialog({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  saving: boolean
  onClose: () => void
  onSubmit: (body: { title: string; prompt: string; todo_type: string; priority: string }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [todoType, setTodoType] = useState<string>('custom')
  const [priority, setPriority] = useState<string>('medium')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !prompt.trim()) return toast.error('标题和执行指令不能为空')
    await onSubmit({ title: title.trim(), prompt: prompt.trim(), todo_type: todoType, priority })
    setTitle('')
    setPrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建待办</DialogTitle>
          <DialogDescription>
            创建后点击「执行」即可由 Agent 自动编排完成
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">标题</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：补全欧盟 CE 认证" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">执行指令（喂给 Agent）</label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="如：帮我为该产品生成 CE 认证办理指南并整理所需材料清单" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">类型</label>
              <select
                value={todoType}
                onChange={(e) => setTodoType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] shadow-sm"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] shadow-sm"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
