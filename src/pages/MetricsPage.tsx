import { useState, useEffect, useCallback } from 'react'
import { metricsApi } from '../api/config'
import type { BuiltinMetricTemplate, CustomMetric, CustomMetricPayload } from '../api/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useConfirm } from '@/hooks/useConfirm'
import {
  Gauge,
  Info,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'

/** 刷新频率中文标签（对齐 BUILTIN_METRICS.refresh） */
const REFRESH_LABELS: Record<string, string> = {
  realtime: '实时',
  hourly: '每小时',
  daily: '每日',
}

/** 根据 warning/critical 大小关系推断指标方向（与后端 _status_from_thresholds 一致） */
function directionLabel(warning: number, critical: number): string {
  return warning >= critical ? '越高越好' : '越高越差'
}

interface CustomFormState {
  name: string
  key: string
  formula: string
  threshold_warning: string
  threshold_critical: string
  notify_on_warning: boolean
  notify_on_critical: boolean
}

const EMPTY_CUSTOM_FORM: CustomFormState = {
  name: '',
  key: '',
  formula: '',
  threshold_warning: '0',
  threshold_critical: '0',
  notify_on_warning: true,
  notify_on_critical: true,
}

export default function MetricsPage() {
  const confirm = useConfirm()
  const [builtin, setBuiltin] = useState<Record<string, BuiltinMetricTemplate>>({})
  const [custom, setCustom] = useState<CustomMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── 预设指标编辑 ──
  const [editBuiltinKey, setEditBuiltinKey] = useState<string | null>(null)
  const [builtinForm, setBuiltinForm] = useState({ warning: '', critical: '' })

  // ── 自定义指标新建/编辑 ──
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [editingCustom, setEditingCustom] = useState<CustomMetric | null>(null)
  const [customForm, setCustomForm] = useState<CustomFormState>(EMPTY_CUSTOM_FORM)

  const loadAll = useCallback(async () => {
    const [b, c] = await Promise.allSettled([
      metricsApi.getBuiltinTemplates(),
      metricsApi.listCustom(),
    ])
    if (b.status === 'fulfilled') setBuiltin(b.value.templates || {})
    if (c.status === 'fulfilled') setCustom(c.value.metrics || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── 预设指标：保存阈值 ──
  const saveBuiltinThresholds = async () => {
    if (!editBuiltinKey) return
    const warning = Number(builtinForm.warning)
    const critical = Number(builtinForm.critical)
    if (builtinForm.warning.trim() === '' || Number.isNaN(warning) || Number.isNaN(critical)) {
      toast.error('请输入有效的数字阈值')
      return
    }
    if (warning === critical) {
      toast.error('预警阈值与严重阈值不能相等（二者大小关系用于判定指标方向）')
      return
    }
    setSaving(true)
    try {
      await metricsApi.updateBuiltinMetric(editBuiltinKey, {
        threshold_warning: warning,
        threshold_critical: critical,
      })
      toast.success('预设指标阈值已更新')
      setEditBuiltinKey(null)
      await loadAll()
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // ── 预设指标：重置为默认 ──
  const resetBuiltin = async (key: string, name: string) => {
    const ok = await confirm({
      title: '恢复默认阈值',
      description: `确定将「${name}」恢复为默认阈值？`,
      confirmLabel: '恢复',
    })
    if (!ok) return
    try {
      await metricsApi.resetBuiltinMetric(key)
      toast.success('已恢复默认阈值')
      await loadAll()
    } catch (e) {
      toast.error(`重置失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const openBuiltinEditor = (key: string) => {
    const meta = builtin[key]
    if (!meta) return
    setBuiltinForm({
      warning: String(meta.threshold_warning),
      critical: String(meta.threshold_critical),
    })
    setEditBuiltinKey(key)
  }

  // ── 自定义指标：打开新建/编辑弹窗 ──
  const openCustomDialog = (metric: CustomMetric | null) => {
    setEditingCustom(metric)
    setCustomForm(
      metric
        ? {
            name: metric.name,
            key: metric.key,
            formula: metric.formula,
            threshold_warning: String(metric.threshold_warning),
            threshold_critical: String(metric.threshold_critical),
            notify_on_warning: metric.notify_on_warning,
            notify_on_critical: metric.notify_on_critical,
          }
        : EMPTY_CUSTOM_FORM,
    )
    setCustomDialogOpen(true)
  }

  // ── 自定义指标：保存 ──
  const saveCustom = async () => {
    const name = customForm.name.trim()
    const key = customForm.key.trim()
    const warning = Number(customForm.threshold_warning)
    const critical = Number(customForm.threshold_critical)

    if (!name) {
      toast.error('请输入指标名称')
      return
    }
    if (!editingCustom && !/^[a-z][a-z0-9_]*$/i.test(key)) {
      toast.error('指标 Key 须以字母开头，仅含字母/数字/下划线')
      return
    }
    if (Number.isNaN(warning) || Number.isNaN(critical)) {
      toast.error('请输入有效的数字阈值')
      return
    }

    const payload: CustomMetricPayload = {
      name,
      key,
      formula: customForm.formula.trim(),
      threshold_warning: warning,
      threshold_critical: critical,
      notify_on_warning: customForm.notify_on_warning,
      notify_on_critical: customForm.notify_on_critical,
      channels: ['dashboard'],
    }

    setSaving(true)
    try {
      if (editingCustom) {
        await metricsApi.updateCustom(editingCustom.id, payload)
        toast.success('自定义指标已更新')
      } else {
        await metricsApi.createCustom(payload)
        toast.success('自定义指标已创建')
      }
      setCustomDialogOpen(false)
      await loadAll()
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // ── 自定义指标：删除 ──
  const deleteCustom = async (metric: CustomMetric) => {
    const ok = await confirm({
      title: '删除自定义指标',
      description: `确定删除自定义指标「${metric.name}」？`,
      variant: 'destructive',
      confirmLabel: '删除',
    })
    if (!ok) return
    try {
      await metricsApi.deleteCustom(metric.id)
      toast.success('自定义指标已删除')
      await loadAll()
    } catch (e) {
      toast.error(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const editingBuiltinMeta = editBuiltinKey ? builtin[editBuiltinKey] : null
  const builtinEntries = Object.entries(builtin)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* 标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-normal">指标配置</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            管理预设指标阈值与自定义指标，风险监控页的指标状态将按此配置自动核算
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <>
            {/* ── 预设指标 ── */}
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold tracking-normal">预设指标</h2>
                <span className="text-[11px] text-muted-foreground">
                  {builtinEntries.length} 项 · 可调整预警/严重阈值，亦可恢复默认
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                {/* 表头 */}
                <div className="grid min-w-[680px] grid-cols-[1fr_90px_110px_110px_90px_120px] items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium text-muted-foreground">
                  <span>指标</span>
                  <span>刷新频率</span>
                  <span>预警阈值</span>
                  <span>严重阈值</span>
                  <span>方向</span>
                  <span className="text-right">操作</span>
                </div>

                {builtinEntries.map(([key, meta]) => (
                  <div
                    key={key}
                    className="grid min-w-[680px] grid-cols-[1fr_90px_110px_110px_90px_120px] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{meta.name}</span>
                        <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {key}
                        </code>
                        {meta.customized && (
                          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                            已修改
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={meta.formula}>
                        {meta.formula}
                      </p>
                    </div>

                    <span className="text-[12px] text-muted-foreground">
                      {REFRESH_LABELS[meta.refresh] ?? meta.refresh}
                    </span>

                    <span className="text-[13px] font-medium tabular-nums">
                      {meta.threshold_warning}
                      {meta.customized && meta.threshold_warning !== meta.default_threshold_warning && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground line-through">
                          {meta.default_threshold_warning}
                        </span>
                      )}
                    </span>

                    <span className="text-[13px] font-medium tabular-nums">
                      {meta.threshold_critical}
                      {meta.customized && meta.threshold_critical !== meta.default_threshold_critical && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground line-through">
                          {meta.default_threshold_critical}
                        </span>
                      )}
                    </span>

                    <span className="text-[11px] text-muted-foreground">
                      {directionLabel(meta.threshold_warning, meta.threshold_critical)}
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => openBuiltinEditor(key)}
                      >
                        <Pencil className="size-3" />
                        编辑
                      </Button>
                      {meta.customized && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                          onClick={() => resetBuiltin(key, meta.name)}
                        >
                          <RotateCcw className="size-3" />
                          重置
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Info className="size-3" />
                阈值方向由预警/严重阈值大小关系自动判定：预警 ≥ 严重 表示「越高越好」，反之表示「越高越差」。
              </p>
            </section>

            {/* ── 自定义指标 ── */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Plus className="size-3.5 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold tracking-normal">自定义指标</h2>
                <span className="text-[11px] text-muted-foreground">{custom.length} 项</span>
                <Button
                  size="sm"
                  className="ml-auto h-7 gap-1 text-[11px]"
                  onClick={() => openCustomDialog(null)}
                >
                  <Plus className="size-3" />
                  新建自定义指标
                </Button>
              </div>

              {custom.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-card px-4 py-8 text-center">
                  <p className="text-[13px] text-muted-foreground">暂无自定义指标</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    点击「新建自定义指标」添加业务专属指标，配置阈值与通知策略
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {custom.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium">{m.name}</span>
                          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {m.key}
                          </code>
                        </div>
                        {m.formula && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={m.formula}>
                            {m.formula}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-[11px] text-muted-foreground">
                        预警 <span className="font-medium tabular-nums text-foreground">{m.threshold_warning}</span>
                        <span className="mx-1.5 text-border">|</span>
                        严重 <span className="font-medium tabular-nums text-foreground">{m.threshold_critical}</span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => openCustomDialog(m)}
                        >
                          <Pencil className="size-3" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                          onClick={() => deleteCustom(m)}
                        >
                          <Trash2 className="size-3" />
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── 预设指标阈值编辑弹窗 ── */}
      <Dialog open={editBuiltinKey !== null} onOpenChange={open => !open && setEditBuiltinKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改预设指标阈值</DialogTitle>
            <DialogDescription>
              {editingBuiltinMeta
                ? `「${editingBuiltinMeta.name}」· ${editingBuiltinMeta.formula}`
                : '调整预警与严重阈值'}
            </DialogDescription>
          </DialogHeader>

          {editingBuiltinMeta && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="builtin-warning">预警阈值（warning）</Label>
                <Input
                  id="builtin-warning"
                  type="number"
                  value={builtinForm.warning}
                  onChange={e => setBuiltinForm(f => ({ ...f, warning: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="builtin-critical">严重阈值（critical）</Label>
                <Input
                  id="builtin-critical"
                  type="number"
                  value={builtinForm.critical}
                  onChange={e => setBuiltinForm(f => ({ ...f, critical: e.target.value }))}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                当前方向：
                {directionLabel(Number(builtinForm.warning) || 0, Number(builtinForm.critical) || 0)}
                。默认阈值 {editingBuiltinMeta.default_threshold_warning} /{' '}
                {editingBuiltinMeta.default_threshold_critical}，重置后恢复。
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBuiltinKey(null)}>
              取消
            </Button>
            <Button onClick={saveBuiltinThresholds} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 自定义指标新建/编辑弹窗 ── */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustom ? '编辑自定义指标' : '新建自定义指标'}</DialogTitle>
            <DialogDescription>
              自定义指标用于补充预设指标未覆盖的业务度量，阈值与通知策略可自由配置
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-name">指标名称</Label>
                <Input
                  id="custom-name"
                  placeholder="如：库存周转率"
                  value={customForm.name}
                  onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-key">指标 Key</Label>
                <Input
                  id="custom-key"
                  placeholder="如：inventory_turnover"
                  value={customForm.key}
                  disabled={!!editingCustom}
                  onChange={e => setCustomForm(f => ({ ...f, key: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-formula">计算公式 / 口径说明</Label>
              <Input
                id="custom-formula"
                placeholder="如：销售成本/平均库存"
                value={customForm.formula}
                onChange={e => setCustomForm(f => ({ ...f, formula: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-warning">预警阈值</Label>
                <Input
                  id="custom-warning"
                  type="number"
                  value={customForm.threshold_warning}
                  onChange={e => setCustomForm(f => ({ ...f, threshold_warning: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-critical">严重阈值</Label>
                <Input
                  id="custom-critical"
                  type="number"
                  value={customForm.threshold_critical}
                  onChange={e => setCustomForm(f => ({ ...f, threshold_critical: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                <Checkbox
                  checked={customForm.notify_on_warning}
                  onCheckedChange={v => setCustomForm(f => ({ ...f, notify_on_warning: v === true }))}
                />
                预警时通知
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                <Checkbox
                  checked={customForm.notify_on_critical}
                  onCheckedChange={v => setCustomForm(f => ({ ...f, notify_on_critical: v === true }))}
                />
                严重时通知
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveCustom} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              {editingCustom ? '保存修改' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
