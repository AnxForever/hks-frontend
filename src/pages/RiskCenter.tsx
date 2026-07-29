import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RiskAlert, MarketStatus } from '../types'
import { useWebSocketContext } from '@/context/WebSocketContext'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from 'sonner'
import type { MetricsDashboardResponse, SpecializedMetric } from '@/api/config'
import { productsApi } from '@/lib/api/os'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  Info,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Siren,
  Store,
  Trash2,
} from 'lucide-react'

const API_BASE = '/api/v1'



/** 专项指标状态配色（对齐 MetricsPage） */
const METRIC_STATUS: Record<SpecializedMetric['status'], { label: string; className: string; dot: string }> = {
  normal: { label: '正常', className: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/70', dot: 'bg-emerald-500' },
  warning: { label: '预警', className: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/70', dot: 'bg-amber-500' },
  critical: { label: '严重', className: 'text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900/70', dot: 'bg-red-500' },
  no_data: { label: '暂无数据', className: 'text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950/30 dark:border-gray-800', dot: 'bg-gray-400' },
}

const METRIC_LABELS: Record<string, string> = {
  health_score: '系统健康分',
  risk_product_ratio: '高风险产品比率',
  cert_expiry_density: '证书到期密度',
  order_consistency_rate: '订单一致性率',
  avg_check_latency: '合规检查耗时',
  chargeback_rate: '拒付率',
  return_rate: '退货率',
  dsar_response_time: 'DSAR 响应时效',
}

/** 按指标 key 格式化当前值（比率转百分比、耗时/时效带单位） */
function formatMetricValue(key: string, value: number): string {
  switch (key) {
    case 'risk_product_ratio':
    case 'order_consistency_rate':
    case 'return_rate':
      return `${(value * 100).toFixed(1)}%`
    case 'chargeback_rate':
      return `${(value * 100).toFixed(2)}%`
    case 'avg_check_latency':
      return `${value.toFixed(1)}s`
    case 'dsar_response_time':
      return `${Math.round(value)}h`
    case 'cert_expiry_density':
      return `${Math.round(value)} 个`
    default:
      return String(Math.round(value))
  }
}

const SEVERITY_CONFIG: Record<RiskAlert['severity'], { label: string; pillClass: string; dotClass: string; actionClass: string }> = {
  critical: {
    label: '红色',
    pillClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
    dotClass: 'bg-red-500',
    actionClass: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  high: {
    label: '红色',
    pillClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
    dotClass: 'bg-red-500',
    actionClass: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  medium: {
    label: '黄色',
    pillClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    actionClass: 'border-border/70 bg-card text-foreground hover:bg-muted/60',
  },
  low: {
    label: '蓝色',
    pillClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    actionClass: 'border-border/70 bg-card text-foreground hover:bg-muted/60',
  },
}

function StatusDot({ status }: { status: 'connected' | 'connecting' | 'disconnected' | 'error' }) {
  return (
    <span
      className={cn(
        'inline-block size-2 rounded-full',
        status === 'connected' && 'bg-emerald-500',
        status === 'connecting' && 'bg-amber-500 animate-pulse',
        (status === 'disconnected' || status === 'error') && 'bg-rose-500',
      )}
    />
  )
}

function formatLastScan(value?: string | null) {
  if (!value || value === 'never') return '尚未扫描'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未扫描'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAlertTime(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '—'
  const raw = String(value)
  const numeric = Number(raw)
  const date = Number.isFinite(numeric) && raw.trim() !== ''
    ? new Date(numeric * 1000)
    : new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffHours < 48) return '昨天'
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function isRedSeverity(severity: RiskAlert['severity']) {
  return severity === 'critical' || severity === 'high'
}

export default function RiskCenter() {
  const { authFetch } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()
  // 告警身份一律由后端会话解析（与产品页 riskApi.alerts 同源同身份），
  // 前端不再自带 user_id，避免 localStorage 身份与 Cookie 会话分叉
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const [connectedStores, setConnectedStores] = useState<{ name: string }[]>([])
  const [productMarkets, setProductMarkets] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [, setScanStatus] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [dashboard, setDashboard] = useState<MetricsDashboardResponse | null>(null)
  const [productTasks, setProductTasks] = useState<Array<{
    task_id: string; task_title: string; product_id: string; scope: string
    status: string; schedule_type: string; schedule_spec: Record<string, unknown>
    last_run: { status: string; finished_at?: string } | null
    run_count: number; alert_count: number
  }>>([])

  const { status: wsStatus, on: wsOn } = useWebSocketContext()

  const loadAlerts = useCallback(async () => {
    try {
      const [alertsRes, unreadRes] = await Promise.all([
        authFetch(`${API_BASE}/risk/alerts?size=100`),
        authFetch(`${API_BASE}/risk/alerts/unread-count`),
      ])
      const alertsData = await alertsRes.json()
      const unreadData = await unreadRes.json()
      setAlerts(alertsData.alerts || [])
      setUnreadCount(unreadData.unread_count || 0)
    } catch {
      toast.error('风险告警加载失败', { description: '请检查后端服务后重试' })
      setAlerts([])
      setUnreadCount(0)
    }
  }, [authFetch])

  const loadMarketStatus = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/risk/market-status`)
      setMarketStatus(await res.json())
    } catch {
      setMarketStatus(null)
    }
  }, [authFetch])

  const loadDashboard = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/metrics/dashboard`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDashboard(await res.json())
    } catch {
      setDashboard(null)
    }
  }, [authFetch])

  const loadConnectedStores = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/integrations/status`)
      const data = await res.json()
      const statusMap: Record<string, { name?: string; status?: string }> = data.status || {}
      const stores = Object.values(statusMap)
        .filter((v) => v?.status === 'connected')
        .map((v) => ({ name: v.name || 'Unknown' }))
      setConnectedStores(stores)
    } catch {
      setConnectedStores([])
    }
  }, [authFetch])

  // 产品目标市场：为市场筛选器提供稳定选项（即使尚无预警也可按市场筛选）
  const loadProductMarkets = useCallback(async () => {
    try {
      const products = await productsApi.list(authFetch)
      setProductMarkets(Array.from(new Set(products.flatMap((p) => p.target_markets || []))))
    } catch {
      setProductMarkets([])
    }
  }, [authFetch])

  const loadProductTasks = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/monitoring/tasks-with-alerts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setProductTasks(await res.json())
    } catch {
      setProductTasks([])
    }
  }, [authFetch])

  useEffect(() => {
    loadAlerts()
    loadMarketStatus()
    loadConnectedStores()
    loadProductMarkets()
    loadDashboard()
    loadProductTasks()
  }, [loadAlerts, loadMarketStatus, loadConnectedStores, loadProductMarkets, loadDashboard, loadProductTasks])

  useEffect(() => {
    const offAlert = wsOn('alert', (msg) => {
      setAlerts(prev => [msg.payload as RiskAlert, ...prev])
      setUnreadCount(prev => prev + 1)
      toast.info('收到新的风险预警')
    })
    const offScan = wsOn('scan_update', (msg) => {
      const payload = msg.payload as { status: string; detail?: string }
      if (payload.status === 'scanning') {
        setScanStatus('正在扫描市场...')
      } else if (payload.status === 'completed') {
        setScanStatus(payload.detail || '扫描完成')
        loadAlerts()
        loadMarketStatus()
        setScanning(false)
        toast.success('市场扫描完成')
      } else if (payload.status === 'error') {
        setScanStatus(`扫描失败: ${payload.detail || ''}`)
        setScanning(false)
        toast.error('市场扫描失败')
      }
    })
    return () => {
      offAlert()
      offScan()
    }
  }, [wsOn, loadAlerts, loadMarketStatus])

  const handleScan = async () => {
    setScanning(true)
    setScanStatus('正在触发扫描...')
    try {
      const res = await authFetch(`${API_BASE}/risk/scan`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json().catch(() => ({}))
      setScanStatus(`扫描完成，发现 ${data.alerts_created ?? 0} 条预警`)
      await Promise.all([loadAlerts(), loadMarketStatus(), loadDashboard()])
      setScanning(false)
      toast.success('市场扫描完成')
    } catch {
      setScanStatus('触发失败')
      setScanning(false)
      toast.error('触发扫描失败')
    }
  }

  const handleDismiss = async (alertId: string) => {
    try {
      await authFetch(`${API_BASE}/risk/alerts/${alertId}/dismiss`, { method: 'POST' })
    } catch {
      // 后端不可用时仍允许前端标记，保证操作可用。
    }
    setAlerts(prev => prev.map(a =>
      a.alert_id === alertId ? { ...a, dismissed: true } : a
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
    toast.success('已标记为已处理')
  }

  // 告警关联产品（affected_products 存的是产品 ID，多个取第一个）
  const alertProductId = (alert: RiskAlert) => (alert.affected_products || [])[0] || ''

  // 查看：跳转到关联产品详情页；未关联产品时退化为提示
  const handleView = (alert: RiskAlert) => {
    const pid = alertProductId(alert)
    if (pid) navigate(`/app/products/${pid}`)
    else toast.info(alert.title, { description: '该预警未关联具体产品' })
  }

  // 立即处理：标记已处理后跳转到关联产品页继续处置待办
  const handleProcess = async (alert: RiskAlert) => {
    await handleDismiss(alert.alert_id)
    const pid = alertProductId(alert)
    if (pid) navigate(`/app/products/${pid}`)
  }

  const handleDeleteAlert = async (alertId: string) => {
    const ok = await confirm({
      title: '删除预警',
      description: '删除后关联的待办将被标记为已取消，此操作不可撤销。',
      variant: 'destructive',
      confirmLabel: '删除',
    })
    if (!ok) return
    try {
      const res = await authFetch(`${API_BASE}/risk/alerts/${alertId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAlerts(prev => prev.filter(a => a.alert_id !== alertId))
      toast.success('预警已删除')
    } catch {
      toast.error('删除预警失败')
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter === 'red' && !isRedSeverity(alert.severity)) return false
    if (severityFilter === 'yellow' && alert.severity !== 'medium') return false
    if (severityFilter === 'blue' && alert.severity !== 'low') return false
    if (marketFilter !== 'all' && !(alert.affected_markets || []).includes(marketFilter)) return false
    const q = query.trim().toLowerCase()
    if (q) {
      const haystack = [
        alert.title,
        alert.description,
        ...(alert.affected_products || []),
        ...(alert.affected_markets || []),
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
  const markets = Array.from(new Set([
    ...alerts.flatMap(alert => alert.affected_markets || []),
    ...productMarkets,
  ]))
  const activeAlerts = alerts.filter(alert => !alert.dismissed)
  const redCount = activeAlerts.filter(alert => isRedSeverity(alert.severity)).length
  const yellowCount = activeAlerts.filter(alert => alert.severity === 'medium').length
  const blueCount = activeAlerts.filter(alert => alert.severity === 'low').length
  const summaryCards = [
    {
      label: '红色 · 紧急',
      value: redCount,
      Icon: AlertTriangle,
      borderClass: 'border-red-400/80',
      textClass: 'text-red-600',
      iconClass: 'text-red-500',
      iconBgClass: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: '黄色 · 关注',
      value: yellowCount,
      Icon: AlertTriangle,
      borderClass: 'border-amber-400/90',
      textClass: 'text-amber-600',
      iconClass: 'text-amber-500',
      iconBgClass: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: '蓝色 · 提示',
      value: blueCount,
      Icon: Info,
      borderClass: 'border-blue-400/90',
      textClass: 'text-blue-600',
      iconClass: 'text-blue-500',
      iconBgClass: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ]

  // 重要风险预警：未处理的 critical/high 预警（顶部单独凸显）
  const criticalAlerts = useMemo(
    () => alerts.filter(alert => !alert.dismissed && isRedSeverity(alert.severity)),
    [alerts],
  )

  // 指标汇总：来自 /metrics/dashboard 的专项指标（按 METRIC_LABELS 顺序）
  const metricSummary = useMemo(() => {
    if (!dashboard?.metrics) return []
    return Object.entries(METRIC_LABELS).flatMap(([key, label]) => {
      const metric = dashboard.metrics[key]
      return metric ? [{ key, label, metric }] : []
    })
  }, [dashboard])

  // 自定义指标（用户新建的指标联动展示）
  const customMetricList = useMemo(() => {
    if (!dashboard?.custom_metrics) return []
    return dashboard.custom_metrics as Array<{
      key: string; name: string; formula: string; value: number
      threshold_warning: number; threshold_critical: number; status: string
    }>
  }, [dashboard])

  return (
    <div className="min-h-full bg-muted/40 text-foreground dark:bg-background">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-3 py-4 sm:px-5 lg:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/70">
              <Shield className="size-4" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-normal">风险监控</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={wsStatus === 'connecting' ? 'connecting' : 'connected'} />
                  {wsStatus === 'connected'
                    ? '实时同步已连接'
                    : wsStatus === 'connecting'
                      ? '实时同步连接中'
                      : '轮询模式'}
                </span>
                <span>待处理 {unreadCount} 条</span>
                <span>最近扫描 {formatLastScan(marketStatus?.last_scan)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleScan}
              disabled={scanning}
              className="h-8 rounded-md border-border/70 bg-card px-3 text-[12px] shadow-sm"
            >
              <RefreshCw className={cn('mr-1.5 size-3.5', scanning && 'animate-spin')} />
              {scanning ? '扫描中' : '立即扫描'}
            </Button>
            <Button
              asChild
              className="h-8 rounded-md bg-emerald-500 px-3 text-[12px] text-white shadow-sm hover:bg-emerald-600"
            >
              <Link to="/app/scheduled-tasks">
                <Plus className="mr-1.5 size-3.5" />
                新建监控
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3" aria-label="风险等级概览">
          {summaryCards.map(({ label, value, Icon, borderClass, textClass, iconClass, iconBgClass }) => (
            <article
              key={label}
              className={cn(
                'relative min-h-[74px] overflow-hidden rounded-lg border bg-card px-4 py-3.5 shadow-sm',
                borderClass,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
                  <p className={cn('mt-1 text-[26px] font-semibold leading-none tracking-normal', textClass)}>
                    {value}
                  </p>
                </div>
                <span className={cn('flex size-8 items-center justify-center rounded-md', iconBgClass)}>
                  <Icon className={cn('size-4', iconClass)} />
                </span>
              </div>
            </article>
          ))}
        </section>

        {/* 指标汇总（始终渲染，保证「指标配置」入口可见） */}
        <section className="rounded-lg border border-border/70 bg-card px-4 py-3.5 shadow-sm" aria-label="指标汇总">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="size-3.5 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold tracking-normal">指标汇总</h2>
            <span className="text-[11px] text-muted-foreground">阈值与状态按指标配置自动核算</span>
            <Link
              to="/app/metrics"
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              指标配置
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {metricSummary.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {metricSummary.map(({ key, label, metric }) => {
                const status = METRIC_STATUS[metric.status] ?? METRIC_STATUS.normal
                const displayValue = metric.value != null ? formatMetricValue(key, metric.value) : '暂无数据'
                return (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-none tabular-nums">{displayValue}</p>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', status.className)}>
                      <span className={cn('size-1.5 rounded-full', status.dot)} />
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border/60 bg-background px-3 py-4 text-center text-[12px] text-muted-foreground">
              指标数据加载中或暂无数据，可前往指标配置查看阈值设置
            </p>
          )}

          {/* 自定义指标（用户新建的指标联动展示） */}
          {customMetricList.length > 0 && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">自定义指标</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {customMetricList.map((cm) => (
                  <div key={cm.key} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-muted-foreground">{cm.name}</p>
                      <p className="mt-0.5 text-[13px] font-medium leading-none tabular-nums text-muted-foreground">
                        {cm.formula || '—'}
                      </p>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', (METRIC_STATUS as Record<string, { label: string; className: string; dot: string }>)[cm.status]?.className ?? METRIC_STATUS.normal.className)}>
                      <span className={cn('size-1.5 rounded-full', (METRIC_STATUS as Record<string, { label: string; className: string; dot: string }>)[cm.status]?.dot ?? METRIC_STATUS.normal.dot)} />
                      {(METRIC_STATUS as Record<string, { label: string; className: string; dot: string }>)[cm.status]?.label ?? '正常'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 产品监控任务（三级联动） */}
        {productTasks.length > 0 && (
          <section className="rounded-lg border border-border/70 bg-card px-4 py-3.5 shadow-sm" aria-label="产品监控任务">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="size-3.5 text-muted-foreground" />
              <h2 className="text-[14px] font-semibold tracking-normal">产品监控任务</h2>
              <span className="text-[11px] text-muted-foreground">关联产品的定时监控任务与预警概览</span>
              <Link
                to="/app/scheduled-tasks"
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                监控任务
                <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {productTasks.map((pt) => (
                <Link
                  key={pt.task_id}
                  to={`/app/products/${pt.product_id}`}
                  className="group flex flex-col gap-2 rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-blue-300 hover:bg-blue-50/30 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium">{pt.task_title}</p>
                    <span className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                      pt.status === 'enabled'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400',
                    )}>
                      <span className={cn('size-1.5 rounded-full', pt.status === 'enabled' ? 'bg-emerald-500' : 'bg-gray-400')} />
                      {pt.status === 'enabled' ? '运行中' : pt.status === 'paused' ? '已暂停' : pt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>已执行 {pt.run_count} 次</span>
                    {pt.alert_count > 0 && (
                      <span className="text-red-500 font-medium">{pt.alert_count} 条预警</span>
                    )}
                    {pt.last_run?.finished_at && (
                      <span>最近: {new Date(pt.last_run.finished_at).toLocaleDateString('zh-CN')}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 重要风险预警 */}
        {criticalAlerts.length > 0 && (
          <section
            className="overflow-hidden rounded-lg border border-red-300/70 bg-card shadow-sm dark:border-red-900/60"
            aria-label="重要风险预警"
          >
            <div className="flex items-center gap-2 border-b border-red-200/60 bg-red-50/60 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
              <Siren className="size-4 text-red-500" />
              <h2 className="text-[14px] font-semibold tracking-normal text-red-700 dark:text-red-300">重要风险预警</h2>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">{criticalAlerts.length}</span>
              <span className="ml-auto text-[11px] text-red-600/80 dark:text-red-300/70">需立即关注与处理</span>
            </div>
            <div className="divide-y divide-border/45">
              {criticalAlerts.map(alert => (
                <div key={alert.alert_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
                        <span className="size-1.5 rounded-full bg-red-500" />
                        {alert.severity === 'critical' ? '紧急' : '高'}
                      </span>
                      <p className="truncate text-[13px] font-semibold">{alert.title}</p>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-muted-foreground">
                      {alert.description} · {(alert.affected_markets || []).join(' / ') || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleProcess(alert)}
                    className="h-7 shrink-0 rounded-md bg-emerald-500 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600"
                  >
                    立即处理
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-normal">监控列表</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                共 {filteredAlerts.length} 条匹配结果，覆盖 {markets.length || marketStatus?.markets.length || 0} 个市场
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_132px_132px] lg:w-[560px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索风险、产品或市场"
                  className="h-8 rounded-md border-border/70 bg-background pl-8 text-[12px] shadow-none"
                />
              </div>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="h-8 rounded-md border-border/70 bg-background text-[12px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部市场</SelectItem>
                  {markets.map((market) => (
                    <SelectItem key={market} value={market}>{market}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 rounded-md border-border/70 bg-background text-[12px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="red">红色</SelectItem>
                  <SelectItem value="yellow">黄色</SelectItem>
                  <SelectItem value="blue">蓝色</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="暂无匹配预警"
                description="系统会自动监控市场动态并推送风险提示"
              />
            </div>
          ) : (
            <div className="overflow-x-auto" role="region" aria-live="polite" aria-label="风险预警列表">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="w-[120px] px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">级别</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">问题</th>
                    <th className="w-[240px] px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">店铺 / SKU</th>
                    <th className="w-[150px] px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">国家</th>
                    <th className="w-[140px] px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">发现时间</th>
                    <th className="w-[140px] px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45">
                  {filteredAlerts.map((alert) => {
                    const sev = SEVERITY_CONFIG[alert.severity]
                    const urgent = isRedSeverity(alert.severity)
                    return (
                      <tr
                        key={alert.alert_id}
                        className={cn(
                          'bg-card transition-colors hover:bg-muted/25',
                          alert.dismissed && 'opacity-60',
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium', sev.pillClass)}>
                            <span className={cn('size-2 rounded-full', sev.dotClass)} />
                            {sev.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[520px]">
                            <p className="truncate text-[13px] font-semibold text-foreground">{alert.title}</p>
                            <p className="mt-1 truncate text-[12px] text-muted-foreground">{alert.description}</p>
                            {alert.source_task_id && (
                              <Link
                                to="/app/scheduled-tasks"
                                className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
                              >
                                <Clock className="size-2.5" />
                                来源: 监控任务
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground">
                          {(alert.affected_products || []).length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              {(alert.affected_products || []).map((pid) => (
                                <Link
                                  key={pid}
                                  to={`/app/products/${pid}`}
                                  className="text-primary transition-colors hover:underline"
                                >
                                  {pid}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            alert.source || '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                            <span className="text-[10px] uppercase tracking-normal text-muted-foreground/70">
                              {(alert.affected_markets || [])[0]?.slice(0, 2) || '--'}
                            </span>
                            {(alert.affected_markets || []).join(' / ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground">
                          {formatAlertTime(alert.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {alert.dismissed ? (
                              <span className="text-[12px] font-medium text-muted-foreground">已处理</span>
                            ) : urgent ? (
                              <button
                                onClick={() => handleProcess(alert)}
                                className={cn('h-7 rounded-md px-3 text-[12px] font-semibold transition-colors', sev.actionClass)}
                              >
                                立即处理
                              </button>
                            ) : (
                              <button
                                onClick={() => handleView(alert)}
                                className="h-7 rounded-md border border-border/70 bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/60"
                              >
                                查看
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAlert(alert.alert_id)}
                              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              title="删除预警"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border/70 bg-card px-4 py-3.5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Store className="size-3.5 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold tracking-normal">已连接平台</h2>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            {connectedStores.map((store) => (
              <div
                key={store.name}
                className="flex h-11 items-center justify-between rounded-md border border-border/60 bg-background px-3"
              >
                <span className="truncate text-[13px] font-semibold">{store.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  已连接
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate('/app/integrations')}
              className="flex h-11 items-center justify-center rounded-md border border-dashed border-border/80 bg-background px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="mr-1.5 size-3.5" />
              添加店铺
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
