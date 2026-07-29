/**
 * 产品详情视图 — 点击产品卡片后的默认落点（UB-P2 U8）。
 *
 * 聚合展示单个产品的：健康度构成、生命周期时间轴、证书有效期、
 * 合规检查历史、关联告警、待办摘要。全部复用现有 hook / API，
 * 不新增后端接口（守 R1）。完整待办管理入口跳 /todos 子路由。
 */
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useProductComplianceCheck,
  useProductComplianceHistory,
  useProductsDashboard,
} from '@/hooks/queries/useProducts'
import { useProductTodos } from '@/hooks/queries/useProductTodos'
import type { ProductItem, RiskAlertItem } from '@/lib/api/os'
import {
  alertId,
  alertText,
  buildStageTimes,
  complianceLabels,
  formatDateTime,
  lifecycleLabels,
  lifecycleSteps,
  severityLabels,
  sortAlerts,
} from '@/lib/lifecycle'
import { cn } from '@/lib/utils'

const statusTone: Record<string, string> = {
  pending: 'border-border bg-muted/40 text-muted-foreground',
  checking: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  passed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
}

const severityTone: Record<string, string> = {
  low: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  high: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  critical: 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
}

const certTone: Record<string, { label: string; tone: string }> = {
  valid: { label: '有效', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  active: { label: '有效', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  expired: { label: '已过期', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  pending: { label: '待补', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  missing: { label: '缺失', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
}

function certLabel(status: string) {
  return certTone[status] ?? { label: status || '未知', tone: 'border-border bg-muted/40 text-muted-foreground' }
}

function alertsForProduct(product: ProductItem, alerts: RiskAlertItem[]) {
  return sortAlerts(
    alerts.filter((alert) => {
      const affected = alert.affected_products ?? []
      return affected.includes(product.id) || affected.includes(product.name)
    }),
  )
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const dashboard = useProductsDashboard()
  const historyQuery = useProductComplianceHistory(productId)
  const todosQuery = useProductTodos(productId)
  const complianceCheck = useProductComplianceCheck()

  const product = dashboard.data?.products.find((p) => p.id === productId)
  const events = product ? dashboard.data?.eventsByProduct[product.id] ?? [] : []
  const alerts = product ? alertsForProduct(product, dashboard.data?.alerts ?? []) : []
  const activeAlerts = alerts.filter((a) => !a.dismissed)
  const checks = historyQuery.data?.checks ?? []
  const todos = todosQuery.data?.todos ?? []
  const pendingTodos = todos.filter((t) => t.status === 'pending')
  const declarations = todos.filter((t) => t.todo_type === 'declaration')

  const stageTimes = useMemo(() => (product ? buildStageTimes(product, events) : {}), [product, events])
  const currentIndex = product ? Math.max(0, lifecycleSteps.indexOf(product.lifecycle_stage)) : 0

  const certs = product?.certifications ?? []
  const validCerts = certs.filter((c) => c.status === 'valid' || c.status === 'active').length

  const handleCheck = async () => {
    if (!product) return
    const market = product.target_markets[0] || '欧盟'
    await complianceCheck.mutateAsync({ productId: product.id, market })
    toast.success('合规检查已触发')
  }

  if (dashboard.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        加载产品详情...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
        <Boxes className="size-9 text-muted-foreground" />
        <div className="text-[15px] font-semibold">未找到该产品</div>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/products')}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          返回产品台账
        </Button>
      </div>
    )
  }

  const health = product.health_score ?? 0

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-[1100px] px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate('/app/products')}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            返回产品台账
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Boxes className="size-5 shrink-0 text-muted-foreground" />
                <h1 className="truncate text-[24px] font-semibold tracking-tight">{product.name}</h1>
                <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-semibold', statusTone[product.compliance_status] || statusTone.pending)}>
                  {complianceLabels[product.compliance_status] || product.compliance_status}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {lifecycleLabels[product.lifecycle_stage]}
                {product.target_markets?.length ? ` · ${product.target_markets.join(' · ')}` : ''}
                {product.hs_code ? ` · HS ${product.hs_code}` : ''}
                {product.vendor ? ` · 供:${product.vendor}` : ''}
                {product.manufacturer ? ` · 产:${product.manufacturer}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                disabled={complianceCheck.isPending}
                onClick={handleCheck}
              >
                <ShieldCheck className="mr-1.5 size-3.5" />
                触发合规检查
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => navigate(`/app/products/${product.id}/chat`)}
              >
                <MessageSquare className="mr-1.5 size-3.5" />
                对话
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-6 sm:px-8">
        {/* 健康度构成 */}
        <section className="rounded-lg border border-border/60 bg-card p-4">
          <h2 className="text-[15px] font-semibold">健康度构成</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="shrink-0">
              <div className="text-[32px] font-semibold leading-none tabular-nums">{health}%</div>
              <div className="mt-1 text-[11px] text-muted-foreground">综合健康度</div>
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', health >= 80 ? 'bg-emerald-500' : health >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                  style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Factor label="合规状态" value={complianceLabels[product.compliance_status] || product.compliance_status} Icon={ShieldCheck} />
            <Factor label="风险等级" value={severityLabels[product.risk_level] || product.risk_level} Icon={AlertTriangle} danger={product.risk_level === 'high' || product.risk_level === 'critical'} />
            <Factor label="活跃告警" value={`${activeAlerts.length} 条`} Icon={AlertTriangle} danger={activeAlerts.length > 0} />
            <Factor label="有效证书" value={`${validCerts}/${certs.length}`} Icon={BadgeCheck} />
          </div>
        </section>

        {/* 生命周期时间轴 */}
        <section className="rounded-lg border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold">生命周期时间轴</h2>
          </div>
          <div className="flex items-center">
            {lifecycleSteps.map((stage, index) => {
              const done = index < currentIndex
              const current = index === currentIndex
              const hasTime = Boolean(stageTimes[stage])
              return (
                <div key={stage} className="flex flex-1 items-center last:flex-none" title={`${lifecycleLabels[stage]} · ${formatDateTime(stageTimes[stage])}`}>
                  <span className={cn('size-3 shrink-0 rounded-full', current ? 'bg-primary ring-2 ring-primary/15' : done ? 'bg-emerald-500' : hasTime ? 'bg-amber-500' : 'bg-border')} />
                  {index < lifecycleSteps.length - 1 && (
                    <span className={cn('mx-1 h-px flex-1', index < currentIndex ? 'bg-emerald-500/40' : 'bg-border')} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {lifecycleSteps
              .map((stage) => ({ stage, time: stageTimes[stage] }))
              .filter((item): item is { stage: typeof lifecycleSteps[number]; time: string } => Boolean(item.time))
              .map((item) => (
                <div key={item.stage} className="min-w-0">
                  <div className="truncate text-[10.5px] text-muted-foreground">{lifecycleLabels[item.stage]}</div>
                  <div className="truncate text-[11px] font-medium">{formatDateTime(item.time)}</div>
                </div>
              ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 证书有效期 */}
          <section className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheck className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold">证书</h2>
              <Badge variant="outline" className="text-[10px]">{certs.length}</Badge>
            </div>
            {certs.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-muted-foreground">暂无证书记录</div>
            ) : (
              <ul className="space-y-2">
                {certs.map((cert) => {
                  const tone = certLabel(cert.status)
                  return (
                    <li key={cert.name} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
                      <span className="truncate text-[12px] font-medium">{cert.name}</span>
                      <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', tone.tone)}>{tone.label}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* 报关单（报关类待办） */}
          <section className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileCheck2 className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold">报关单</h2>
              <Badge variant="outline" className="text-[10px]">{declarations.length}</Badge>
            </div>
            {declarations.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-muted-foreground">暂无报关类待办</div>
            ) : (
              <ul className="space-y-2">
                {declarations.slice(0, 5).map((todo) => (
                  <li key={todo.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
                    <span className="truncate text-[12px] font-medium">{todo.title}</span>
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">{todo.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 合规检查历史 */}
        <section className="rounded-lg border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileCheck2 className="size-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold">合规检查历史</h2>
            <Badge variant="outline" className="text-[10px]">{checks.length}</Badge>
          </div>
          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center py-6 text-[12px] text-muted-foreground">
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              加载检查历史...
            </div>
          ) : checks.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">暂无合规检查记录</div>
          ) : (
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.check_id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium">{check.target_market}</div>
                    <div className="truncate text-[10.5px] text-muted-foreground">{formatDateTime(check.timestamp)}</div>
                  </div>
                  {check.session_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px]"
                      onClick={() => navigate(`/app/products/${product.id}/chat`)}
                    >
                      查看会话
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 关联告警 */}
        {alerts.length > 0 && (
          <section className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold">关联告警</h2>
              <Badge variant="outline" className="text-[10px]">{alerts.length}</Badge>
            </div>
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alertId(alert)} className="flex items-start gap-2 rounded-md border border-border/60 bg-background p-3">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold">{alert.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{alertText(alert)}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', severityTone[alert.severity] || severityTone.low)}>
                    {severityLabels[alert.severity] || alert.severity}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 待办摘要 */}
        <section className="rounded-lg border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold">待办</h2>
              <Badge variant="outline" className="text-[10px]">{pendingTodos.length} 待执行</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              onClick={() => navigate(`/app/products/${product.id}/todos`)}
            >
              查看全部待办
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </div>
          {pendingTodos.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">暂无待执行待办</div>
          ) : (
            <ul className="space-y-2">
              {pendingTodos.slice(0, 5).map((todo) => (
                <li key={todo.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
                  <span className="truncate text-[12px] font-medium">{todo.title}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">{todo.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Factor({
  label,
  value,
  Icon,
  danger,
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ className?: string }>
  danger?: boolean
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon className={cn('size-3.5', danger ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className={cn('mt-1 truncate text-[13px] font-semibold', danger && 'text-destructive')}>{value}</div>
    </div>
  )
}
