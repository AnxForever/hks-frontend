/**
 * CostBar — 对话结果尾部成本条（R8）
 *
 * 从 SSE done 事件的 usage 提取 token 数，折算为 ¥ 并给出「较直接调用
 * 旗舰大模型」的节省对比——把 token 节省策略变成用户可见的事实。
 * usage 无有效 token 数时不渲染（不伪造数字）。
 */
import { Coins } from 'lucide-react'

import {
  formatCNY,
  platformCostCNY,
  savedCNY,
  tokensFromUsage,
} from '@/lib/costModel'

export function CostBar({ usage }: { usage?: Record<string, unknown> | null }) {
  const tokens = tokensFromUsage(usage)
  if (tokens <= 0) return null

  return (
    <div className="mt-2 flex w-full max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground/80 tabular-nums">
      <span className="inline-flex items-center gap-1">
        <Coins className="size-3 shrink-0" aria-hidden="true" />
        本次消耗 {tokens.toLocaleString('zh-CN')} tokens ≈ {formatCNY(platformCostCNY(tokens))}
      </span>
      <span>较直接调用旗舰大模型省 {formatCNY(savedCNY(tokens))}</span>
      <span className="text-muted-foreground/60">智能路由 · 模板复用 · 知识库直答</span>
    </div>
  )
}
