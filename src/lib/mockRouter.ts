/**
 * Mock HTTP router for Vercel demo deployment.
 *
 * In mock mode (VITE_STREAM_MODE=mock), intercepts fetchWithAuth calls
 * and returns realistic fake data so every page renders with content
 * instead of "连接失败" errors.
 */
import * as MOCK from './mockData'

type MockHandler = (url: string, init?: RequestInit) => unknown

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function notFound(): Response {
  return new Response(JSON.stringify({ detail: 'Not found in mock' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── URL pattern matching ─────────────────────────────────────────────────────

function matchParams(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i]!.startsWith(':')) {
      params[patternParts[i]!.slice(1)] = pathParts[i]!
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

// ── Route map ────────────────────────────────────────────────────────────────

const routes: Array<{ method: string; pattern: string; handler: MockHandler }> = [
  // ── Products ──
  { method: 'GET', pattern: '/api/v1/products', handler: () => ok(MOCK.MOCK_PRODUCTS) },
  { method: 'GET', pattern: '/api/v1/products/:id', handler: (url) => {
    const p = matchParams('/api/v1/products/:id', url)
    const product = MOCK.MOCK_PRODUCTS.find(x => x.id === p?.id)
    return product ? ok(product) : notFound()
  }},
  { method: 'POST', pattern: '/api/v1/products', handler: () => ok(MOCK.MOCK_PRODUCTS[0]!) },
  { method: 'PUT', pattern: '/api/v1/products/:id', handler: () => ok(MOCK.MOCK_PRODUCTS[0]!) },
  { method: 'PUT', pattern: '/api/v1/products/:id/lifecycle', handler: () => ok(MOCK.MOCK_PRODUCTS[0]!) },
  { method: 'DELETE', pattern: '/api/v1/products/:id', handler: () => ok({ success: true, archived: false }) },
  { method: 'GET', pattern: '/api/v1/products/:id/events', handler: (url) => {
    const p = matchParams('/api/v1/products/:id/events', url)
    return ok(MOCK.mockProductEvents(p?.id ?? ''))
  }},
  { method: 'POST', pattern: '/api/v1/products/:id/compliance-check', handler: () => ok({ status: 'started' }) },
  { method: 'GET', pattern: '/api/v1/products/:id/compliance', handler: (url) => {
    const p = matchParams('/api/v1/products/:id/compliance', url)
    return ok({
      product_id: p?.id ?? '',
      checks: [{
        check_id: 'check-001', product_name: 'Test Product', target_market: 'EU',
        session_id: 'sess-001', timestamp: new Date().toISOString(),
        result: { passed: true, score: 92 },
      }],
    })
  }},
  { method: 'DELETE', pattern: '/api/v1/products/:id/compliance/:checkId', handler: () => ok({ success: true }) },

  // ── Product Todos ──
  { method: 'GET', pattern: '/api/v1/products/:id/todos', handler: (url) => {
    const p = matchParams('/api/v1/products/:id/todos', url)
    return ok(MOCK.mockProductTodos(p?.id ?? ''))
  }},
  { method: 'POST', pattern: '/api/v1/products/:id/todos', handler: (url) => {
    const p = matchParams('/api/v1/products/:id/todos', url)
    return ok({ id: 'new-todo', product_id: p?.id ?? '', title: 'New', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  }},
  { method: 'PUT', pattern: '/api/v1/products/:id/todos/:todoId', handler: () => ok({ id: 'todo', status: 'completed' }) },
  { method: 'POST', pattern: '/api/v1/products/:id/todos/:todoId/execute', handler: () => ok({ success: true, status: 'completed', result_summary: 'Mock execution done' }) },
  { method: 'DELETE', pattern: '/api/v1/products/:id/todos/:todoId', handler: () => ok({ success: true }) },

  // ── Risk Alerts ──
  { method: 'GET', pattern: '/api/v1/risk/alerts', handler: () => ok({ alerts: MOCK.MOCK_RISK_ALERTS, page: 1, size: 10 }) },
  { method: 'GET', pattern: '/api/v1/risk/alerts/unread-count', handler: () => ok({ unread_count: 2 }) },
  { method: 'POST', pattern: '/api/v1/risk/alerts/:id/dismiss', handler: () => ok({ status: 'dismissed', alert_id: 'alert-001' }) },
  { method: 'DELETE', pattern: '/api/v1/risk/alerts/:id', handler: () => ok({ status: 'deleted' }) },
  { method: 'GET', pattern: '/api/v1/risk/market-status', handler: () => ok(MOCK.MOCK_MARKET_STATUS) },
  { method: 'POST', pattern: '/api/v1/risk/scan', handler: () => ok({ status: 'completed', alerts_created: 1, events_found: 3 }) },

  // ── Metrics ──
  { method: 'GET', pattern: '/api/v1/metrics/dashboard', handler: () => ok(MOCK.MOCK_METRICS_DASHBOARD) },
  { method: 'GET', pattern: '/api/v1/metrics/builtin_templates', handler: () => ok(MOCK.MOCK_BUILTIN_TEMPLATES) },
  { method: 'PUT', pattern: '/api/v1/metrics/builtin/:key', handler: () => ok({ key: 'test', name: 'Test', threshold_warning: 0.8, threshold_critical: 0.6, customized: true }) },
  { method: 'DELETE', pattern: '/api/v1/metrics/builtin/:key/override', handler: () => ok({ key: 'test', reset: true }) },
  { method: 'GET', pattern: '/api/v1/metrics/custom', handler: () => ok({ metrics: [] }) },
  { method: 'POST', pattern: '/api/v1/metrics/custom', handler: () => ok({ id: 'new', key: 'test', name: 'Test', status: 'normal' }) },
  { method: 'PUT', pattern: '/api/v1/metrics/custom/:id', handler: () => ok({ id: 'updated', key: 'test', name: 'Updated', status: 'normal' }) },
  { method: 'DELETE', pattern: '/api/v1/metrics/custom/:id', handler: () => ok({ deleted: 'test' }) },

  // ── Pipeline ──
  { method: 'GET', pattern: '/api/v1/pipeline/health', handler: () => ok(MOCK.MOCK_PIPELINE_HEALTH) },

  // ── Integrations ──
  { method: 'GET', pattern: '/api/v1/integrations/providers', handler: () => ok(MOCK.MOCK_INTEGRATION_PROVIDERS) },
  { method: 'GET', pattern: '/api/v1/integrations/status', handler: () => ok(MOCK.MOCK_INTEGRATIONS_STATUS) },
  { method: 'GET', pattern: '/api/v1/integrations', handler: () => ok(MOCK.MOCK_INTEGRATIONS) },
  { method: 'POST', pattern: '/api/v1/integrations', handler: () => ok({ id: 'new-int', provider: 'test', label: 'Test', status: 'connected' }) },
  { method: 'PUT', pattern: '/api/v1/integrations/:id/config', handler: () => ok({ id: 'int-001', status: 'connected' }) },
  { method: 'POST', pattern: '/api/v1/integrations/:id/test', handler: () => ok({ ok: true, status: 'connected', message: 'Connection OK' }) },
  { method: 'POST', pattern: '/api/v1/integrations/:id/sync', handler: () => ok({ ok: true, status: 'synced', synced: 12, errors: 0 }) },
  { method: 'DELETE', pattern: '/api/v1/integrations/:id', handler: () => ok({ status: 'deleted', connection_id: 'test' }) },

  // ── Shopify ──
  { method: 'GET', pattern: '/api/v1/shopify/auth', handler: () => ok({ authorization_url: 'https://example.com/auth', shop: 'demo.myshopify.com', state: 'mock-state' }) },
  { method: 'GET', pattern: '/api/v1/shopify/shops', handler: () => ok(MOCK.MOCK_SHOPIFY_SHOPS) },
  { method: 'GET', pattern: '/api/v1/shopify/:shop/products', handler: () => ok([{ shopify_id: 1, title: 'Demo Product', handle: 'demo-product', product_type: 'Electronics', vendor: 'Demo Vendor', variants: [{ id: 1, title: 'Default', price: '29.99', sku: 'DEMO-001', requires_shipping: true }], tags: ['demo'], body_html: '<p>Demo</p>' }]) },
  { method: 'POST', pattern: '/api/v1/shopify/:shop/check/:productId', handler: () => ok({ message: '合规检查完成', compliance_result: { passed: true }, session_id: 'mock-session' }) },

  // ── Knowledge ──
  { method: 'GET', pattern: '/api/v1/knowledge/docs', handler: () => ok(MOCK.MOCK_KNOWLEDGE_DOCS) },
  { method: 'GET', pattern: '/api/v1/knowledge/stats', handler: () => ok(MOCK.MOCK_KNOWLEDGE_STATS) },
  { method: 'POST', pattern: '/api/v1/knowledge/upload', handler: () => ok({ doc_id: 'new-doc', status: 'indexing', message: 'Uploaded' }) },
  { method: 'POST', pattern: '/api/v1/knowledge/url', handler: () => ok({ doc_id: 'new-doc', status: 'indexing', message: 'Accepted' }) },
  { method: 'POST', pattern: '/api/v1/knowledge/search', handler: () => ok({ query: 'test', count: 0, results: [] }) },
  { method: 'DELETE', pattern: '/api/v1/knowledge/docs/:docId', handler: () => ok({ ok: true, doc_id: 'doc-001' }) },

  // ── News Monitor ──
  { method: 'GET', pattern: '/api/v1/news-monitor/news', handler: () => ok(MOCK.MOCK_NEWS) },
  { method: 'GET', pattern: '/api/v1/news-monitor/summary', handler: () => ok(MOCK.MOCK_NEWS_SUMMARY) },
  { method: 'POST', pattern: '/api/v1/news-monitor/collect', handler: () => ok({ status: 'completed', message: 'Collected 5 news items' }) },
  { method: 'GET', pattern: '/api/v1/news-monitor/keywords', handler: () => ok(MOCK.MOCK_NEWS_KEYWORDS) },
  { method: 'PUT', pattern: '/api/v1/news-monitor/keywords', handler: () => ok({ ok: true, ...MOCK.MOCK_NEWS_KEYWORDS }) },

  // ── Notifications ──
  { method: 'GET', pattern: '/api/v1/notifications/unread-count', handler: () => ok({ count: 2 }) },
  { method: 'GET', pattern: '/api/v1/notifications', handler: () => ok(MOCK.MOCK_NOTIFICATIONS) },
  { method: 'PUT', pattern: '/api/v1/notifications/:id/read', handler: () => ok({ ok: true }) },
  { method: 'PUT', pattern: '/api/v1/notifications/read-all', handler: () => ok({ ok: true }) },
  { method: 'DELETE', pattern: '/api/v1/notifications/:id', handler: () => ok({ ok: true }) },
  { method: 'DELETE', pattern: '/api/v1/notifications', handler: () => ok({ ok: true }) },

  // ── Channels ──
  { method: 'GET', pattern: '/api/v1/channels', handler: () => ok(MOCK.MOCK_CHANNELS) },
  { method: 'POST', pattern: '/api/v1/channels', handler: () => ok({ name: 'new', channel_type: 'webhook', status: 'active' }) },
  { method: 'PUT', pattern: '/api/v1/channels/:name', handler: () => ok({ name: 'test', channel_type: 'webhook', status: 'active' }) },
  { method: 'DELETE', pattern: '/api/v1/channels/:name', handler: () => ok({ status: 'deleted', name: 'test' }) },
  { method: 'POST', pattern: '/api/v1/channels/send', handler: () => ok({ channel: 'test', status: 'sent' }) },

  // ── Agents ──
  { method: 'GET', pattern: '/api/v1/agents/:id/status', handler: () => ok({ agent_id: 'agent-general', name: '通用合规助手', enabled: true, associated_skills: [], associated_tools: [], associated_oauth: [], status: 'active' }) },
  { method: 'GET', pattern: '/api/v1/agents/:id/skills', handler: () => ok({ agent_id: 'agent-general', skill_ids: ['web-search', 'summarize'] }) },
  { method: 'PUT', pattern: '/api/v1/agents/:id/skills', handler: () => ok({ agent_id: 'agent-general', skill_ids: ['web-search'] }) },
  { method: 'GET', pattern: '/api/v1/agents/:id/tools', handler: () => ok({ agent_id: 'agent-general', tool_ids: ['tool-compliance'] }) },
  { method: 'PUT', pattern: '/api/v1/agents/:id/tools', handler: () => ok({ agent_id: 'agent-general', tool_ids: ['tool-compliance'] }) },
  { method: 'GET', pattern: '/api/v1/agents/:id/oauth', handler: () => ok({ agent_id: 'agent-general', connection_ids: [] }) },
  { method: 'PUT', pattern: '/api/v1/agents/:id/oauth', handler: () => ok({ agent_id: 'agent-general', connection_ids: [] }) },
  { method: 'PUT', pattern: '/api/v1/agents/:id/toggle', handler: () => ok({ ok: true, enabled: true }) },
  { method: 'GET', pattern: '/api/v1/agents/:id', handler: (url) => {
    const p = matchParams('/api/v1/agents/:id', url)
    const agent = MOCK.MOCK_AGENTS.find(a => a.id === p?.id)
    return agent ? ok({ ...agent, system_prompt: '系统提示词内容...' }) : notFound()
  }},
  { method: 'PUT', pattern: '/api/v1/agents/:id', handler: () => ok({ id: 'agent-general', name: 'Updated', enabled: true }) },
  { method: 'DELETE', pattern: '/api/v1/agents/:id', handler: () => ok({ ok: true }) },
  { method: 'GET', pattern: '/api/v1/agents', handler: () => ok(MOCK.MOCK_AGENTS) },
  { method: 'POST', pattern: '/api/v1/agents', handler: () => ok({ id: 'new-agent', name: 'New Agent', enabled: true }) },

  // ── Skills ──
  { method: 'GET', pattern: '/api/v1/skills', handler: () => ok(MOCK.MOCK_SKILLS) },
  { method: 'POST', pattern: '/api/v1/skills/install', handler: () => ok({ name: 'new-skill', status: 'installed' }) },
  { method: 'DELETE', pattern: '/api/v1/skills/:id', handler: () => ok({ status: 'deleted', skill_id: 'test' }) },
  { method: 'POST', pattern: '/api/v1/skills/:id/toggle', handler: () => ok({ name: 'test', status: 'disabled' }) },

  // ── Tools ──
  { method: 'GET', pattern: '/api/v1/tools', handler: () => ok(MOCK.MOCK_TOOLS) },
  { method: 'GET', pattern: '/api/v1/tools/:name', handler: () => ok(MOCK.MOCK_TOOLS.tools[0]!) },

  // ── MCP Servers ──
  { method: 'GET', pattern: '/api/v1/mcp-servers', handler: () => ok(MOCK.MOCK_MCP_SERVERS) },
  { method: 'POST', pattern: '/api/v1/mcp-servers', handler: () => ok(MOCK.MOCK_MCP_SERVERS.servers[0]!) },
  { method: 'PUT', pattern: '/api/v1/mcp-servers/:name', handler: () => ok(MOCK.MOCK_MCP_SERVERS.servers[0]!) },
  { method: 'DELETE', pattern: '/api/v1/mcp-servers/:name', handler: () => ok({ deleted: 'test' }) },
  { method: 'PUT', pattern: '/api/v1/mcp-servers/:name/toggle', handler: () => ok({ name: 'test', enabled: true }) },

  // ── Orders ──
  { method: 'GET', pattern: '/api/v1/orders', handler: () => ok(MOCK.MOCK_ORDERS) },
  { method: 'POST', pattern: '/api/v1/orders', handler: () => ok(MOCK.MOCK_ORDERS[0]!) },
  { method: 'GET', pattern: '/api/v1/orders/:id', handler: (url) => {
    const p = matchParams('/api/v1/orders/:id', url)
    const order = MOCK.MOCK_ORDERS.find(o => o.id === p?.id) ?? MOCK.MOCK_ORDERS[0]
    return ok(order)
  }},
  { method: 'GET', pattern: '/api/v1/orders/:id/payments', handler: () => ok({ payments: [], summary: { total_paid: 0, total_refunded: 0, count: 0 } }) },
  { method: 'POST', pattern: '/api/v1/orders/:id/payments', handler: () => ok({ id: 'pay-new', status: 'paid', amount: 100 }) },
  { method: 'GET', pattern: '/api/v1/orders/:id/consistency-check', handler: () => ok({ passed: true, checks: [], summary: 'All checks passed' }) },

  // ── Scheduler (bindings + tasks 模板) ──
  { method: 'GET', pattern: '/api/v1/scheduler/tasks', handler: () => ok({ tasks: [] }) },
  { method: 'GET', pattern: '/api/v1/scheduler/bindings', handler: () => ok({ bindings: {} }) },
  { method: 'PUT', pattern: '/api/v1/scheduler/bindings/:name', handler: () => ok({ ok: true }) },

  // ── Scheduled Tasks ──
  { method: 'GET', pattern: '/api/v1/scheduled-tasks', handler: () => ok(MOCK.MOCK_SCHEDULED_TASKS) },
  { method: 'POST', pattern: '/api/v1/scheduled-tasks', handler: () => ok({ ...MOCK.MOCK_SCHEDULED_TASKS[0]!, id: 'new-task' }) },
  { method: 'PATCH', pattern: '/api/v1/scheduled-tasks/:id', handler: () => ok(MOCK.MOCK_SCHEDULED_TASKS[0]!) },
  { method: 'DELETE', pattern: '/api/v1/scheduled-tasks/:id', handler: () => ok({ id: 'test', deleted: true }) },
  { method: 'POST', pattern: '/api/v1/scheduled-tasks/:id/pause', handler: () => ok({ ...MOCK.MOCK_SCHEDULED_TASKS[0]!, status: 'paused' }) },
  { method: 'POST', pattern: '/api/v1/scheduled-tasks/:id/resume', handler: () => ok({ ...MOCK.MOCK_SCHEDULED_TASKS[0]!, status: 'enabled' }) },
  { method: 'POST', pattern: '/api/v1/scheduled-tasks/:id/trigger', handler: () => ok({ id: 'test', triggered: true, run_id: 'run-new' }) },
  { method: 'GET', pattern: '/api/v1/scheduled-tasks/:id/runs', handler: () => ok([{ id: 'run-001', task_id: 'task-001', trigger: 'scheduled', status: 'success', error: null, response_preview: 'Done', scheduled_for: null, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), created_at: new Date().toISOString() }]) },

  // ── NL Store ──
  { method: 'GET', pattern: '/api/v1/nl-store/namespaces', handler: () => ok(MOCK.MOCK_NL_NAMESPACES) },
  { method: 'GET', pattern: '/api/v1/nl-store/search', handler: () => ok(MOCK.MOCK_NL_STORE.map(r => ({ ...r, content_preview: 'Preview...', score: 0.9 }))) },
  { method: 'GET', pattern: '/api/v1/nl-store/:namespace', handler: () => ok(MOCK.MOCK_NL_STORE) },
  { method: 'GET', pattern: '/api/v1/nl-store/:namespace/:key', handler: () => ok({ record_id: 'r1', namespace: 'test', key: 'test', title: 'Test', content_nl: 'Content', metadata: {}, tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  { method: 'POST', pattern: '/api/v1/nl-store/:namespace', handler: () => ok({ record_id: 'new', namespace: 'test', key: 'new', title: 'New', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  { method: 'PUT', pattern: '/api/v1/nl-store/:namespace/:key', handler: () => ok({ record_id: 'updated' }) },
  { method: 'DELETE', pattern: '/api/v1/nl-store/:namespace/:key', handler: () => ok(null) },
  { method: 'GET', pattern: '/api/v1/nl-store', handler: () => ok(MOCK.MOCK_NL_STORE) },

  // ── Chains ──
  { method: 'GET', pattern: '/api/v1/chains/actions', handler: () => ok(MOCK.MOCK_ACTION_CHAINS) },
  { method: 'GET', pattern: '/api/v1/chains/actions/:chainId', handler: () => ok({ chain_id: 'chain-001', total_actions: 4, status: 'completed', actions: [], trail: ['Step 1', 'Step 2'] }) },
  { method: 'GET', pattern: '/api/v1/chains/actions/:chainId/trail', handler: () => ok(['Step 1', 'Step 2', 'Step 3', 'Step 4']) },
  { method: 'GET', pattern: '/api/v1/chains/events', handler: () => ok(MOCK.MOCK_EVENT_CHAINS) },
  { method: 'GET', pattern: '/api/v1/chains/events/:chainId', handler: () => ok({ chain_id: 'echain-001', total_events: 5, events: [], timeline: ['Event 1', 'Event 2'] }) },
  { method: 'GET', pattern: '/api/v1/chains/events/:chainId/timeline', handler: () => ok(['Event 1', 'Event 2', 'Event 3']) },
  { method: 'GET', pattern: '/api/v1/chains/events/:chainId/filter', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/chains/events', handler: (_url, init) => {
    try { return ok(JSON.parse(init?.body as string ?? '{}')) } catch { return ok({}) }
  }},

  // ── Model Configs ──
  { method: 'GET', pattern: '/api/v1/model-configs', handler: () => ok(MOCK.MOCK_MODEL_CONFIGS) },
  { method: 'POST', pattern: '/api/v1/model-configs', handler: () => ok({ ok: true, role: 'default' }) },
  { method: 'PUT', pattern: '/api/v1/model-configs/:role', handler: () => ok({ ok: true, role: 'default' }) },
  { method: 'DELETE', pattern: '/api/v1/model-configs/:role', handler: () => ok({ ok: true, role: 'default' }) },
  { method: 'GET', pattern: '/api/v1/model-configs/usage', handler: () => ok(MOCK.MOCK_MODEL_USAGE) },

  // ── Proactive ──
  { method: 'GET', pattern: '/api/v1/proactive/brief', handler: () => ok(MOCK.MOCK_BRIEFS) },

  // ── CLI ──
  { method: 'POST', pattern: '/api/v1/cli/execute', handler: () => ok({ success: true, output: 'Command executed (mock)', command: 'mock', duration_ms: 12 }) },
  { method: 'GET', pattern: '/api/v1/cli/complete', handler: () => ok({ suggestions: [], prefix: '' }) },
  { method: 'GET', pattern: '/api/v1/cli/history', handler: () => ok({ history: [] }) },

  // ── Risk Intel ──
  { method: 'GET', pattern: '/api/v1/risk-intel/feed', handler: () => ok(MOCK.MOCK_RISK_INTEL_FEED) },
  { method: 'GET', pattern: '/api/v1/risk-intel/heatmap', handler: () => ok(MOCK.MOCK_RISK_INTEL_HEATMAP) },
  { method: 'GET', pattern: '/api/v1/risk-intel/keywords', handler: () => ok(MOCK.MOCK_RISK_INTEL_KEYWORDS) },
  { method: 'POST', pattern: '/api/v1/risk-intel/keywords', handler: () => ok(MOCK.MOCK_RISK_INTEL_KEYWORDS[0]!) },
  { method: 'GET', pattern: '/api/v1/risk-intel/runs', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/risk-intel/search', handler: () => ok({ run_id: 'run-001', keyword: 'test', total_found: 3, items_new: 1, alerts_triggered: 1, items: MOCK.MOCK_RISK_INTEL_FEED.items }) },
  { method: 'POST', pattern: '/api/v1/risk-intel/keywords/suggest', handler: () => ok({ suggestions: [] }) },
  { method: 'POST', pattern: '/api/v1/risk-intel/keywords/:id/run', handler: () => ok({ run_id: 'run-new', keyword: 'test', status: 'done' }) },
  { method: 'PUT', pattern: '/api/v1/risk-intel/keywords/:id', handler: () => ok(MOCK.MOCK_RISK_INTEL_KEYWORDS[0]!) },
  { method: 'DELETE', pattern: '/api/v1/risk-intel/keywords/:id', handler: () => ok({ deleted: 'test' }) },
  { method: 'GET', pattern: '/api/v1/risk-intel/analyze/status', handler: () => ok({ total: 1, done: 1, pending: 0, errors: 0 }) },
  { method: 'POST', pattern: '/api/v1/risk-intel/analyze/trigger', handler: () => ok({ status: 'started', batch_size: 20, queue_before: 0 }) },

  // ── Auth (already guarded in AuthContext, but health check via API) ──
  { method: 'GET', pattern: '/api/v1/auth/me', handler: () => ok({ user_id: 'demo-user', username: 'admin', role: 'admin' }) },
  { method: 'POST', pattern: '/api/v1/auth/login', handler: () => ok({ user_id: 'demo-user', username: 'admin', role: 'admin' }) },
  { method: 'POST', pattern: '/api/v1/auth/logout', handler: () => ok({ ok: true }) },
  { method: 'POST', pattern: '/api/v1/auth/signup', handler: () => ok({ user_id: 'new-user', username: 'newuser', role: 'user' }) },
  { method: 'PUT', pattern: '/api/v1/auth/me/password', handler: () => ok({ ok: true, message: 'Password changed' }) },

  // ── Users ──
  { method: 'GET', pattern: '/api/v1/users', handler: () => ok(MOCK.MOCK_USERS) },
  { method: 'POST', pattern: '/api/v1/users', handler: () => ok({ id: 'new-user', username: 'new', role: 'user', created_at: new Date().toISOString() }) },
  { method: 'PUT', pattern: '/api/v1/users/:id', handler: () => ok({ id: 'test', username: 'updated', role: 'user' }) },
  { method: 'DELETE', pattern: '/api/v1/users/:id', handler: () => ok({ ok: true }) },

  // ── Sessions ──
  { method: 'GET', pattern: '/api/v1/sessions', handler: () => ok([]) },
  { method: 'GET', pattern: '/api/v1/sessions/:id', handler: () => ok({ id: 'sess-001', title: 'Mock Session', messages: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 0, preview: '' }) },
  { method: 'DELETE', pattern: '/api/v1/sessions/:id', handler: () => ok({ ok: true }) },
  { method: 'POST', pattern: '/api/v1/chat', handler: () => ok({ message: 'Mock response', session_id: 'sess-mock' }) },

  // ── Health ──
  { method: 'GET', pattern: '/api/v1/health', handler: () => ok({ status: 'ok', service: 'mock', version: 'demo' }) },
  { method: 'GET', pattern: '/api/v1/system/health', handler: () => ok({ status: 'ok', checks: {}, overall: 'healthy', timestamp: new Date().toISOString() }) },

  // ── Logistics ──
  { method: 'GET', pattern: '/api/v1/logistics/carriers', handler: () => ok([{ id: 'carrier-001', name: 'DHL Express', code: 'dhl' }, { id: 'carrier-002', name: 'FedEx', code: 'fedex' }]) },
  { method: 'GET', pattern: '/api/v1/logistics/shipments', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/logistics/shipments', handler: () => ok({ id: 'ship-new', carrier: 'DHL', status: 'created' }) },
  { method: 'GET', pattern: '/api/v1/logistics/shipments/:id', handler: () => ok({ id: 'ship-001', carrier: 'DHL', status: 'in_transit', tracking_number: 'TRK123456' }) },
  { method: 'GET', pattern: '/api/v1/logistics/shipments/:id/tracking', handler: () => ok({ events: [] }) },
  { method: 'POST', pattern: '/api/v1/logistics/shipments/:id/refresh', handler: () => ok({ ok: true }) },

  // ── Customs ──
  { method: 'GET', pattern: '/api/v1/customs/declarations', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/customs/declarations', handler: () => ok({ id: 'customs-new', status: 'draft' }) },
  { method: 'GET', pattern: '/api/v1/customs/declarations/:id', handler: () => ok({ id: 'customs-001', status: 'draft' }) },
  { method: 'POST', pattern: '/api/v1/customs/declarations/:id/submit', handler: () => ok({ id: 'customs-001', status: 'submitted' }) },
  { method: 'POST', pattern: '/api/v1/customs/declarations/:id/check', handler: () => ok({ passed: true, issues: [] }) },
  { method: 'POST', pattern: '/api/v1/customs/duty-calculator', handler: () => ok({ hs_code: '8518.30', dest_country: 'DE', declared_value: 100, currency: 'USD', duty_rate_pct: 4.5, calculated_duty: 4.5, ioss_applicable: true, ioss_tip: 'IOSS registration recommended' }) },
  { method: 'GET', pattern: '/api/v1/customs/tariff-rates', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/customs/declarations/:id/clear', handler: () => ok({ id: 'customs-001', status: 'cleared' }) },
  { method: 'POST', pattern: '/api/v1/customs/declarations/:id/exception', handler: () => ok({ id: 'customs-001', status: 'exception' }) },
  { method: 'GET', pattern: '/api/v1/customs/controlled-goods/check', handler: () => ok({ is_controlled: false, restrictions: [] }) },
  { method: 'POST', pattern: '/api/v1/customs/three-way-check', handler: () => ok({ passed: true, checks: [] }) },

  // ── Suppliers ──
  { method: 'GET', pattern: '/api/v1/suppliers', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/suppliers', handler: () => ok({ id: 'sup-new', name: 'New Supplier' }) },
  { method: 'GET', pattern: '/api/v1/suppliers/:id', handler: () => ok({ id: 'sup-001', name: 'Test Supplier' }) },
  { method: 'PUT', pattern: '/api/v1/suppliers/:id', handler: () => ok({ id: 'sup-001', name: 'Updated Supplier' }) },
  { method: 'POST', pattern: '/api/v1/suppliers/:id/verify', handler: () => ok({ status: 'verified', message: 'OK' }) },
  { method: 'POST', pattern: '/api/v1/suppliers/:id/rate', handler: () => ok({ ok: true }) },
  { method: 'GET', pattern: '/api/v1/suppliers/:id/products', handler: () => ok({ products: [], total: 0 }) },
  { method: 'GET', pattern: '/api/v1/suppliers/:id/risk-assessment', handler: () => ok({ risk_level: 'low', score: 85 }) },

  // ── Contracts ──
  { method: 'GET', pattern: '/api/v1/contracts/templates', handler: () => ok([]) },
  { method: 'GET', pattern: '/api/v1/contracts', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/contracts/generate', handler: () => ok({ id: 'contract-new', title: 'New Contract', status: 'draft' }) },
  { method: 'GET', pattern: '/api/v1/contracts/:id', handler: () => ok({ id: 'contract-001', title: 'Test Contract', status: 'draft' }) },
  { method: 'POST', pattern: '/api/v1/contracts/:id/review', handler: () => ok({ status: 'reviewed', message: 'OK' }) },
  { method: 'POST', pattern: '/api/v1/contracts/:id/sign', handler: () => ok({ id: 'contract-001', status: 'signed' }) },

  // ── Payment Channels ──
  { method: 'GET', pattern: '/api/v1/payment-channels', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/v1/payment-channels', handler: () => ok({ id: 'pc-new', provider: 'stripe', status: 'active' }) },

  // ── OAuth ──
  { method: 'POST', pattern: '/api/v1/oauth/:id/test', handler: () => ok({ ok: true, message: 'OK' }) },

  // ── Browser ──
  { method: 'GET', pattern: '/api/v1/browser', handler: () => ok({ status: 'ok' }) },
]

// ── Fallback catch-all ──────────────────────────────────────────────────────

function matches(pattern: string, path: string): boolean {
  return matchParams(pattern, path) !== null
}

/**
 * Intercept a fetchWithAuth call in mock mode.
 * Returns a mock Response, or null to fall through to real fetch.
 */
export function interceptFetchWithAuth(url: string, init?: RequestInit): Response | null {
  const method = (init?.method || 'GET').toUpperCase()
  const path = extractPath(url)

  for (const route of routes) {
    if (route.method === method && matches(route.pattern, path)) {
      try {
        const result = route.handler(path, init)
        return result as Response
      } catch {
        return notFound()
      }
    }
  }

  // No match — return 200 with empty object to avoid crashing callers
  return ok({})
}

function extractPath(url: string): string {
  try {
    const u = new URL(url, 'http://localhost')
    return u.pathname
  } catch {
    return url
  }
}
