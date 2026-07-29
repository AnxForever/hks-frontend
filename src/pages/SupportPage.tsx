/**
 * SupportPage — 用量与费用中心（R8）
 *
 * 平台统一模型渠道的用量透明页：本月额度环、消耗折算 ¥、成本对比、
 * 按用途分项明细。金额为展示层价目折算（lib/costModel.ts），真实计费
 * 模块上线后由后端账单替换；充值第一阶段留资不接支付。
 */
import { useCallback, useEffect, useState } from 'react'
import { Coins, PiggyBank, ReceiptText, WalletCards } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { modelConfigsApi } from '@/api/config'
import {
  MONTHLY_TOKEN_QUOTA,
  OUTSOURCE_PRICE_CNY_PER_QUERY,
  directCostCNY,
  formatCNY,
  platformCostCNY,
  roleLabel,
  savedCNY,
} from '@/lib/costModel'

interface UsageData {
  total_tokens: number
  by_model: Record<string, number>
  routes: Record<string, string>
}

/** 额度环 — 纯 SVG，颜色走设计 token（stroke-muted / stroke-primary） */
function QuotaRing({ pct }: { pct: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const clamped = Math.min(Math.max(pct, 0), 1)
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 112 112" className="size-28 -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold tabular-nums">
        {Math.round(clamped * 100)}%
      </div>
    </div>
  )
}

export default function SupportPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadUsage = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await modelConfigsApi.getUsage()
      setUsage(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const totalTokens = usage?.total_tokens ?? 0
  const cost = platformCostCNY(totalTokens)
  const direct = directCostCNY(totalTokens)
  const saved = savedCNY(totalTokens)
  const savedPct = direct > 0 ? Math.round((saved / direct) * 100) : 0

  // 模型 → 用途标签（routes: role → model 反查）
  const modelRoles = new Map<string, string[]>()
  for (const [role, model] of Object.entries(usage?.routes ?? {})) {
    modelRoles.set(model, [...(modelRoles.get(model) ?? []), roleLabel(role)])
  }
  const detailRows = Object.entries(usage?.by_model ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-[1200px] px-6 py-7 sm:px-8">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <span className="h-px w-6 bg-border" />
            平台统一模型渠道
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">用量与费用</h1>
          <p className="mt-1 max-w-2xl text-[14px] leading-6 text-muted-foreground">
            无需自备 API Key，模型用量按业务动作折算为费用。正式计费上线前，以下金额为演示口径，不产生实际扣费。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-8 sm:px-8">
        {error ? (
          <ErrorState
            title="用量加载失败"
            description="无法获取模型用量统计，请重试"
            onRetry={loadUsage}
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              {/* 本月用量 */}
              <section className="rounded-lg border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Coins className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground">本月用量</p>
                    <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">额度消耗</h2>
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="mt-6 h-28 w-full" />
                ) : (
                  <div className="mt-6 flex items-center gap-5">
                    <QuotaRing pct={totalTokens / MONTHLY_TOKEN_QUOTA} />
                    <div className="min-w-0 space-y-1">
                      <div className="text-[24px] font-semibold leading-none tracking-tight tabular-nums">
                        {formatCNY(cost)}
                      </div>
                      <div className="text-[12px] text-muted-foreground tabular-nums">
                        {totalTokens.toLocaleString('zh-CN')} tokens
                      </div>
                      <div className="text-[12px] text-muted-foreground tabular-nums">
                        专业版月额度 {MONTHLY_TOKEN_QUOTA.toLocaleString('zh-CN')} tokens
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* 成本对比 */}
              <section className="rounded-lg border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <PiggyBank className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground">节省看得见</p>
                    <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">成本对比</h2>
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="mt-6 h-28 w-full" />
                ) : (
                  <div className="mt-6 space-y-2.5 text-[13px] tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">直接调用旗舰大模型</span>
                      <span className="font-medium">{formatCNY(direct)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">平台实付折算</span>
                      <span className="font-medium">{formatCNY(cost)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="font-medium">节省</span>
                      <span className="font-semibold">
                        {formatCNY(saved)}{savedPct > 0 ? `（${savedPct}%）` : ''}
                      </span>
                    </div>
                    <p className="pt-1 text-[12px] leading-5 text-muted-foreground">
                      节省来自相似流程模板复用、知识库直答与任务分级路由至轻量模型。外包合规顾问单次咨询约
                      ¥{OUTSOURCE_PRICE_CNY_PER_QUERY.toLocaleString('zh-CN')} 起。
                    </p>
                  </div>
                )}
              </section>

              {/* 充值与套餐 */}
              <section className="flex flex-col rounded-lg border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <WalletCards className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground">套餐与充值</p>
                    <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">额度充值</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-2 text-[13px] leading-6 text-muted-foreground">
                  <p>专业版 ¥299/月：月额度覆盖典型单店铺全部合规场景，超额按量充值。</p>
                  <p className="text-[12px]">充值通道内测中，当前用量不产生实际扣费。</p>
                </div>
                <div className="mt-auto pt-6">
                  <Button disabled className="h-9 text-[13px]">
                    充值通道内测中
                  </Button>
                </div>
              </section>
            </div>

            {/* 分项明细 */}
            <section className="rounded-lg border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ReceiptText className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">按模型与用途</p>
                  <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight">用量明细</h2>
                </div>
              </div>
              {loading ? (
                <Skeleton className="mt-5 h-32 w-full" />
              ) : detailRows.length === 0 ? (
                <p className="mt-5 text-[13px] text-muted-foreground">
                  暂无模型调用记录，发起一次合规对话后开始累计。
                </p>
              ) : (
                <table className="mt-5 w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[12px] text-muted-foreground">
                      <th className="pb-2 font-medium">模型</th>
                      <th className="pb-2 font-medium">用途</th>
                      <th className="pb-2 text-right font-medium">tokens</th>
                      <th className="pb-2 text-right font-medium">折算费用</th>
                      <th className="pb-2 text-right font-medium">占比</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {detailRows.map(([model, tokens]) => (
                      <tr key={model} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 font-medium">{model}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {modelRoles.get(model)?.join(' · ') ?? '—'}
                        </td>
                        <td className="py-2.5 text-right">{tokens.toLocaleString('zh-CN')}</td>
                        <td className="py-2.5 text-right">{formatCNY(platformCostCNY(tokens))}</td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {totalTokens > 0 ? `${Math.round((tokens / totalTokens) * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-4 text-[12px] leading-5 text-muted-foreground">
                费用按内部价目表折算（演示口径），实际账单以正式计费为准。
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
