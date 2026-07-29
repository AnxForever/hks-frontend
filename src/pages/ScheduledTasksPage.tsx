/**
 * 监控任务管理页（对齐 deer-flow-main 式用户自定义定时任务）。
 *
 * 功能：任务列表 + 统计卡 + 新建 Dialog（recipe 填充 + 自定义 prompt + 调度输入）+ 运行历史。
 */

import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  Server,
  Trash2,
  Zap,
  Box,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ScheduledTaskScheduleInput,
  type ScheduleValue,
} from '@/components/workspace/scheduled-task-schedule-input'
import { useAuth } from '@/context/AuthContext'
import { productsApi, type ProductItem } from '@/lib/api/os'
import { scheduledTasksApi } from '@/core/scheduled-tasks/api'
import { describeSchedule, parseCron } from '@/core/scheduled-tasks/cron'
import { RECIPES } from '@/core/scheduled-tasks/recipes'
import type { ScheduledTask, ScheduledTaskRun } from '@/core/scheduled-tasks/types'

// ── 状态 Badge 映射 ──────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  enabled: { label: '运行中', variant: 'default' },
  paused: { label: '已暂停', variant: 'secondary' },
  running: { label: '执行中', variant: 'outline' },
  completed: { label: '已完成', variant: 'secondary' },
  failed: { label: '失败', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'outline' },
}

const RUN_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: '排队中', variant: 'outline' },
  running: { label: '执行中', variant: 'default' },
  success: { label: '成功', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  skipped: { label: '跳过', variant: 'secondary' },
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function taskScheduleDescription(task: ScheduledTask): string {
  if (task.schedule_type === 'once') {
    return `单次 ${formatTime(task.next_run_at)}`
  }
  if (task.schedule_type === 'interval') {
    const spec = task.schedule_spec as { minutes?: number; hours?: number }
    if (spec.minutes) return `每 ${spec.minutes} 分钟`
    if (spec.hours) return `每 ${spec.hours} 小时`
    return '定时'
  }
  const cron = (task.schedule_spec as { cron?: string }).cron ?? ''
  const { preset, parts } = parseCron(cron)
  return describeSchedule({ scheduleType: 'cron', preset, parts, timezone: task.timezone })
}

// ── 主页面 ───────────────────────────────────────────

export default function ScheduledTasksPage() {
  const { authFetch } = useAuth()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [runs, setRuns] = useState<ScheduledTaskRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  const productName = useCallback(
    (pid: string | null) => (pid ? products.find((p) => p.id === pid)?.name ?? pid : ''),
    [products],
  )

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await productsApi.list(authFetch))
    } catch {
      setProducts([])
    }
  }, [authFetch])

  useEffect(() => { loadProducts() }, [loadProducts])

  const loadTasks = useCallback(async () => {
    try {
      const data = await scheduledTasksApi.list(authFetch, 'all')
      setTasks(data)
    } catch (e) {
      toast.error(`加载任务失败: ${e instanceof Error ? e.message : e}`)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { loadTasks() }, [loadTasks])

  const loadRuns = useCallback(async (taskId: string) => {
    setLoadingRuns(true)
    try {
      const data = await scheduledTasksApi.runs(authFetch, taskId)
      setRuns(data)
    } catch {
      setRuns([])
    } finally {
      setLoadingRuns(false)
    }
  }, [authFetch])

  function toggleExpand(taskId: string) {
    if (expandedId === taskId) {
      setExpandedId(null)
      setRuns([])
    } else {
      setExpandedId(taskId)
      loadRuns(taskId)
    }
  }

  async function handlePause(task: ScheduledTask) {
    try {
      await scheduledTasksApi.pause(authFetch, task.id)
      toast.success('已暂停')
      await loadTasks()
    } catch (e) {
      toast.error(`${e instanceof Error ? e.message : e}`)
    }
  }

  async function handleResume(task: ScheduledTask) {
    try {
      await scheduledTasksApi.resume(authFetch, task.id)
      toast.success('已恢复')
      await loadTasks()
    } catch (e) {
      toast.error(`${e instanceof Error ? e.message : e}`)
    }
  }

  async function handleTrigger(task: ScheduledTask) {
    try {
      toast.info('正在执行…')
      await scheduledTasksApi.trigger(authFetch, task.id)
      toast.success('执行完成')
      await loadTasks()
      if (expandedId === task.id) loadRuns(task.id)
    } catch (e) {
      toast.error(`执行失败: ${e instanceof Error ? e.message : e}`)
    }
  }

  async function handleDelete(task: ScheduledTask) {
    try {
      await scheduledTasksApi.delete(authFetch, task.id)
      toast.success('已删除')
      await loadTasks()
    } catch (e) {
      toast.error(`${e instanceof Error ? e.message : e}`)
    }
  }

  const stats = {
    total: tasks.length,
    running: tasks.filter((t) => t.status === 'enabled' || t.status === 'running').length,
    paused: tasks.filter((t) => t.status === 'paused').length,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">监控任务</h1>
          <p className="text-muted-foreground text-sm">自定义定时任务，由 AI Agent 自主执行</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> 新建任务
        </Button>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-muted-foreground text-sm">总任务</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.running}</div>
          <div className="text-muted-foreground text-sm">活跃</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.paused}</div>
          <div className="text-muted-foreground text-sm">已暂停</div>
        </div>
      </div>

      {/* 统一任务列表（系统 + 用户） */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-4 w-4" /> 全部任务
        </h2>
        <p className="text-muted-foreground text-sm">系统内置任务与用户自定义任务统一调度，由 AI Agent 自主执行</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <CalendarClock className="mx-auto mb-2 h-10 w-10 opacity-40" />
          暂无定时任务，点击「新建任务」创建
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const status = STATUS_MAP[task.status] ?? { label: task.status, variant: 'outline' as const }
            const expanded = expandedId === task.id
            return (
              <div key={task.id} className="rounded-lg border">
                {/* 主行 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleExpand(task.id)} className="shrink-0">
                    {expanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{task.title}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {task.scope === 'system' && (
                        <Badge variant="secondary" className="gap-1">
                          <Server className="h-3 w-3" /> 系统
                        </Badge>
                      )}
                      {task.product_id && (
                        <Badge variant="outline" className="gap-1">
                          <Box className="h-3 w-3" /> {productName(task.product_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {taskScheduleDescription(task)} · 下次: {formatTime(task.next_run_at)} · 已运行 {task.run_count} 次
                    </div>
                  </div>
                  {/* 操作按钮 */}
                  <div className="flex shrink-0 items-center gap-1">
                    {task.status === 'enabled' && (
                      <Button variant="ghost" size="icon" title="暂停" onClick={() => handlePause(task)}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {task.status === 'paused' && (
                      <Button variant="ghost" size="icon" title="恢复" onClick={() => handleResume(task)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="立即执行" onClick={() => handleTrigger(task)}>
                      <Zap className="h-4 w-4" />
                    </Button>
                    {task.scope !== 'system' && (
                      <Button variant="ghost" size="icon" title="删除" onClick={() => handleDelete(task)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 展开：运行历史 */}
                {expanded && (
                  <div className="border-t px-4 py-3">
                    {loadingRuns ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : runs.length === 0 ? (
                      <p className="text-muted-foreground text-sm">暂无运行记录</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground border-b text-left">
                            <th className="pb-1 font-normal">触发</th>
                            <th className="pb-1 font-normal">状态</th>
                            <th className="pb-1 font-normal">开始</th>
                            <th className="pb-1 font-normal">结束</th>
                            <th className="pb-1 font-normal">错误</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((run) => {
                            const rs = RUN_STATUS_MAP[run.status] ?? { label: run.status, variant: 'outline' as const }
                            return (
                              <tr key={run.id} className="border-b last:border-0">
                                <td className="py-1">{run.trigger === 'manual' ? '手动' : '定时'}</td>
                                <td className="py-1"><Badge variant={rs.variant}>{rs.label}</Badge></td>
                                <td className="py-1">{formatTime(run.started_at)}</td>
                                <td className="py-1">{formatTime(run.finished_at)}</td>
                                <td className="max-w-[200px] truncate py-1 text-red-500">{run.error ?? ''}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 新建 Dialog */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={products}
        onCreated={() => { loadTasks() }}
      />
    </div>
  )
}

// ── 新建任务 Dialog ──────────────────────────────────

function CreateTaskDialog({
  open,
  onOpenChange,
  products,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  products: ProductItem[]
  onCreated: () => void
}) {
  const { authFetch } = useAuth()
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [productId, setProductId] = useState('')
  const [schedule, setSchedule] = useState<ScheduleValue>({
    schedule_type: 'cron',
    schedule_spec: { cron: '0 9 * * *' },
    timezone: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function applyRecipe(recipeId: string) {
    const recipe = RECIPES.find((r) => r.id === recipeId)
    if (!recipe) return
    setTitle(recipe.title)
    setPrompt(recipe.prompt)
    setSchedule(recipe.schedule)
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('请输入任务标题'); return }
    if (!prompt.trim()) { toast.error('请输入执行 Prompt'); return }
    if (schedule.schedule_type === 'cron' && !(schedule.schedule_spec as { cron?: string }).cron) {
      toast.error('请配置调度计划'); return
    }
    if (schedule.schedule_type === 'once' && !(schedule.schedule_spec as { run_at?: string }).run_at) {
      toast.error('请选择执行时间'); return
    }
    setSubmitting(true)
    try {
      await scheduledTasksApi.create(authFetch, {
        title: title.trim(),
        prompt: prompt.trim(),
        schedule_type: schedule.schedule_type,
        schedule_spec: schedule.schedule_spec,
        timezone: schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        product_id: productId || null,
      })
      toast.success('任务创建成功')
      onOpenChange(false)
      setTitle('')
      setPrompt('')
      setProductId('')
      onCreated()
    } catch (e) {
      toast.error(`创建失败: ${e instanceof Error ? e.message : e}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建监控任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipe 快捷填充 */}
          <div className="flex flex-wrap gap-2">
            {RECIPES.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                size="sm"
                onClick={() => applyRecipe(r.id)}
              >
                {r.icon} {r.title}
              </Button>
            ))}
          </div>

          {/* 标题 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">任务标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：每日法规变更扫描"
            />
          </div>

          {/* Prompt */}
          <div className="space-y-1">
            <label className="text-sm font-medium">执行 Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="用自然语言描述你希望 AI Agent 执行的任务…"
            />
          </div>

          {/* 关联产品（可选）*/}
          <div className="space-y-1">
            <label className="text-sm font-medium">关联产品（可选）</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">不关联（全局任务）</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">关联后执行时会把该产品信息注入 Prompt，Agent 将针对该产品处理。</p>
          </div>

          {/* 调度输入 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">调度计划</label>
            <ScheduledTaskScheduleInput initial={schedule} onChange={setSchedule} />
          </div>

          {/* 提交 */}
          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            创建任务
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
