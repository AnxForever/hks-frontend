/**
 * Demo 模式假响应。
 *
 * VITE_DEMO_MODE=true 时，AuthContext.authFetch 会短路到这里：
 * 不真正请求后端，按各端点的真实结构返回「空数据」，
 * 让无后端的纯前端原型每个页面都能渲染出干净的空状态，而不是
 * 因为请求被 Vercel rewrite 成 HTML 导致 res.json() 崩溃。
 */

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return (input as Request).url
}

/** 按 URL 匹配返回对应的空结构（结构对齐 lib/api/os.ts 各端点类型）。 */
const RULES: Array<[RegExp, unknown]> = [
  [/\/auth\/me$/, { id: 'demo', username: 'Demo 访客', role: 'admin' }],
  // 模型路由
  [/\/model-configs\/active/, { routes: {}, fallback_chain: {} }],
  [/\/model-configs/, { configs: [] }],
  // 第三方平台
  [/\/integrations\/providers/, { providers: [] }],
  [/\/integrations\/status/, { status: {} }],
  [/\/integrations/, { connections: [] }],
  // 通知渠道
  [/\/channels/, { channels: [] }],
  // 主动简报 / 认证到期
  [/\/proactive\/brief/, { briefs: [] }],
  // 流水线健康
  [/\/pipeline\/health/, { overall_score: 0, stages: [], last_updated: '' }],
  // 定时任务
  [/\/scheduler\/jobs\/grouped/, { global: [], products: {}, product_meta: {}, enabled: false }],
  [/\/scheduler\/tasks-with-workers/, { tasks: [], available_workers: [], total_tasks: 0, total_workers: 0 }],
  // 风险告警
  [/\/risk\/alerts\/unread/, { count: 0 }],
  [/\/risk\/alerts/, { alerts: [], page: 1, size: 50 }],
  [/\/risk\/market-status/, { markets: [] }],
  // 产品
  [/\/products\/[^/]+\/events/, { events: [], total: 0 }],
  [/\/products/, []],
  // 知识库
  [/\/knowledge\/docs/, []],
  [/\/knowledge\/stats/, { total_docs: 0, total_vectors: 0, by_market: {} }],
  [/\/knowledge\/search/, { results: [] }],
  // Shopify
  [/\/shopify\/shops/, { shops: [] }],
  // 新闻监控
  [/\/news-monitor\/summary/, {
    bullish_count: 0,
    bearish_count: 0,
    neutral_count: 0,
    high_risk_news: [],
    period_hours: 24,
  }],
  [/\/news-monitor\/keywords/, { keywords: [], high_words: [] }],
  [/\/news-monitor\/news/, { news: [], total: 0 }],
  // 其它列表
  [/\/news/, []],
  [/\/nl-?store/, []],
  [/\/sessions/, []],
]

/** Demo 模式的假 fetch：GET 返回空结构，写操作返回通用成功。 */
export function demoResponse(input: RequestInfo | URL, init?: RequestInit): Response {
  const url = urlOf(input)
  const method = (init?.method || 'GET').toUpperCase()

  if (method !== 'GET') return json({ ok: true, status: 'ok' })

  for (const [re, data] of RULES) {
    if (re.test(url)) return json(data)
  }
  // 未知 GET 端点默认空数组（多数为列表）
  return json([])
}
