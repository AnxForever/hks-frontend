/**
 * Mock data for Vercel demo deployment (no backend).
 * All data is fake but realistic — designed for showcase purposes.
 */

const now = () => new Date().toISOString()
const ts = () => Math.floor(Date.now() / 1000)

// ── Products ────────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  {
    id: 'prod-001', name: '智能蓝牙耳机 Pro', product_type: 'consumer_electronics',
    target_markets: ['EU', 'US'], hs_code: '8518.30', vendor: '深圳声科技术',
    manufacturer: '深圳声科技术有限公司', tags: ['蓝牙', '音频', '消费电子'],
    lifecycle_stage: 'active', business_stage: 'fulfilling',
    compliance_status: 'passed', risk_level: 'low', health_score: 92,
    certifications: [
      { name: 'CE', status: 'valid' }, { name: 'FCC', status: 'valid' },
      { name: 'REACH', status: 'valid' }, { name: 'RoHS', status: 'valid' },
    ],
    created_at: '2025-11-15T08:00:00Z', updated_at: '2026-07-20T10:30:00Z',
  },
  {
    id: 'prod-002', name: '儿童益智积木套装', product_type: 'toys',
    target_markets: ['EU', 'JP'], hs_code: '9503.00', vendor: '广州乐创玩具',
    manufacturer: '广州乐创玩具有限公司', tags: ['玩具', '儿童', '益智'],
    lifecycle_stage: 'ready', business_stage: 'sourcing',
    compliance_status: 'checking', risk_level: 'medium', health_score: 74,
    certifications: [
      { name: 'CE', status: 'valid' }, { name: 'EN 71', status: 'pending' },
      { name: 'ST', status: 'missing' },
    ],
    created_at: '2026-02-10T06:00:00Z', updated_at: '2026-07-18T14:20:00Z',
  },
  {
    id: 'prod-003', name: 'USB-C 快充适配器 65W', product_type: 'power_supply',
    target_markets: ['US', 'KR'], hs_code: '8504.40', vendor: '东莞安力电源',
    manufacturer: '东莞安力电源科技有限公司', tags: ['充电器', 'USB-C', '快充'],
    lifecycle_stage: 'active', business_stage: 'active',
    compliance_status: 'passed', risk_level: 'low', health_score: 88,
    certifications: [
      { name: 'FCC', status: 'valid' }, { name: 'UL', status: 'valid' },
      { name: 'KC', status: 'valid' },
    ],
    created_at: '2026-01-05T09:00:00Z', updated_at: '2026-07-22T08:45:00Z',
  },
  {
    id: 'prod-004', name: '有机绿茶礼盒', product_type: 'food_beverage',
    target_markets: ['JP', 'KR', 'EU'], hs_code: '0902.10', vendor: '杭州龙井茶业',
    manufacturer: '杭州龙井茶业有限公司', tags: ['茶叶', '有机', '食品'],
    lifecycle_stage: 'design', business_stage: 'concept',
    compliance_status: 'failed', risk_level: 'high', health_score: 45,
    certifications: [
      { name: 'JAS', status: 'missing' }, { name: 'EU Organic', status: 'missing' },
      { name: 'HACCP', status: 'pending' },
    ],
    created_at: '2026-05-20T07:00:00Z', updated_at: '2026-07-24T16:10:00Z',
  },
  {
    id: 'prod-005', name: '户外防水LED灯带', product_type: 'lighting',
    target_markets: ['EU', 'US', 'KR'], hs_code: '9405.40', vendor: '中山光明照明',
    manufacturer: '中山光明照明科技', tags: ['LED', '户外', '照明'],
    lifecycle_stage: 'sourcing', business_stage: 'sourcing',
    compliance_status: 'pending', risk_level: 'medium', health_score: 65,
    certifications: [
      { name: 'CE', status: 'pending' }, { name: 'FCC', status: 'pending' },
      { name: 'IP67', status: 'valid' },
    ],
    created_at: '2026-04-01T10:00:00Z', updated_at: '2026-07-23T12:00:00Z',
  },
]

// ── Product Events ──────────────────────────────────────────────────────────

export function mockProductEvents(productId: string) {
  return {
    events: [
      {
        id: `evt-${productId}-1`, type: 'compliance_check', category: 'compliance',
        source: 'system', product_id: productId, title: '合规预检完成',
        description: '已完成目标市场的认证矩阵检查', timestamp: '2026-07-20T10:00:00Z',
        severity: 'low' as const,
      },
      {
        id: `evt-${productId}-2`, type: 'certification_update', category: 'certification',
        source: 'agent', product_id: productId, title: 'CE 认证状态更新',
        description: '认证文件已通过审核，有效期至 2027-12-31', timestamp: '2026-07-18T14:00:00Z',
        severity: 'low' as const,
      },
      {
        id: `evt-${productId}-3`, type: 'risk_alert', category: 'risk',
        source: 'risk_intel', product_id: productId, title: '法规变更预警',
        description: 'EU 新版低电压指令即将生效，请检查产品是否合规', timestamp: '2026-07-15T09:00:00Z',
        severity: 'medium' as const,
      },
    ],
    total: 3,
  }
}

// ── Product Todos ───────────────────────────────────────────────────────────

export function mockProductTodos(productId: string) {
  return {
    todos: [
      {
        id: `todo-${productId}-1`, product_id: productId, title: '补充 REACH SVHC 声明',
        description: '需要提交高关注物质声明文件', todo_type: 'compliance_gap',
        status: 'pending', priority: 'high', prompt: '请生成 REACH SVHC 合规声明',
        source: 'compliance_check', created_at: '2026-07-20T10:00:00Z', updated_at: '2026-07-20T10:00:00Z',
      },
      {
        id: `todo-${productId}-2`, product_id: productId, title: '更新产品标签',
        description: '根据目标市场要求更新包装标签信息', todo_type: 'custom',
        status: 'completed', priority: 'medium', prompt: '请检查并更新产品标签',
        source: 'manual', result_summary: '标签已更新，符合 EU 和 US 要求',
        created_at: '2026-07-15T08:00:00Z', updated_at: '2026-07-19T16:00:00Z',
        completed_at: '2026-07-19T16:00:00Z',
      },
    ],
    total: 2,
  }
}

// ── Risk Alerts ─────────────────────────────────────────────────────────────

export const MOCK_RISK_ALERTS = [
  {
    id: 'alert-001', alert_type: 'regulation_change', severity: 'high',
    title: 'EU GPSR 通用产品安全法规正式生效',
    message: '自 2024 年 12 月 13 日起，所有出口 EU 的消费品必须符合新版通用产品安全法规要求，影响您的 3 个产品。',
    created_at: '2026-07-24T08:00:00Z', dismissed: false,
    affected_products: ['prod-001', 'prod-002', 'prod-005'],
    affected_markets: ['EU'],
  },
  {
    id: 'alert-002', alert_type: 'tariff_change', severity: 'medium',
    title: '美国对华关税调整通知',
    message: 'USTR 宣布自 2026 年 8 月起，HS 8518（音频设备）关税税率调整至 25%。',
    created_at: '2026-07-22T10:00:00Z', dismissed: false,
    affected_products: ['prod-001'],
    affected_markets: ['US'],
  },
  {
    id: 'alert-003', alert_type: 'certification_expiry', severity: 'medium',
    title: 'FCC 认证即将到期',
    message: 'USB-C 快充适配器 65W 的 FCC 认证将于 2026-09-30 到期，请提前续期。',
    created_at: '2026-07-20T06:00:00Z', dismissed: false,
    affected_products: ['prod-003'],
  },
  {
    id: 'alert-004', alert_type: 'market_risk', severity: 'low',
    title: '日本食品进口新规草案',
    message: '日本厚生劳动省发布新的食品进口检验草案，预计 2026 Q4 正式实施。',
    created_at: '2026-07-18T12:00:00Z', dismissed: true,
    affected_products: ['prod-004'],
    affected_markets: ['JP'],
  },
]

// ── Metrics Dashboard ───────────────────────────────────────────────────────

export const MOCK_METRICS_DASHBOARD = {
  total_products: 5,
  risk_distribution: { low: 2, medium: 2, high: 1, critical: 0 },
  recent_alerts: MOCK_RISK_ALERTS.slice(0, 3),
  active_markets: ['EU', 'US', 'JP', 'KR'],
  health_score: 76,
  trend: [
    { date: '2026-07-18', checks: 12 },
    { date: '2026-07-19', checks: 8 },
    { date: '2026-07-20', checks: 15 },
    { date: '2026-07-21', checks: 6 },
    { date: '2026-07-22', checks: 18 },
    { date: '2026-07-23', checks: 10 },
    { date: '2026-07-24', checks: 14 },
  ],
  metrics: {
    compliance_pass_rate: { value: 0.78, threshold: 0.8, status: 'warning', trend: 'up' },
    avg_health_score: { value: 72.8, threshold: 70, status: 'normal', trend: 'stable' },
    cert_coverage: { value: 0.85, threshold: 0.9, status: 'warning', trend: 'up' },
    risk_alert_rate: { value: 0.12, threshold: 0.2, status: 'normal', trend: 'down' },
    market_coverage: { value: 4, threshold: 3, status: 'normal', trend: 'stable' },
    overdue_actions: { value: 1, threshold: 3, status: 'normal', trend: 'down' },
    active_issues: { value: 3, threshold: 5, status: 'normal', trend: 'stable' },
    response_time_hrs: { value: 4.2, threshold: 8, status: 'normal', trend: 'down' },
  },
  custom_metrics: [],
}

// ── Pipeline Health ─────────────────────────────────────────────────────────

export const MOCK_PIPELINE_HEALTH = {
  overall_score: 76,
  stages: [
    { stage_number: 1, stage_name: '感知', pass_rate: 1.0, total_products: 5, passed_products: 5, risk_products: 0, pending_actions: 0, status: 'healthy' },
    { stage_number: 2, stage_name: '检查', pass_rate: 0.8, total_products: 5, passed_products: 4, risk_products: 1, pending_actions: 1, status: 'warning' },
    { stage_number: 3, stage_name: '推荐', pass_rate: 0.9, total_products: 5, passed_products: 4, risk_products: 0, pending_actions: 1, status: 'healthy' },
    { stage_number: 4, stage_name: '告知', pass_rate: 1.0, total_products: 5, passed_products: 5, risk_products: 0, pending_actions: 0, status: 'healthy' },
    { stage_number: 5, stage_name: '交互', pass_rate: 0.6, total_products: 5, passed_products: 3, risk_products: 1, pending_actions: 2, status: 'warning' },
    { stage_number: 6, stage_name: '处理', pass_rate: 0.7, total_products: 5, passed_products: 3, risk_products: 1, pending_actions: 1, status: 'warning' },
  ],
  last_updated: now(),
}

// ── Integrations / Shopify ──────────────────────────────────────────────────

export const MOCK_INTEGRATIONS_STATUS = {
  status: {
    shopify: { name: 'Shopify', icon: '🛍️', status: 'connected', connected: 1, total_connections: 1 },
    feishu: { name: '飞书', icon: '💬', status: 'connected', connected: 1, total_connections: 1 },
    openrouter: { name: 'OpenRouter', icon: '🤖', status: 'connected', connected: 1, total_connections: 1 },
  },
}

export const MOCK_INTEGRATIONS = {
  connections: [
    { id: 'int-001', provider: 'shopify', label: 'demo-store.myshopify.com', status: 'connected', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-07-24T10:00:00Z' },
    { id: 'int-002', provider: 'feishu', label: '避风港通知群', status: 'connected', created_at: '2026-04-15T08:00:00Z', updated_at: '2026-07-24T10:00:00Z' },
    { id: 'int-003', provider: 'openrouter', label: 'OpenRouter API', status: 'connected', created_at: '2026-05-01T08:00:00Z', updated_at: '2026-07-24T10:00:00Z' },
  ],
}

export const MOCK_INTEGRATION_PROVIDERS = {
  providers: [
    { provider: 'shopify', name: 'Shopify', icon: '🛍️', auth_type: 'oauth2', config_fields: ['shop_domain'], description: 'Shopify 店铺集成' },
    { provider: 'feishu', name: '飞书', icon: '💬', auth_type: 'app', config_fields: ['app_id', 'app_secret'], description: '飞书 Bot 推送' },
    { provider: 'openrouter', name: 'OpenRouter', icon: '🤖', auth_type: 'api_key', config_fields: ['api_key'], description: 'LLM 模型路由' },
  ],
}

export const MOCK_SHOPIFY_SHOPS = [
  { shop: 'demo-store.myshopify.com', scope: 'read_products,write_products,read_orders' },
]

// ── Knowledge ───────────────────────────────────────────────────────────────

export const MOCK_KNOWLEDGE_DOCS = [
  { id: 'doc-001', user_id: 'admin', doc_type: 'pdf', name: 'EU GPSR 通用产品安全法规', source_url: '', market: 'eu', status: 'done', chunk_count: 42, error_msg: '', created_at: ts() - 86400 * 7, updated_at: ts() - 86400 },
  { id: 'doc-002', user_id: 'admin', doc_type: 'url', name: 'FCC Equipment Authorization', source_url: 'https://www.fcc.gov/engineering-technology/electromagnetic-compatibility-division/equipment-authorization', market: 'us', status: 'done', chunk_count: 28, error_msg: '', created_at: ts() - 86400 * 14, updated_at: ts() - 86400 * 3 },
  { id: 'doc-003', user_id: 'admin', doc_type: 'pdf', name: '日本电气用品安全法 (PSE)', source_url: '', market: 'jp', status: 'done', chunk_count: 35, error_msg: '', created_at: ts() - 86400 * 30, updated_at: ts() - 86400 * 10 },
]

export const MOCK_KNOWLEDGE_STATS = {
  total_docs: 3, total_chunks: 105, done_count: 3,
  indexing_count: 0, error_count: 0,
  market_distribution: { eu: 1, us: 1, jp: 1 }, total_vectors: 105,
}

// ── News Monitor ────────────────────────────────────────────────────────────

export const MOCK_NEWS = {
  news: [
    { id: 'news-001', title: '欧盟发布新版电池法规实施细则', content: '欧盟委员会正式发布电池和废电池法规的实施细则，对便携式电池的碳足迹标签提出明确要求...', source: 'EU Official Journal', url: 'https://example.com/eu-battery', risk_direction: '利空', risk_level: 'high', logic: '新增碳足迹标签要求将增加出口企业的合规成本', keywords: ['电池法规', 'EU', '碳足迹'], published_at: '2026-07-24T06:00:00Z', analyzed_at: '2026-07-24T06:30:00Z' },
    { id: 'news-002', title: '中美贸易谈判释放积极信号', content: '双方同意就部分关税问题展开新一轮磋商，市场情绪回暖...', source: 'Reuters', url: 'https://example.com/us-cn-trade', risk_direction: '利多', risk_level: 'medium', logic: '若关税下调将直接降低出口成本', keywords: ['关税', '中美贸易', '磋商'], published_at: '2026-07-23T14:00:00Z', analyzed_at: '2026-07-23T14:30:00Z' },
    { id: 'news-003', title: '韩国 KC 认证改革方案公布', content: '韩国技术标准院发布 KC 认证改革方案，简化部分消费电子产品认证流程...', source: 'KATS', url: 'https://example.com/kr-kc', risk_direction: '利多', risk_level: 'low', logic: '认证流程简化有利于缩短产品上市周期', keywords: ['KC认证', '韩国', '消费电子'], published_at: '2026-07-22T10:00:00Z', analyzed_at: '2026-07-22T10:30:00Z' },
    { id: 'news-004', title: '日本修订食品卫生法进口标准', content: '厚生劳动省发布食品卫生法修订草案，加强有机食品农药残留检测标准...', source: 'MHLW', url: 'https://example.com/jp-food', risk_direction: '利空', risk_level: 'medium', logic: '农药残留限值收紧将影响有机食品出口', keywords: ['食品安全', '日本', '有机'], published_at: '2026-07-21T08:00:00Z', analyzed_at: '2026-07-21T08:30:00Z' },
  ],
  total: 4,
}

export const MOCK_NEWS_SUMMARY = {
  bullish_count: 2, bearish_count: 2, neutral_count: 0,
  high_risk_news: MOCK_NEWS.news.filter(n => n.risk_level === 'high'),
  period_hours: 168,
}

export const MOCK_NEWS_KEYWORDS = {
  keywords: ['关税', '认证', '法规变更', '出口管制', '产品安全'],
  high_words: ['禁运', '召回', '制裁'],
}

// ── Notifications ───────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS = {
  notifications: [
    { id: 'notif-001', title: '合规检查完成', message: '智能蓝牙耳机 Pro 的 EU 市场合规检查已完成，全部通过。', is_read: false, severity: 'low', created_at: now() },
    { id: 'notif-002', title: '风险预警', message: 'EU GPSR 法规变更可能影响您的 3 个产品，建议尽快检查。', is_read: false, severity: 'high', created_at: '2026-07-24T08:00:00Z' },
    { id: 'notif-003', title: 'Shopify 同步完成', message: '已同步 12 个产品，发现 1 个缺失商品。', is_read: true, severity: 'medium', created_at: '2026-07-23T10:00:00Z' },
  ],
  total: 3,
}

// ── Channels ────────────────────────────────────────────────────────────────

export const MOCK_CHANNELS = {
  channels: [
    { name: '飞书告警群', channel: 'feishu', status: 'active', enabled: true, min_level: 'medium' },
    { name: 'Webhook 回调', channel: 'webhook', status: 'active', webhook_url: 'https://example.com/webhook', enabled: true, min_level: 'high' },
  ],
}

// ── Agents ───────────────────────────────────────────────────────────────────

export const MOCK_AGENTS = [
  { id: 'agent-general', name: '通用合规助手', type: 'general', description: '处理日常合规咨询和产品预检', system_prompt_preview: '你是避风港平台的合规助手...', enabled: true, sort_order: 0, created_at: ts() - 86400 * 60, updated_at: ts() - 86400 },
  { id: 'agent-cert', name: '认证专家', type: 'expert', description: '专注于 CE/FCC/REACH 等国际认证', system_prompt_preview: '你是一名资深的产品认证专家...', enabled: true, sort_order: 1, created_at: ts() - 86400 * 60, updated_at: ts() - 86400 * 2 },
  { id: 'agent-tax', name: '税务专家', type: 'expert', description: 'VAT/关税/HS 编码专业分析', system_prompt_preview: '你是一名跨境电商税务专家...', enabled: true, sort_order: 2, created_at: ts() - 86400 * 60, updated_at: ts() - 86400 * 3 },
  { id: 'agent-export', name: '出口管制专家', type: 'expert', description: '出口管制清单和制裁合规', system_prompt_preview: '你是一名出口管制合规专家...', enabled: true, sort_order: 3, created_at: ts() - 86400 * 60, updated_at: ts() - 86400 * 5 },
  { id: 'agent-culture', name: '文化合规专家', type: 'expert', description: '目标市场文化禁忌与本地化', system_prompt_preview: '你是一名跨文化合规顾问...', enabled: false, sort_order: 4, created_at: ts() - 86400 * 60, updated_at: ts() - 86400 * 10 },
]

// ── Skills ───────────────────────────────────────────────────────────────────

export const MOCK_SKILLS = {
  skills: [
    { name: 'web-search', description: '网络搜索', category: 'tool', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'summarize', description: '文本摘要', category: 'tool', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'browser-control', description: '浏览器自动化', category: 'tool', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'news-collect', description: '新闻采集', category: 'business', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'news-analyze', description: '新闻分析', category: 'business', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'risk-intel-collect', description: '风险情报采集', category: 'business', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'risk-intel-analyze', description: '风险情报分析', category: 'business', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'shopify-admin', description: 'Shopify 管理', category: 'integration', mode: 'native', status: 'enabled', version: '1.0.0' },
    { name: 'skill-vetter', description: '技能安全审查', category: 'system', mode: 'native', status: 'enabled', version: '1.0.0' },
  ],
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const MOCK_TOOLS = {
  tools: [
    { id: 'tool-compliance', name: 'compliance_workflow', display_name: '合规工作流', description: '执行产品合规检查流程', category: 'workflow', permission: 'guarded', enabled: true, source: 'system' },
    { id: 'tool-customs', name: 'customs_workflow', display_name: '报关工作流', description: '报关单生成与提交', category: 'workflow', permission: 'guarded', enabled: true, source: 'system' },
    { id: 'tool-logistics', name: 'logistics_workflow', display_name: '物流工作流', description: '物流追踪与管理', category: 'workflow', permission: 'guarded', enabled: true, source: 'system' },
    { id: 'tool-risk', name: 'risk_workflow', display_name: '风险工作流', description: '风险评估与预警', category: 'workflow', permission: 'guarded', enabled: true, source: 'system' },
    { id: 'tool-read-config', name: 'read_config', display_name: '读取配置', description: '读取系统配置', category: 'admin', permission: 'safe', enabled: true, source: 'system' },
    { id: 'tool-write-config', name: 'write_config', display_name: '写入配置', description: '修改系统配置', category: 'admin', permission: 'guarded', enabled: true, source: 'system' },
  ],
  total: 6,
}

// ── MCP Servers ─────────────────────────────────────────────────────────────

export const MOCK_MCP_SERVERS = {
  servers: [
    { name: 'filesystem', type: 'stdio', command: 'npx', args: ['-y', '@anthropic/mcp-filesystem'], description: '文件系统访问', enabled: true, source: 'mcp', editable: true },
  ],
  total: 1,
}

// ── Orders ──────────────────────────────────────────────────────────────────

export const MOCK_ORDERS = [
  {
    id: 'order-001', product_id: 'prod-001', platform: 'shopify', platform_order_id: 'SHP-20260724-001',
    buyer_name: 'John Smith', buyer_email: 'john@example.com',
    buyer_address: { country: 'DE', city: 'Berlin', zip: '10115', street: 'Friedrichstr. 123' },
    items: [{ sku: 'BT-PRO-001', name: '智能蓝牙耳机 Pro', qty: 2, unit_price: 79.99, hs_code: '8518.30' }],
    currency: 'EUR', total_amount: 159.98, status: 'paid', created_at: '2026-07-22T08:00:00Z', updated_at: '2026-07-23T10:00:00Z',
  },
  {
    id: 'order-002', product_id: 'prod-003', platform: 'amazon', platform_order_id: 'AMZ-20260723-042',
    buyer_name: 'Emily Davis', buyer_email: 'emily@example.com',
    buyer_address: { country: 'US', city: 'San Francisco', zip: '94102', street: '456 Market St' },
    items: [{ sku: 'CHG-65W-001', name: 'USB-C 快充适配器 65W', qty: 3, unit_price: 35.99, hs_code: '8504.40' }],
    currency: 'USD', total_amount: 107.97, status: 'shipped', created_at: '2026-07-21T14:00:00Z', updated_at: '2026-07-24T06:00:00Z',
  },
  {
    id: 'order-003', product_id: 'prod-002', platform: 'shopify', platform_order_id: 'SHP-20260720-003',
    buyer_name: '田中太郎', buyer_email: 'tanaka@example.co.jp',
    buyer_address: { country: 'JP', city: 'Tokyo', zip: '100-0001', street: '千代田区 1-1-1' },
    items: [{ sku: 'TOY-BLK-001', name: '儿童益智积木套装', qty: 1, unit_price: 45.00, hs_code: '9503.00' }],
    currency: 'JPY', total_amount: 6750, status: 'pending', created_at: '2026-07-20T06:00:00Z', updated_at: '2026-07-20T06:00:00Z',
  },
]

// ── Scheduled Tasks ─────────────────────────────────────────────────────────

export const MOCK_SCHEDULED_TASKS = [
  {
    id: 'stask-001', user_id: 'admin', title: '每日合规简报',
    prompt: '生成今日合规简报，包含所有产品的合规状态变化和风险预警',
    schedule_type: 'cron', schedule_spec: { hour: 9, minute: 0 }, timezone: 'Asia/Shanghai',
    status: 'enabled', product_id: null, next_run_at: '2026-07-25T01:00:00Z',
    last_run_at: '2026-07-24T01:00:00Z', last_run_id: 'run-001', last_error: null,
    run_count: 30, created_at: '2026-06-24T08:00:00Z', updated_at: '2026-07-24T01:00:00Z',
  },
  {
    id: 'stask-002', user_id: 'admin', title: '产品健康度检查',
    prompt: '检查所有活跃产品的健康度评分，对低于70分的产品生成待办事项',
    schedule_type: 'cron', schedule_spec: { day_of_week: 1, hour: 10 }, timezone: 'Asia/Shanghai',
    status: 'enabled', product_id: null, next_run_at: '2026-07-28T02:00:00Z',
    last_run_at: '2026-07-21T02:00:00Z', last_run_id: 'run-002', last_error: null,
    run_count: 4, created_at: '2026-07-01T08:00:00Z', updated_at: '2026-07-21T02:00:00Z',
  },
]


export const MOCK_NL_STORE = [
  { namespace: 'compliance', key: 'eu-ce-requirements', title: 'EU CE 认证要求概述', tags: ['CE', 'EU', '认证'], updated_at: '2026-07-20T10:00:00Z' },
  { namespace: 'compliance', key: 'fcc-part15', title: 'FCC Part 15 合规要点', tags: ['FCC', 'US', 'EMC'], updated_at: '2026-07-18T08:00:00Z' },
  { namespace: 'tariff', key: 'us-hts-8518', title: '美国 HTS 8518 类关税税率', tags: ['关税', 'US', '音频'], updated_at: '2026-07-15T12:00:00Z' },
]

export const MOCK_NL_NAMESPACES = { namespaces: ['compliance', 'tariff', 'regulation', 'market'] }

// ── Chains ──────────────────────────────────────────────────────────────────

export const MOCK_ACTION_CHAINS = [
  { chain_id: 'chain-001', total_actions: 4, status: 'completed', trail_preview: ['合规预检', 'HS匹配', 'VAT计算', '报告生成'], updated_at: '2026-07-24T10:00:00Z' },
  { chain_id: 'chain-002', total_actions: 3, status: 'completed', trail_preview: ['产品同步', '缺失检测', '飞书通知'], updated_at: '2026-07-23T14:00:00Z' },
]

export const MOCK_EVENT_CHAINS = [
  { chain_id: 'echain-001', total_events: 5, timeline_preview: ['产品创建', '合规检查', '认证验证', '预警生成', '通知推送'], updated_at: '2026-07-24T10:00:00Z' },
]

// ── Model Configs ───────────────────────────────────────────────────────────

export const MOCK_MODEL_CONFIGS = {
  configs: [
    { role: 'default', provider: 'openrouter', model: 'gpt-4o', api_key_env: 'LLM_API_KEY', base_url: 'https://openrouter.ai/api/v1', max_tokens: 4096, temperature: 0.7 },
    { role: 'fast', provider: 'openrouter', model: 'gpt-4o-mini', api_key_env: 'LLM_API_KEY', base_url: 'https://openrouter.ai/api/v1', max_tokens: 2048, temperature: 0.5 },
  ],
}

export const MOCK_MODEL_USAGE = {
  total_tokens: 125840, by_model: { 'gpt-4o': 98200, 'gpt-4o-mini': 27640 },
  routes: { default: 'gpt-4o', fast: 'gpt-4o-mini' },
}

// ── Metrics Templates ───────────────────────────────────────────────────────

export const MOCK_BUILTIN_TEMPLATES = {
  templates: {
    compliance_pass_rate: { name: '合规通过率', formula: 'passed / total', threshold_warning: 0.8, threshold_critical: 0.6, default_threshold_warning: 0.8, default_threshold_critical: 0.6, refresh: '1h', customized: false },
    avg_health_score: { name: '平均健康度', formula: 'avg(health_score)', threshold_warning: 70, threshold_critical: 50, default_threshold_warning: 70, default_threshold_critical: 50, refresh: '1h', customized: false },
    cert_coverage: { name: '认证覆盖率', formula: 'certs_valid / certs_required', threshold_warning: 0.9, threshold_critical: 0.7, default_threshold_warning: 0.9, default_threshold_critical: 0.7, refresh: '6h', customized: false },
  },
}

// ── Users ────────────────────────────────────────────────────────────────────

export const MOCK_USERS = [
  { id: 'admin', username: 'admin', role: 'admin', created_at: '2026-01-01T00:00:00Z' },
  { id: 'user-001', username: 'operator', role: 'user', created_at: '2026-03-15T08:00:00Z' },
]

// ── Proactive Briefs ────────────────────────────────────────────────────────

export const MOCK_BRIEFS = {
  briefs: [
    {
      type: 'daily', date: '2026-07-24', generated_at: '2026-07-24T01:00:00Z',
      summary: { active_products: 5, pending_alerts: 3, compliance_pass_rate: 0.78, cert_expiry_warnings: 1, regulation_changes: 2 },
      highlights: ['EU GPSR 法规正式生效，影响 3 个产品', 'FCC 认证续期提醒：USB-C 适配器', '新增 2 条风险情报'],
      recommendations: ['建议优先处理有机绿茶礼盒的认证缺失问题', '安排 FCC 认证续期流程'],
    },
  ],
}

// ── Market Status ───────────────────────────────────────────────────────────

export const MOCK_MARKET_STATUS = {
  last_scan: '2026-07-24T10:00:00Z',
  active_alerts: 3,
  markets: [
    { code: 'EU', alerts: 1 }, { code: 'US', alerts: 1 },
    { code: 'JP', alerts: 1 }, { code: 'KR', alerts: 0 },
  ],
}

// ── Risk Intel ──────────────────────────────────────────────────────────────

export const MOCK_RISK_INTEL_FEED = {
  items: [
    {
      id: 'ri-001', source_type: 'news', source_name: 'EU Official Journal',
      title: '欧盟发布新版电池法规实施细则', summary: '对便携式电池碳足迹标签提出明确要求',
      url: 'https://example.com/eu-battery', pub_time: '2026-07-24T06:00:00Z',
      collected_at: '2026-07-24T06:30:00Z', risk_domain: 'tariff', risk_category: '法规变更',
      risk_score: 82, severity: 'high', affected_markets: ['EU'], affected_hs_codes: ['8507'],
      matched_keywords: ['电池法规', '碳足迹'], analyzed: 1,
      llm_analysis: { summary: '欧盟新版电池法规要求所有便携式电池标注碳足迹', impact: '增加出口企业合规成本约15-20%', actions: ['评估产品电池类型', '准备碳足迹数据', '更新产品标签'], confidence: 0.88 },
      llm_analyzed: 1,
    },
  ],
  total: 1, page: 1, has_next: false,
}

export const MOCK_RISK_INTEL_KEYWORDS = [
  { id: 'kw-001', user_id: 'admin', keyword: '关税调整', label: '关税监控', domain: 'tariff', auto_suggested: 0, periodic_enabled: 1, cron_expr: '0 */6 * * *', total_runs: 120, total_hits: 45, enabled: 1, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-07-24T06:00:00Z' },
  { id: 'kw-002', user_id: 'admin', keyword: '产品安全召回', label: '召回监控', domain: 'conflict', auto_suggested: 1, source_hint: '基于您的产品类型推荐', periodic_enabled: 1, cron_expr: '0 */12 * * *', total_runs: 60, total_hits: 8, enabled: 1, created_at: '2026-06-15T00:00:00Z', updated_at: '2026-07-24T00:00:00Z' },
]

export const MOCK_RISK_INTEL_HEATMAP = {
  by_domain: {
    tariff: { count: 12, critical: 1, high: 3, avg_score: 65 },
    conflict: { count: 5, critical: 0, high: 1, avg_score: 45 },
    financial: { count: 3, critical: 0, high: 0, avg_score: 30 },
  },
  trend: [
    { date: '2026-07-18', tariff: 2, conflict: 1, financial: 0 },
    { date: '2026-07-19', tariff: 1, conflict: 0, financial: 1 },
    { date: '2026-07-20', tariff: 3, conflict: 1, financial: 0 },
    { date: '2026-07-21', tariff: 1, conflict: 1, financial: 1 },
    { date: '2026-07-22', tariff: 2, conflict: 0, financial: 0 },
    { date: '2026-07-23', tariff: 1, conflict: 1, financial: 1 },
    { date: '2026-07-24', tariff: 2, conflict: 1, financial: 0 },
  ],
  top_markets: [
    { market: 'EU', count: 8 }, { market: 'US', count: 6 },
    { market: 'JP', count: 4 }, { market: 'KR', count: 2 },
  ],
  latest_critical: [],
  generated_at: now(),
}
