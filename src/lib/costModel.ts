/**
 * costModel — token 用量折算价目表（展示层，R8）
 *
 * 投资人叙事「token 付费渠道 + 节省策略成本优势」的前端口径：
 * 用户界面只呈现「额度 / 次数 / ¥」，裸 token 数仅作二级明细。
 *
 * 注意：以下单价为展示层常量（演示口径），真实计费模块（用户维度账本、
 * 余额扣减、支付）上线后由后端价目表替换，前端不再持有单价。
 */

/** 平台混合单价（¥/1K token）——智能路由 + 模板复用后的实付口径 */
export const PLATFORM_PRICE_CNY_PER_1K = 0.012

/** 直接调用旗舰大模型的参考单价（¥/1K token）——成本对比锚点 */
export const DIRECT_LLM_PRICE_CNY_PER_1K = 0.04

/** 外包合规顾问单次咨询市价锚点（¥/次）——区间 ¥500–2000 取下限（决议项 6） */
export const OUTSOURCE_PRICE_CNY_PER_QUERY = 500

/** 专业版每月 token 配额（展示层示意，真实配额待计费模块） */
export const MONTHLY_TOKEN_QUOTA = 2_000_000

/** 模型角色 → 业务用途中文标签（用量明细展示用） */
const ROLE_LABELS: Record<string, string> = {
  default: '通用对话',
  general: '通用对话',
  assistant: '合规对话',
  fast: '快速问答',
  risk_analysis: '风险分析',
  lifecycle_analysis: '生命周期分析',
  dispatch: '任务调度',
  embedding: '知识库向量化',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/**
 * 从 SSE done 事件 / usage 接口的 usage 对象提取 token 总数。
 * 兼容 { total_tokens } 与 { input_tokens, output_tokens } 两种形态；
 * 无有效数字时返回 0（界面据此隐藏成本条，不伪造数字）。
 */
export function tokensFromUsage(usage?: Record<string, unknown> | null): number {
  if (!usage) return 0
  const total = usage.total_tokens
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) return total
  const input = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0
  const output = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0
  const sum = input + output
  return Number.isFinite(sum) && sum > 0 ? sum : 0
}

/** 平台实付折算（¥） */
export function platformCostCNY(tokens: number): number {
  return (tokens / 1000) * PLATFORM_PRICE_CNY_PER_1K
}

/** 直接调用旗舰大模型的参考成本（¥） */
export function directCostCNY(tokens: number): number {
  return (tokens / 1000) * DIRECT_LLM_PRICE_CNY_PER_1K
}

/** 相对直接调用大模型的节省金额（¥） */
export function savedCNY(tokens: number): number {
  return Math.max(0, directCostCNY(tokens) - platformCostCNY(tokens))
}

/** 人民币格式化：大额取整、常规两位、小额三位小数 */
export function formatCNY(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '¥0'
  if (value >= 100) return `¥${Math.round(value).toLocaleString('zh-CN')}`
  if (value >= 1) return `¥${value.toFixed(2)}`
  return `¥${value.toFixed(3)}`
}
