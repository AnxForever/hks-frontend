/**
 * 下一步操作推荐 — 展示系统可执行的操作，点击即执行。
 *
 * 数据来源：SSE done 事件的 suggestions 字段（后端规则引擎生成）。
 * 交互：点击卡片 → 将 prompt 作为新消息发送给 Agent 执行。
 */
import {
  Bell,
  FileText,
  Globe,
  LineChart,
  Package,
  Play,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import type { NextStepSuggestion } from '@/types'

const ICON_MAP: Record<string, typeof Rocket> = {
  rocket: Rocket,
  file: FileText,
  search: Search,
  shield: ShieldCheck,
  cart: ShoppingCart,
  globe: Globe,
  bell: Bell,
  package: Package,
  chart: LineChart,
}

export function NextSteps({
  suggestions,
  onExecute,
  disabled = false,
}: {
  suggestions: NextStepSuggestion[]
  onExecute: (prompt: string) => void
  disabled?: boolean
}) {
  if (!suggestions.length) return null

  return (
    <div className="mt-4 animate-fade-in">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/70">
        <Sparkles className="size-3.5" />
        推荐下一步
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const Icon = ICON_MAP[s.icon] ?? Rocket
          return (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => onExecute(s.prompt)}
              className="group inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-[13px] font-medium text-foreground/90 shadow-sm transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="max-w-[220px] truncate">{s.label}</span>
              <Play className="size-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
