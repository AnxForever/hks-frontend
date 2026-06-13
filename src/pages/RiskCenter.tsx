import { useState, useEffect, useCallback } from 'react'
import type { RiskAlert, MarketStatus } from '../types'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const API_BASE = '/api/v1'
const USE_BACKEND_RISK = import.meta.env.VITE_STREAM_MODE !== 'mock'

const SEVERITY_CONFIG: Record<string, { label: string; colorClass: string }> = {
  critical: { label: '严重', colorClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  high: { label: '高危', colorClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  medium: { label: '中等', colorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  low: { label: '低危', colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
}

const MOCK_ALERTS: RiskAlert[] = [
  {
    alert_id: 'mock_risk_001',
    alert_type: 'product_impacted',
    severity: 'high',
    title: 'WEEE 注册即将到期',
    description: 'LED 灯带德国 WEEE 注册 30 天后到期，需要续期或补充注册证明。',
    affected_products: ['LED 灯带'],
    affected_markets: ['德国'],
    source: 'certification_monitor',
    source_url: '',
    dismissed: false,
    created_at: String(Math.floor(Date.now() / 1000) - 720),
  },
  {
    alert_id: 'mock_risk_002',
    alert_type: 'product_impacted',
    severity: 'high',
    title: 'PSE 证书附件缺失',
    description: '锂离子电池组上架日本前缺少 PSE 证书附件，当前检查未通过。',
    affected_products: ['锂离子电池组'],
    affected_markets: ['日本'],
    source: 'compliance_checker',
    source_url: '',
    dismissed: false,
    created_at: String(Math.floor(Date.now() / 1000) - 3600),
  },
  {
    alert_id: 'mock_risk_003',
    alert_type: 'regulation_change',
    severity: 'medium',
    title: 'GPSR 标签字段新增校验',
    description: '欧盟 GPSR 对电商 Listing 展示的制造商与安全标签字段提出更严格要求。',
    affected_products: ['LED 灯带', '儿童益智玩具'],
    affected_markets: ['欧盟', '法国', '德国'],
    source: 'market_monitor',
    source_url: '',
    dismissed: false,
    created_at: String(Math.floor(Date.now() / 1000) - 86400),
  },
  {
    alert_id: 'mock_risk_004',
    alert_type: 'market_hotspot',
    severity: 'low',
    title: '美国 CA Prop 65 文案复核',
    description: '蓝牙耳机美国市场 Listing 建议复核 CA Prop 65 警示文案展示位置。',
    affected_products: ['蓝牙耳机'],
    affected_markets: ['美国'],
    source: 'rule_engine',
    source_url: '',
    dismissed: true,
    created_at: String(Math.floor(Date.now() / 1000) - 172800),
  },
]

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
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function RiskCenter() {
  const { authFetch, user } = useAuth()
  const userId = user?.id || 'default'
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const [scanning, setScanning] = useState(false)
  const [, setScanStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { status: wsStatus, lastMessage } = useWebSocket(
    'default',
    USE_BACKEND_RISK && import.meta.env.VITE_ENABLE_WEBSOCKET === 'true',
  )

  const loadAlerts = useCallback(async () => {
    if (!USE_BACKEND_RISK) {
      setAlerts(MOCK_ALERTS)
      setUnreadCount(MOCK_ALERTS.filter((alert) => !alert.dismissed).length)
      return
    }
    try {
      const [alertsRes, unreadRes] = await Promise.all([
        authFetch(`${API_BASE}/risk/alerts?user_id=${userId}&size=100`),
        authFetch(`${API_BASE}/risk/alerts/unread-count?user_id=${userId}`),
      ])
      const alertsData = await alertsRes.json()
      const unreadData = await unreadRes.json()
      setAlerts(alertsData.alerts || [])
      setUnreadCount(unreadData.unread_count || 0)
    } catch {
      setAlerts(MOCK_ALERTS)
      setUnreadCount(MOCK_ALERTS.filter((alert) => !alert.dismissed).length)
    }
  }, [authFetch, userId])

  const loadMarketStatus = useCallback(async () => {
    const mockStatus: MarketStatus = {
      last_scan: 'never',
      active_alerts: MOCK_ALERTS.filter((alert) => !alert.dismissed).length,
      markets: [
        { code: 'DE', alerts: 1 },
        { code: 'JP', alerts: 1 },
        { code: 'EU', alerts: 1 },
        { code: 'US', alerts: 1 },
      ],
    }
    if (!USE_BACKEND_RISK) {
      setMarketStatus(mockStatus)
      return
    }
    try {
      const res = await authFetch(`${API_BASE}/risk/market-status?user_id=${userId}`)
      setMarketStatus(await res.json())
    } catch {
      setMarketStatus(mockStatus)
    }
  }, [authFetch, userId])

  useEffect(() => {
    loadAlerts()
    loadMarketStatus()
  }, [loadAlerts, loadMarketStatus])

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'alert') {
      setAlerts(prev => [lastMessage.payload as RiskAlert, ...prev])
      setUnreadCount(prev => prev + 1)
      toast.info('收到新的风险预警')
    } else if (lastMessage.type === 'scan_update') {
      const payload = lastMessage.payload as { status: string; detail?: string }
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
    }
  }, [lastMessage, loadAlerts, loadMarketStatus])

  const handleScan = async () => {
    setScanning(true)
    setScanStatus('正在触发扫描...')
    if (!USE_BACKEND_RISK) {
      window.setTimeout(() => {
        setScanStatus('扫描完成，当前使用前端示例风险数据')
        setMarketStatus(prev => prev ? { ...prev, last_scan: new Date().toISOString() } : prev)
        setScanning(false)
        toast.success('市场扫描完成')
      }, 500)
      return
    }
    try {
      const res = await authFetch(`${API_BASE}/risk/scan?user_id=${userId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json().catch(() => ({}))
      setScanStatus(`扫描完成，发现 ${data.alerts_created ?? 0} 条预警`)
      await Promise.all([loadAlerts(), loadMarketStatus()])
      setScanning(false)
      toast.success('市场扫描完成')
    } catch (e) {
      setScanStatus('触发失败')
      setScanning(false)
      toast.error('触发扫描失败')
    }
  }

  const handleDismiss = async (alertId: string) => {
    if (USE_BACKEND_RISK) {
      try {
        await authFetch(`${API_BASE}/risk/alerts/${alertId}/dismiss?user_id=${userId}`, { method: 'POST' })
      } catch {
        // Frontend-only fallback: keep the action usable without backend.
      }
    }
    setAlerts(prev => prev.map(a =>
      a.alert_id === alertId ? { ...a, dismissed: true } : a
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
    setSelectedIds(prev => prev.filter(id => id !== alertId))
    toast.success('已忽略预警')
  }

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'unread' && alert.dismissed) return false
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false
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
  const markets = Array.from(new Set(alerts.flatMap(alert => alert.affected_markets || [])))
  const selectedVisibleIds = selectedIds.filter(id => filteredAlerts.some(alert => alert.alert_id === id))
  const allVisibleSelected = filteredAlerts.length > 0 && selectedVisibleIds.length === filteredAlerts.length

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredAlerts.some(alert => alert.alert_id === id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredAlerts.map(alert => alert.alert_id)])))
    }
  }

  const toggleSelect = (alertId: string) => {
    setSelectedIds(prev =>
      prev.includes(alertId) ? prev.filter(id => id !== alertId) : [...prev, alertId]
    )
  }

  const handleBulkDismiss = async () => {
    const ids = selectedVisibleIds
    if (ids.length === 0) return
    if (USE_BACKEND_RISK) {
      await Promise.all(ids.map(id =>
        authFetch(`${API_BASE}/risk/alerts/${id}/dismiss?user_id=${userId}`, { method: 'POST' }).catch(() => undefined),
      ))
    }
    setAlerts(prev => prev.map(alert =>
      ids.includes(alert.alert_id) ? { ...alert, dismissed: true } : alert,
    ))
    setUnreadCount(prev => Math.max(0, prev - ids.length))
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)))
    toast.success(`已批量忽略 ${ids.length} 条预警`)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header - Vercel 风格：极简，状态在同一行 */}
      <div className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">风险监控</h1>
              <div className="mt-1 flex items-center gap-4 text-[13px] text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={wsStatus === 'connecting' ? 'connecting' : 'connected'} />
                  <span>
                    {wsStatus === 'connected'
                      ? '实时同步已连接'
                      : wsStatus === 'connecting'
                        ? '实时同步连接中'
                        : '轮询模式'}
                  </span>
                </div>
                <span>最近扫描: {formatLastScan(marketStatus?.last_scan)}</span>
              </div>
            </div>
            <Button
              onClick={handleScan}
              disabled={scanning}
              className="h-9 rounded-md px-4 text-[13px] font-medium"
            >
              {scanning ? '扫描中...' : '立即扫描'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] px-8 py-8">
        {/* Tabs - Linear 风格：简单的文本切换 */}
        <div className="mb-6 flex items-center gap-6 border-b border-border/60">
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              'relative pb-3 text-[13px] font-medium transition-colors',
              activeTab === 'unread'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            未读
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
            {activeTab === 'unread' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'relative pb-3 text-[13px] font-medium transition-colors',
              activeTab === 'all'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            全部
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        </div>

        <div className="mb-5 grid gap-3 rounded-lg border border-border/60 bg-card p-3 lg:grid-cols-[1fr_160px_160px_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索产品、市场或风险描述"
            className="h-9 text-[13px]"
          />
          <Select
            value={severityFilter}
            onValueChange={setSeverityFilter}
          >
            <SelectTrigger className="h-9 border-border/60 bg-background text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              <SelectItem value="critical">严重</SelectItem>
              <SelectItem value="high">高危</SelectItem>
              <SelectItem value="medium">中等</SelectItem>
              <SelectItem value="low">低危</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={marketFilter}
            onValueChange={setMarketFilter}
          >
            <SelectTrigger className="h-9 border-border/60 bg-background text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部市场</SelectItem>
              {markets.map((market) => (
                <SelectItem key={market} value={market}>{market}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-9 text-[13px]"
            disabled={selectedVisibleIds.length === 0}
            onClick={handleBulkDismiss}
          >
            批量忽略 {selectedVisibleIds.length || ''}
          </Button>
        </div>

        {/* Alerts Table - Vercel 风格：紧凑的表格 */}
        {filteredAlerts.length === 0 ? (
          <EmptyState
            title={activeTab === 'unread' ? '暂无未读预警' : '暂无预警'}
            description="系统会自动监控市场动态并推送风险提示"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60" role="region" aria-live="polite" aria-label="风险预警列表">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="选择当前列表预警"
                      className="size-3.5 rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    严重程度
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    描述
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    市场
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    时间
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredAlerts.map((alert) => {
                  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low!
                  return (
                    <tr
                      key={alert.alert_id}
                      className={cn(
                        'transition-colors hover:bg-muted/30',
                        alert.dismissed && 'opacity-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(alert.alert_id)}
                          onChange={() => toggleSelect(alert.alert_id)}
                          aria-label={`选择 ${alert.title}`}
                          className="size-3.5 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn('text-[11px] font-medium', sev.colorClass)}
                        >
                          {sev.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[13px]">{alert.description}</td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {alert.affected_markets?.join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {formatAlertTime(alert.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!alert.dismissed && (
                          <button
                            onClick={() => handleDismiss(alert.alert_id)}
                            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            忽略
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
