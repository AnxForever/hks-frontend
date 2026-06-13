/**
 * Demo 模式假响应 + 展示数据。
 *
 * VITE_DEMO_MODE=true 时 AuthContext.authFetch 短路到这里，
 * 不请求后端，返回真实结构的空数据或示例数据，让原型可点击浏览。
 */

/* ── 展示用假数据 ─────────────────────────────── */

const NOW = new Date().toISOString()
const day = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}

const DEMO_PRODUCTS = [
  { id: 'p01', name: '蓝牙耳机 TWS-Pro', product_type: '消费电子', target_markets: ['eu','us','jp'], hs_code: '8518.30', vendor: '深圳华强北电子', tags: ['蓝牙','无线'], lifecycle_stage: 'fulfilling' as const, compliance_status: 'passed', risk_level: 'low', health_score: 92, certifications: [{name:'CE',status:'有效'},{name:'FCC',status:'有效'},{name:'RoHS',status:'有效'}], created_at: day(90), updated_at: day(2) },
  { id: 'p02', name: '智能插座 EU-WiFi', product_type: '智能家居', target_markets: ['eu'], hs_code: '8536.50', vendor: '宁波智联科技', tags: ['WiFi','节能'], lifecycle_stage: 'active' as const, compliance_status: 'checking', risk_level: 'medium', health_score: 68, certifications: [{name:'CE',status:'审核中'},{name:'WEEE',status:'待注册'}], created_at: day(60), updated_at: day(1) },
  { id: 'p03', name: '户外LED露营灯', product_type: '户外照明', target_markets: ['us','jp','kr'], hs_code: '9405.40', vendor: '东莞光源实业', tags: ['LED','防水'], lifecycle_stage: 'design' as const, compliance_status: 'pending', risk_level: 'high', health_score: 35, certifications: [], created_at: day(30), updated_at: day(5) },
  { id: 'p04', name: '电动滑板车 ES-200', product_type: '出行工具', target_markets: ['eu','us'], hs_code: '8711.60', vendor: '无锡出行科技', tags: ['锂电池','折叠'], lifecycle_stage: 'sourcing' as const, compliance_status: 'failed', risk_level: 'critical', health_score: 18, certifications: [{name:'CE',status:'已过期'},{name:'UL 2272',status:'缺失'}], created_at: day(45), updated_at: day(3) },
]

const DEMO_ALERTS = [
  { alert_id: 'a1', alert_type: 'regulation_change', severity: 'critical', title: 'EU 电池法规 (EU) 2023/1542 生效', description: '碳足迹声明、可拆卸设计、供应链尽职调查三项新要求即日执行，影响含锂电池的全部品类。', created_at: day(0), affected_products: ['p01','p04'], affected_markets: ['eu'], source: '欧盟官方公报', source_url: '#' },
  { alert_id: 'a2', alert_type: 'product_impacted', severity: 'high', title: 'FCC 拟修订 2.4GHz 频段规则', description: 'FCC 就 2.4GHz 无线设备发射功率限值征求意见，预计 2026 Q3 生效，TWS 耳机、智能插座均受影响。', created_at: day(1), affected_products: ['p01','p02'], affected_markets: ['us'], source: 'FCC', source_url: '#' },
  { alert_id: 'a3', alert_type: 'market_hotspot', severity: 'medium', title: '韩国 KC 认证对 LED 灯具新增光生物安全要求', description: '2026 年起 LED 灯具需提供 IEC 62471 光生物安全测试报告方可获 KC 标志。', created_at: day(2), affected_products: ['p03'], affected_markets: ['kr'], source: 'KATS', source_url: '#' },
  { alert_id: 'a4', alert_type: 'regulation_change', severity: 'medium', title: '日本 PSE 菱形标志适用范围调整', description: '经济产业省拟将部分消费电子产品从圆形 PSE 提升为菱形 PSE，涉及更严格的工厂审查。', created_at: day(4), affected_products: [], affected_markets: ['jp'], source: 'METI', source_url: '#' },
]

const DEMO_ROUTES = [
  { role: 'default', provider: 'anthropic', model: 'claude-sonnet-4-20250514', api_key_env: 'ANTHROPIC_API_KEY', base_url: '', max_tokens: 4096, temperature: 0.7, top_p: 0.9 },
  { role: 'chat', provider: 'anthropic', model: 'claude-sonnet-4-20250514', api_key_env: 'ANTHROPIC_API_KEY', base_url: '', max_tokens: 4096, temperature: 0.7, top_p: 0.9 },
  { role: 'compliance', provider: 'anthropic', model: 'claude-sonnet-4-20250514', api_key_env: 'ANTHROPIC_API_KEY', base_url: '', max_tokens: 8192, temperature: 0.3, top_p: 0.9 },
  { role: 'summary', provider: 'anthropic', model: 'claude-haiku-3-5-20241022', api_key_env: 'ANTHROPIC_API_KEY', base_url: '', max_tokens: 2048, temperature: 0.5, top_p: 0.9 },
]

const DEMO_JOBS = [
  { id: 'job-poll-markets', name: 'market_poll', func_ref: 'poll_all_markets', trigger: { type: 'interval' as const, interval_human: '每 6 小时' }, next_run_time: new Date(Date.now() + 7200000).toISOString(), pending: false, coalesce: true, max_instances: 1, misfire_grace_time: 300, scope: 'global' as const, product_id: null },
  { id: 'job-collect-metrics', name: 'metrics_collect', func_ref: 'collect_metrics', trigger: { type: 'interval' as const, interval_human: '每 1 小时' }, next_run_time: new Date(Date.now() + 1800000).toISOString(), pending: false, coalesce: true, max_instances: 1, misfire_grace_time: 60, scope: 'global' as const, product_id: null },
  { id: 'job-proactive-daily', name: 'proactive_daily_brief', func_ref: 'proactive_daily_brief', trigger: { type: 'cron' as const, expression: '0 9 * * *', cron_human: '每天 09:00' }, next_run_time: '2026-06-14T01:00:00Z', pending: false, coalesce: true, max_instances: 1, misfire_grace_time: 600, scope: 'global' as const, product_id: null },
  { id: 'job-cert-expiry', name: 'proactive_cert_expiry', func_ref: 'proactive_cert_expiry', trigger: { type: 'cron' as const, expression: '0 10 * * *', cron_human: '每天 10:00' }, next_run_time: '2026-06-14T02:00:00Z', pending: false, coalesce: true, max_instances: 1, misfire_grace_time: 600, scope: 'global' as const, product_id: null },
]

const DEMO_TASKS_WORKERS = {
  tasks: [
    { task_name: 'poll_all_markets', display_name: '全市场舆情轮询', description: '定时抓取各目标市场监管动态与新闻', default_trigger: 'interval', default_args: { interval_minutes: 360 }, bound_worker: 'poll_all_markets', sdk_enabled: true },
    { task_name: 'collect_metrics', display_name: '指标采集', description: '聚合各管线运行指标', default_trigger: 'interval', default_args: { interval_minutes: 60 }, bound_worker: 'collect_metrics', sdk_enabled: true },
    { task_name: 'proactive_daily_brief', display_name: '每日合规简报', description: '生成当日合规摘要与建议', default_trigger: 'cron', default_args: { hour: 9, minute: 0 }, bound_worker: 'proactive_daily_brief', sdk_enabled: true },
    { task_name: 'proactive_cert_expiry', display_name: '认证到期预警', description: '检查所有产品认证有效期，30天内到期告警', default_trigger: 'cron', default_args: { hour: 10, minute: 0 }, bound_worker: 'proactive_cert_expiry', sdk_enabled: true },
    { task_name: 'product_compliance_check', display_name: '产品合规复检', description: '对活跃产品重新跑合规规则', default_trigger: 'interval', default_args: { interval_minutes: 720 }, bound_worker: 'product_compliance_check', sdk_enabled: false },
  ],
  available_workers: [
    { worker_code: 'poll_all_markets', worker_name: '全市场舆情轮询', description: '通过 AI Agent 联网抓取监管动态', sdk_enabled: true },
    { worker_code: 'collect_metrics', worker_name: '指标采集', description: '本地聚合各管线指标', sdk_enabled: true },
    { worker_code: 'proactive_daily_brief', worker_name: '每日合规简报', description: 'AI 生成每日摘要', sdk_enabled: true, business_stage: 'active' },
    { worker_code: 'proactive_cert_expiry', worker_name: '认证到期预警', description: '检查认证有效期', sdk_enabled: true, business_stage: 'active' },
    { worker_code: 'product_compliance_check', worker_name: '产品合规复检', description: '重新评估合规状态', sdk_enabled: false, business_stage: 'fulfilling' },
  ],
  total_tasks: 5,
  total_workers: 5,
}

const DEMO_INTEGRATIONS = [
  { provider: 'shopify', name: 'Shopify', auth_type: 'oauth2', config_fields: ['shop','api_key','api_secret','redirect_uri'], description: '店铺产品、订单和库存同步，用于上架后合规巡检。' },
  { provider: 'erpnext', name: 'ERPNext', auth_type: 'token', config_fields: ['base_url','api_key','api_secret'], description: '采购、库存和财务数据同步，用于供应链合规校验。' },
  { provider: '17track', name: '17TRACK', auth_type: 'token', config_fields: ['api_key'], description: '物流轨迹同步，用于履约阶段异常监控。' },
  { provider: 'chatwoot', name: 'Chatwoot', auth_type: 'token', config_fields: ['base_url','api_access_token','account_id'], description: '客服工单与会话接入，售后风险沉淀。' },
  { provider: 'feishu', name: '飞书', auth_type: 'oauth2', config_fields: ['app_id','app_secret','redirect_uri'], description: '团队通知和审批协作。' },
  { provider: 'dingtalk', name: '钉钉', auth_type: 'oauth2', config_fields: ['app_key','app_secret','agent_id'], description: '企业消息和机器人通知。' },
]

const DEMO_NEWS = [
  { id: 'n1', title: '欧盟 RoHS 豁免清单更新：新增 4 类物质限制', content: '欧盟委员会发布 RoHS 指令修订草案，拟将四类新型阻燃剂纳入限制物质清单，涉及消费电子外壳材料。', source: 'EU Official Journal', url: '#', risk_direction: '利空', risk_level: 'high', logic: '新增限制物质直接影响外壳材料供应链，蓝牙耳机、智能插座等品类需重新检测', keywords: ['RoHS','阻燃剂','EU','外壳材料'], published_at: day(0.2), analyzed_at: day(0.1) },
  { id: 'n2', title: '美国 CPSC 发布电动滑板车锂电池安全指南', content: 'CPSC 更新锂电池动力出行设备安全标准，强调热失控防护和认证要求，不合规产品将面临强制召回。', source: 'CPSC', url: '#', risk_direction: '利空', risk_level: 'critical', logic: '电动滑板车核心物料锂电池面临严格新规，UL 2272 认证缺失将导致无法进入美国市场', keywords: ['CPSC','锂电池','电动滑板车','UL 2272'], published_at: day(0.5), analyzed_at: day(0.3) },
  { id: 'n3', title: '日本 METI 简化 PSE 认证线上申请流程', content: '经济产业省推出 PSE 认证数字化平台，企业可通过线上提交技术文档并跟踪审核进度，平均审批周期从 45 天缩短至 30 天。', source: 'METI', url: '#', risk_direction: '利多', risk_level: 'low', logic: '流程简化降低日本市场准入时间成本，对计划进入日本市场的产品是正面信号', keywords: ['PSE','METI','数字化','日本'], published_at: day(1), analyzed_at: day(0.8) },
  { id: 'n4', title: '韩国 KC 认证新增无线设备 SAR 测试要求', content: '韩国无线电研究机构（RRA）宣布自 2026 下半年起，所有含 Wi-Fi/蓝牙的无线设备需提交 SAR 测试报告。', source: 'RRA', url: '#', risk_direction: '利空', risk_level: 'medium', logic: 'TWS 耳机、智能插座等含无线模块产品需追加 SAR 测试，增加认证成本约 30%', keywords: ['KC','SAR','无线','RRA'], published_at: day(1.5), analyzed_at: day(1.2) },
  { id: 'n5', title: '欧盟碳边境调节机制（CBAM）扩围至消费电子', content: '欧盟委员会建议将 CBAM 适用范围扩展至消费电子成品进口，2027 年起分阶段实施，首批覆盖含铝/钢外壳产品。', source: 'European Commission', url: '#', risk_direction: '利空', risk_level: 'high', logic: 'CBAM 扩围增加含金属材料产品的出口成本，LED 灯具等铝制外壳产品首当其冲', keywords: ['CBAM','碳边境税','EU','铝外壳'], published_at: day(2), analyzed_at: day(1.8) },
  { id: 'n6', title: '中国跨境电商合规白名单新增 30 家企业', content: '海关总署发布第六批跨境电商合规白名单，新增 30 家企业享受快速通关和预裁定便利。', source: '海关总署', url: '#', risk_direction: '利多', risk_level: 'low', logic: '白名单扩容利好中小出口企业，通关效率提升可缩短履约周期', keywords: ['海关','白名单','跨境电商','通关'], published_at: day(2.5), analyzed_at: day(2.2) },
]

const DEMO_MARKET_SUMMARY = {
  bullish_count: 2, bearish_count: 3, neutral_count: 1,
  high_risk_news: DEMO_NEWS.filter(n => n.risk_level === 'high' || n.risk_level === 'critical'),
  period_hours: 72,
}

const DEMO_KEYWORDS = { keywords: ['合规','认证','法规','标准','限制','禁止','召回','关税','准入','安全'], high_words: ['召回','禁止','限制','紧急','强制'] }

const DEMO_PIPELINE_HEALTH = {
  overall_score: 67,
  stages: [
    { stage_number: 1, stage_name: '概念设计', pass_rate: 0.85, total_products: 4, passed_products: 3, risk_products: 1, pending_actions: 0, status: 'ok' },
    { stage_number: 2, stage_name: '物料采购', pass_rate: 0.60, total_products: 3, passed_products: 2, risk_products: 1, pending_actions: 2, status: 'warning' },
    { stage_number: 3, stage_name: '生产制造', pass_rate: 0.90, total_products: 2, passed_products: 2, risk_products: 0, pending_actions: 0, status: 'ok' },
    { stage_number: 4, stage_name: '物流履约', pass_rate: 0.50, total_products: 1, passed_products: 0, risk_products: 1, pending_actions: 3, status: 'critical' },
    { stage_number: 5, stage_name: '售后管理', pass_rate: 0.75, total_products: 1, passed_products: 1, risk_products: 0, pending_actions: 1, status: 'ok' },
  ],
  last_updated: NOW,
}

const DEMO_KNOWLEDGE_DOCS = [
  { doc_id: 'd1', filename: '欧盟RoHS指令_2026修订版.pdf', status: 'done', market: 'eu', regulation_name: 'RoHS 3.0', size_bytes: 2450000, chunks: 42, created_at: day(7), updated_at: day(7) },
  { doc_id: 'd2', filename: 'FCC_Part15_无线设备规则.pdf', status: 'done', market: 'us', regulation_name: 'FCC Part 15', size_bytes: 1800000, chunks: 31, created_at: day(5), updated_at: day(5) },
  { doc_id: 'd3', filename: '日本電気用品安全法_施行令.pdf', status: 'done', market: 'jp', regulation_name: 'PSE 法', size_bytes: 3200000, chunks: 56, created_at: day(10), updated_at: day(10) },
  { doc_id: 'd4', filename: 'REACH_SVHC候选清单_2026更新.pdf', status: 'indexing', market: 'eu', regulation_name: 'REACH SVHC', size_bytes: 4100000, chunks: 0, created_at: day(0.5), updated_at: day(0.5) },
]

const DEMO_KNOWLEDGE_STATS = { total_docs: 4, total_vectors: 129, by_market: { eu: 78, us: 31, jp: 56 } }

const DEMO_CHANNELS = [
  { name: 'feishu-alerts', channel: 'feishu', status: 'active' },
  { name: 'dingtalk-ops', channel: 'dingtalk', status: 'inactive' },
]

const DEMO_PROACTIVE_BRIEFS = [
  { type: 'cert_expiry', date: day(0), generated_at: day(0), summary: { expiring_30d: 1, expiring_90d: 2, ok: 5 }, highlights: ['电动滑板车 CE 认证已过期', '智能插座 WEEE 注册即将到期（剩余 22 天）'], recommendations: ['立即安排 WEEE 注册续期', '补做 UL 2272 电池安全认证'] },
  { type: 'daily_brief', date: day(1), generated_at: day(1), summary: { total_products: 4, passed: 1, checking: 1, at_risk: 2 }, highlights: ['新增 3 条高风险法规预警', '户外LED灯健康度下降至 35'], recommendations: ['优先处理 EU 电池法规合规', '安排 LED 灯 KC 光生物安全测试'] },
]

const DEMO_SESSIONS = [{ session_id: 's1', title: '蓝牙耳机 EU 合规检查', created_at: day(2), updated_at: day(1), message_count: 8 }, { session_id: 's2', title: '电动滑板车风险分析', created_at: day(3), updated_at: day(2), message_count: 12 }]

/* ── 匹配引擎 ─────────────────────────────── */

type DemoHandler = [RegExp, unknown | ((url: string, method: string) => unknown)]

const RULES: DemoHandler[] = [
  [/\/auth\/me$/, { id: 'demo', username: 'Demo 访客', role: 'admin' }],
  // 模型路由
  [/\/model-configs\/active/, { routes: Object.fromEntries(DEMO_ROUTES.map(r => [r.role, { provider: r.provider, model: r.model, max_tokens: r.max_tokens }])), fallback_chain: {} }],
  [/\/model-configs\/usage/, { total_tokens: 284000, by_model: { 'claude-sonnet-4': 210000, 'claude-haiku-3-5': 74000 }, routes: { default: 'claude-sonnet-4', chat: 'claude-sonnet-4', compliance: 'claude-sonnet-4', summary: 'claude-haiku-3-5' } }],
  [/\/model-configs\//, (_u: string, _m: string) => null], // 单条路由（demo 用不到）
  [/\/model-configs/, { configs: DEMO_ROUTES }],
  // 第三方平台
  [/\/integrations\/providers/, { providers: DEMO_INTEGRATIONS }],
  [/\/integrations\/status/, { status: { shopify: { name: 'Shopify', status: 'not_configured', connected: 0, total_connections: 0 }, erpnext: { name: 'ERPNext', status: 'connected', connected: 1, total_connections: 1 } } }],
  [/\/integrations/, { connections: [] }],
  // 通知渠道
  [/\/channels/, { channels: DEMO_CHANNELS }],
  // 主动简报
  [/\/proactive\/brief/, { briefs: DEMO_PROACTIVE_BRIEFS }],
  // 流水线健康
  [/\/pipeline\/health/, DEMO_PIPELINE_HEALTH],
  // 定时任务
  [/\/scheduler\/jobs\/grouped/, { global: DEMO_JOBS, products: {}, product_meta: {}, enabled: true }],
  [/\/scheduler\/tasks-with-workers/, DEMO_TASKS_WORKERS],
  // 风险告警
  [/\/risk\/alerts\/unread/, { count: DEMO_ALERTS.filter(a => !(a as any).dismissed).length }],
  [/\/risk\/alerts/, { alerts: DEMO_ALERTS, page: 1, size: 50 }],
  [/\/risk\/market-status/, { markets: [{ code: 'eu', name: '欧盟', status: 'active', alert_count: 2 }, { code: 'us', name: '美国', status: 'active', alert_count: 1 }, { code: 'jp', name: '日本', status: 'watch', alert_count: 1 }, { code: 'kr', name: '韩国', status: 'watch', alert_count: 1 }] }],
  // 产品
  [/\/products\/[^/]+\/events/, { events: [{ type: 'product:created', timestamp: day(90) }, { type: 'lifecycle_stage', data: { new_stage: 'fulfilling' }, timestamp: day(30) }], total: 2 }],
  [/\/products\/[^/]+\/lifecycle/, DEMO_PRODUCTS[0]], // PUT lifecycle 返回更新后的产品
  [/\/products\//, (_u: string, _m: string) => DEMO_PRODUCTS[0]], // GET /products/:id
  [/\/products/, DEMO_PRODUCTS],
  // 知识库
  [/\/knowledge\/docs/, DEMO_KNOWLEDGE_DOCS],
  [/\/knowledge\/stats/, DEMO_KNOWLEDGE_STATS],
  [/\/knowledge\/search/, { results: DEMO_KNOWLEDGE_DOCS.map(d => ({ doc_id: d.doc_id, filename: d.filename, content: `[${d.regulation_name || d.market}] 法规摘要...`, score: 0.85 })) }],
  [/\/knowledge\/url/, { doc_id: 'd5', filename: 'imported-url', status: 'indexing' }],
  // 新闻监控
  [/\/news-monitor\/summary/, DEMO_MARKET_SUMMARY],
  [/\/news-monitor\/keywords/, DEMO_KEYWORDS],
  [/\/news-monitor\/news/, { news: DEMO_NEWS, total: DEMO_NEWS.length }],
  // Shopify — listShopifyShops 返回 ShopifyShopInfo[]（数组）
  [/\/shopify\/shops/, [{ shop: 'demo-store.myshopify.com', name: 'Demo Store', status: 'active', plan: 'basic' }]],
  // Agent 列表
  [/\/agents/, [{ id: 'a1', name: '合规查询 Agent', enabled: true, sort_order: 1 }, { id: 'a2', name: '风险预警 Agent', enabled: true, sort_order: 2 }, { id: 'a3', name: '知识检索 Agent', enabled: true, sort_order: 3 }]],
  // 会话 — SessionSummary[]（无 wrapper）
  [/\/sessions\//, (_u: string, _m: string) => null], // GET /sessions/:id 跳过
  [/\/sessions/, DEMO_SESSIONS],
  // chains
  [/\/chains\/events/, { events: [], total: 0 }],
  [/\/chains\/actions/, { actions: [], total: 0 }],
]

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return (input as Request).url
}

export function demoResponse(input: RequestInfo | URL, init?: RequestInit): Response {
  const url = urlOf(input)
  const method = (init?.method || 'GET').toUpperCase()

  for (const [re, handler] of RULES) {
    if (!re.test(url)) continue
    const result = typeof handler === 'function' ? handler(url, method) : handler
    if (result !== null) return json(result)
  }

  // 写操作默认成功
  if (method !== 'GET') return json({ ok: true, status: 'ok' })
  // 未知 GET 默认空数组
  return json([])
}
