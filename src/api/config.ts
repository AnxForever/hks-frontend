/**
 * 配置中心 API 客户端层
 *
 * 统一封装所有配置管理相关的后端 API 调用。
 * 每个函数返回 Promise<T>，调用方通过 try/catch 处理错误。
 */

const API = '/api/v1'

// ── 通用工具 ─────────────────────────────────────────────────────────────────

import { fetchWithAuth } from './http'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    },
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`)
  }
  return res.json()
}

// ── Agent 配置 API ───────────────────────────────────────────────────────────

export interface AgentListItem {
  id: string
  name: string
  type: string
  description: string
  system_prompt_preview: string
  enabled: boolean
  sort_order: number
  sdk_config: SDKAgentConfig
  created_at: number
  updated_at: number
}

export interface AgentDetail extends AgentListItem {
  system_prompt: string
}

export interface SDKAgentConfig {
  enabled?: boolean
  model?: string | null
  max_turns?: number | null
  permission_mode?: string | null
  allowed_tools?: string[] | null
  disallowed_tools?: string[] | null
  include_hook_events?: boolean | null
  skills?: string[] | null
  agents?: Record<string, unknown> | null
}

export interface AgentUpsertRequest {
  name: string
  type: string
  description?: string
  system_prompt: string
  enabled?: boolean
  sort_order?: number
  sdk_config?: SDKAgentConfig
}

export const agentsApi = {
  list: () => request<AgentListItem[]>(`${API}/agents`),

  get: (id: string) => request<AgentDetail>(`${API}/agents/${id}`),

  create: (data: AgentUpsertRequest) =>
    request<AgentDetail>(`${API}/agents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: AgentUpsertRequest) =>
    request<AgentDetail>(`${API}/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`${API}/agents/${id}`, { method: 'DELETE' }),

  toggle: (id: string, enabled: boolean) =>
    request<{ ok: boolean; enabled: boolean }>(`${API}/agents/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  getSkills: (agentId: string) =>
    request<{ agent_id: string; skill_ids: string[] }>(`${API}/agents/${agentId}/skills`),

  setSkills: (agentId: string, skillIds: string[]) =>
    request<{ agent_id: string; skill_ids: string[] }>(`${API}/agents/${agentId}/skills`, {
      method: 'PUT',
      body: JSON.stringify({ skill_ids: skillIds }),
    }),

  getTools: (agentId: string) =>
    request<{ agent_id: string; tool_ids: string[] }>(`${API}/agents/${agentId}/tools`),

  setTools: (agentId: string, toolIds: string[]) =>
    request<{ agent_id: string; tool_ids: string[] }>(`${API}/agents/${agentId}/tools`, {
      method: 'PUT',
      body: JSON.stringify({ tool_ids: toolIds }),
    }),

  getOAuth: (agentId: string) =>
    request<{ agent_id: string; connection_ids: string[] }>(`${API}/agents/${agentId}/oauth`),

  setOAuth: (agentId: string, connectionIds: string[]) =>
    request<{ agent_id: string; connection_ids: string[] }>(`${API}/agents/${agentId}/oauth`, {
      method: 'PUT',
      body: JSON.stringify({ connection_ids: connectionIds }),
    }),

  getStatus: (agentId: string) =>
    request<{
      agent_id: string
      name: string
      enabled: boolean
      associated_skills: string[]
      associated_tools: string[]
      associated_oauth: string[]
      status: string
    }>(`${API}/agents/${agentId}/status`),
}

// ── Skills 配置 API ──────────────────────────────────────────────────────────

export interface SkillItem {
  name: string
  description?: string
  category?: string
  mode?: string
  status: string  // 'enabled' | 'disabled' | 'installed' | 'pending_review' | 'blocked'
  source?: string
  source_url?: string
  version?: string
  script_path?: string
  metadata?: Record<string, unknown>
}

export const skillsApi = {
  list: (params?: { status?: string; stage?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.stage !== undefined) query.set('stage', String(params.stage))
    const qs = query.toString()
    return request<{ skills: SkillItem[] }>(`${API}/skills${qs ? '?' + qs : ''}`)
  },

  install: (data: { name: string; source?: string; source_url?: string; config?: Record<string, unknown> }) =>
    request<SkillItem>(`${API}/skills/install`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { config?: Record<string, unknown> }) =>
    request<{ ok: boolean }>(`${API}/skills/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ status: string; skill_id: string }>(`${API}/skills/${id}`, { method: 'DELETE' }),

  refresh: (id: string) =>
    request<{ status: string; skill_id: string }>(`${API}/skills/${id}/refresh`, { method: 'POST' }),

  toggle: (id: string) =>
    request<{ name: string; status: string }>(`${API}/skills/${id}/toggle`, { method: 'POST' }),
}

// ── Tools 配置 API（系统工具只读 + MCP server 可配置）─────────────────────────

export interface ToolItem {
  id: string
  name: string
  display_name?: string   // 中文展示名（后端 ToolRegistry 提供，缺省回退到 name）
  description?: string
  tool_type?: string
  category?: string
  permission?: string
  tags?: string[]
  source?: string        // 'system' = 系统自有工具（只读）
  editable?: boolean
  enabled: boolean
}

/** 系统工具只读列表（数据源：后端 ToolRegistry；用户无编辑/新建入口）。 */
export const toolsApi = {
  list: (params?: { category?: string }) => {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    const qs = query.toString()
    return request<{ tools: ToolItem[]; total: number }>(`${API}/tools${qs ? '?' + qs : ''}`)
  },

  get: (name: string) => request<ToolItem>(`${API}/tools/${encodeURIComponent(name)}`),
}

// ── MCP Server 配置 API（复用统一 extensions_config.mcpServers）────────────────

export interface McpServerItem {
  name: string
  type: 'stdio' | 'sse' | 'http'
  command?: string | null
  args?: string[]
  url?: string | null
  env?: Record<string, string>
  headers?: Record<string, string>
  description?: string
  enabled: boolean
  source?: string        // 'mcp'
  editable?: boolean
}

export interface McpServerPayload {
  name: string
  type?: 'stdio' | 'sse' | 'http'
  command?: string | null
  args?: string[]
  url?: string | null
  env?: Record<string, string>
  headers?: Record<string, string>
  description?: string
  enabled?: boolean
}

export const mcpServersApi = {
  list: () => request<{ servers: McpServerItem[]; total: number }>(`${API}/mcp-servers`),

  create: (data: McpServerPayload) =>
    request<McpServerItem>(`${API}/mcp-servers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (name: string, data: Omit<McpServerPayload, 'name'>) =>
    request<McpServerItem>(`${API}/mcp-servers/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (name: string) =>
    request<{ deleted: string }>(`${API}/mcp-servers/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  toggle: (name: string) =>
    request<{ name: string; enabled: boolean }>(`${API}/mcp-servers/${encodeURIComponent(name)}/toggle`, {
      method: 'PUT',
    }),
}

// ── OAuth / 集成配置 API ─────────────────────────────────────────────────────

export interface OAuthConnection {
  id: string
  provider: string
  label: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  config?: Record<string, unknown>
  token?: { access_token?: string }
  last_error?: string
  created_at?: string
  updated_at?: string
}

export const oauthApi = {
  list: (provider?: string) => {
    const query = provider ? `?provider=${provider}` : ''
    return request<{ connections: OAuthConnection[] }>(`${API}/integrations${query}`)
  },

  getProviders: () =>
    request<{ providers: Array<{ provider: string; name: string; icon?: string; config_fields?: string[] }> }>(
      `${API}/integrations/providers`
    ),

  getStatusSummary: () =>
    request<{ status: Record<string, { name: string; icon?: string; status: string; connected: number; total_connections: number }> }>(
      `${API}/integrations/status`
    ),

  create: (data: { provider: string; label?: string; config?: Record<string, unknown> }) =>
    request<OAuthConnection>(`${API}/integrations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateConfig: (id: string, config: Record<string, unknown>) =>
    request<OAuthConnection>(`${API}/integrations/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    }),

  delete: (id: string) =>
    request<{ status: string; connection_id: string }>(`${API}/integrations/${id}`, { method: 'DELETE' }),

  test: (id: string) =>
    request<{ ok: boolean; status?: string; message?: string; error?: string }>(`${API}/integrations/${id}/test`, { method: 'POST' }),

  // OAuth 兼容别名
  testOAuth: (id: string) =>
    request<{ ok: boolean; message?: string }>(`${API}/oauth/${id}/test`, { method: 'POST' }),
}

// ── 模型配置 API ─────────────────────────────────────────────────────────────

export interface ModelConfigItem {
  role: string
  provider: string
  model: string
  api_key_env: string
  base_url?: string
  max_tokens: number
  temperature: number
  top_p?: number
}

export const modelConfigsApi = {
  list: () => request<{ configs: ModelConfigItem[] }>(`${API}/model-configs`),

  create: (data: {
    role: string
    provider: string
    model: string
    api_key_env?: string
    base_url?: string
    max_tokens?: number
    temperature?: number
    top_p?: number
  }) =>
    request<{ ok: boolean; role: string }>(`${API}/model-configs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (role: string, data: {
    role: string
    provider: string
    model: string
    api_key_env?: string
    base_url?: string
    max_tokens?: number
    temperature?: number
    top_p?: number
  }) =>
    request<{ ok: boolean; role: string }>(`${API}/model-configs/${role}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (role: string) =>
    request<{ ok: boolean; role: string }>(`${API}/model-configs/${role}`, { method: 'DELETE' }),

  getUsage: () =>
    request<{ total_tokens: number; by_model: Record<string, number>; routes: Record<string, string> }>(
      `${API}/model-configs/usage`
    ),
}

// ── 产品 API ─────────────────────────────────────────────────────────────────

// ── 产品类型 ─────────────────────────────────────────────────────────────────

export interface ProductItem {
  id: string
  name: string
  target_markets: string[]
  lifecycle_stage: string
  health_score?: number
  compliance_status: string
  certifications?: { name: string; status: string }[]
  hs_code?: string
  vendor?: string
  created_at?: string
  updated_at?: string
}

export interface ProductEvent {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const productsApi = {
  list: () => request<ProductItem[]>(`${API}/products`),
  get: (id: string) => request<ProductItem>(`${API}/products/${id}`),
  getEvents: (id: string) =>
    request<{ events: ProductEvent[]; total: number }>(`${API}/products/${id}/events`)
      .then(res => res.events),
}

// ── 流水线/合规 API ──────────────────────────────────────────────────────────

/** 后端返回的单阶段状态 */
export interface PipelineStageStatus {
  stage_number: number
  stage_name: string
  pass_rate: number        // 0.0~1.0
  total_products: number
  passed_products: number
  risk_products: number
  pending_actions: number
  status: string            // healthy/warning/critical/unknown
}

/** 后端返回的流水线健康度 */
export interface PipelineHealthResponse {
  overall_score: number
  stages: PipelineStageStatus[]
  last_updated: string
}

export const pipelineApi = {
  health: () => request<PipelineHealthResponse>(`${API}/pipeline/health`),
}

// ── 风险预警 API ──────────────────────────────────────────────────────────────

export interface RiskAlertItem {
  id: string
  alert_type: string
  severity: string
  title: string
  message: string
  created_at: string
  dismissed?: boolean
  affected_products?: string[]
}

export const riskAlertsApi = {
  list: (params?: { alert_type?: string; severity?: string; page?: number; size?: number }) => {
    const query = new URLSearchParams()
    if (params?.alert_type) query.set('alert_type', params.alert_type)
    if (params?.severity) query.set('severity', params.severity)
    if (params?.page) query.set('page', String(params.page))
    if (params?.size) query.set('size', String(params.size))
    const qs = query.toString()
    return request<{ alerts: RiskAlertItem[]; page: number; size: number }>(`${API}/risk/alerts${qs ? '?' + qs : ''}`)
  },

  dismiss: (alertId: string) =>
    request<{ status: string; alert_id: string }>(`${API}/risk/alerts/${alertId}/dismiss`, { method: 'POST' }),

  /** 获取各市场监控状态 */
  getMarketStatus: () =>
    request<{ last_scan: string; active_alerts: number; markets: { code: string; alerts: number }[] }>(
      `${API}/risk/market-status`
    ),

  /** 手动触发市场扫描 */
  triggerScan: () =>
    request<{ status: string; alerts_created: number; events_found: number }>(
      `${API}/risk/scan`,
      { method: 'POST' }
    ),
}

// ── 指标仪表盘 API ──────────────────────────────────────────────────────────

/** 单项专项指标（对齐后端 metrics.py _calc_specialized_metrics） */
export interface SpecializedMetric {
  value: number | null
  threshold: number | null
  status: 'normal' | 'warning' | 'critical' | 'no_data'
  trend: 'up' | 'down' | 'stable'
  no_data?: boolean
}

export interface MetricsDashboardResponse {
  total_products: number
  risk_distribution: { low: number; medium: number; high: number; critical: number }
  recent_alerts: RiskAlertItem[]
  active_markets: string[]
  health_score: number
  trend: { date: string; checks: number }[]
  metrics: Record<string, SpecializedMetric>
  custom_metrics?: Array<{
    key: string; name: string; formula: string; value: number
    threshold_warning: number; threshold_critical: number
    status: string; channels: string[]
  }>
}

/** 预设（内置）指标模板（对齐后端 proactive_models.BUILTIN_METRICS，合并用户覆盖后的阈值） */
export interface BuiltinMetricTemplate {
  name: string
  formula: string
  threshold_warning: number
  threshold_critical: number
  default_threshold_warning: number
  default_threshold_critical: number
  refresh: string
  customized: boolean
}

/** 用户自定义指标（对齐后端 CustomMetricCreate / custom_metrics.json） */
export interface CustomMetric {
  id: string
  name: string
  key: string
  scope: Record<string, unknown>
  formula: string
  threshold_warning: number
  threshold_critical: number
  notify_on_warning: boolean
  notify_on_critical: boolean
  channels: string[]
}

/** 创建/更新自定义指标请求体 */
export interface CustomMetricPayload {
  name: string
  key: string
  scope?: Record<string, unknown>
  formula?: string
  threshold_warning: number
  threshold_critical: number
  notify_on_warning?: boolean
  notify_on_critical?: boolean
  channels?: string[]
}

export const metricsApi = {
  /** 获取用户合规仪表盘（含 8 项专项指标配置：value/threshold/status/trend）；身份由后端会话解析 */
  getDashboard: () =>
    request<MetricsDashboardResponse>(`${API}/metrics/dashboard`),

  /** 获取预设指标模板（合并用户覆盖后的阈值） */
  getBuiltinTemplates: () =>
    request<{ templates: Record<string, BuiltinMetricTemplate> }>(`${API}/metrics/builtin_templates`),

  /** 修改预设指标阈值（用户覆盖，持久化） */
  updateBuiltinMetric: (key: string, payload: { threshold_warning: number; threshold_critical: number }) =>
    request<{ key: string; name: string; threshold_warning: number; threshold_critical: number; customized: boolean }>(
      `${API}/metrics/builtin/${encodeURIComponent(key)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    ),

  /** 重置预设指标阈值为默认值 */
  resetBuiltinMetric: (key: string) =>
    request<{ key: string; reset: boolean; message?: string }>(
      `${API}/metrics/builtin/${encodeURIComponent(key)}/override`,
      { method: 'DELETE' },
    ),

  /** 自定义指标列表 */
  listCustom: () => request<{ metrics: CustomMetric[] }>(`${API}/metrics/custom`),

  /** 创建自定义指标 */
  createCustom: (payload: CustomMetricPayload) =>
    request<CustomMetric>(`${API}/metrics/custom`, { method: 'POST', body: JSON.stringify(payload) }),

  /** 更新自定义指标 */
  updateCustom: (metricId: string, payload: CustomMetricPayload) =>
    request<CustomMetric>(`${API}/metrics/custom/${encodeURIComponent(metricId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** 删除自定义指标 */
  deleteCustom: (metricId: string) =>
    request<{ deleted: string }>(`${API}/metrics/custom/${encodeURIComponent(metricId)}`, { method: 'DELETE' }),
}

// ── 记忆树 API ───────────────────────────────────────────────────────────────

export const memoryApi = {
  listNamespaces: () => request<{ namespaces: string[] }>(`${API}/memory/namespaces`),
  listRecords: (ns: string) => request<{ records: unknown[] }>(`${API}/memory/${ns}`),
  getRecord: (ns: string, key: string) => request<unknown>(`${API}/memory/${ns}/${key}`),
}

// ── CLI 命令 API ──────────────────────────────────────────────────────────────

export interface CLICommand {
  cmd: string
  desc: string
  usage?: string
  category?: string
}

export interface CLIExecuteResponse {
  success: boolean
  output?: string
  command: string
  duration_ms?: number
  error?: string
}

export const cliApi = {
  /** 执行 CLI 命令 */
  execute: (command: string) =>
    request<CLIExecuteResponse>(`${API}/cli/execute`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),

  /** 自动补全建议 */
  complete: (prefix: string) =>
    request<{ suggestions: CLICommand[]; prefix: string }>(
      `${API}/cli/complete?prefix=${encodeURIComponent(prefix)}`
    ),

  /** 命令执行历史 */
  history: (limit?: number) =>
    request<{ history: CLIExecuteResponse[] }>(
      `${API}/cli/history${limit ? `?limit=${limit}` : ''}`
    ),
}

// ── 知识库 API ────────────────────────────────────────────────────────────────

export interface KnowledgeSection {
  id: string
  title: string
  content: string
  tags?: string[]
  markets?: string[]
  updated_at?: string
}

export const knowledgeApi = {
  list: () => request<{ sections: KnowledgeSection[] }>(`${API}/knowledge/sections`),
  get: (id: string) => request<KnowledgeSection>(`${API}/knowledge/sections/${id}`),
  search: (q: string) =>
    request<{ results: KnowledgeSection[] }>(
      `${API}/knowledge/search?q=${encodeURIComponent(q)}`
    ),
}

// ── 主动引擎 API ────────────────────────────────────────────────────────────

export interface BriefItem {
  type: string
  date: string
  generated_at: string
  summary: {
    active_products: number
    pending_alerts: number
    compliance_pass_rate: number
    cert_expiry_warnings: number
    regulation_changes: number
  }
  highlights: string[]
  recommendations: string[]
}

export const proactiveApi = {
  /** 获取合规简报 */
  getBrief: (limit = 7) =>
    request<{ briefs: BriefItem[] }>(`${API}/proactive/brief?limit=${limit}`),
}

// ── 定时任务管理 API ─────────────────────────────────────────────────────────

export interface SchedulerJobItem {
  id: string
  name: string
  func_ref: string
  trigger: {
    type: 'interval' | 'cron' | 'unknown'
    interval_seconds?: number
    interval_human?: string
    expression?: string
    cron_human?: string
  }
  next_run_time: string | null
  pending: boolean
  coalesce: boolean
  max_instances: number
  misfire_grace_time: number | null
  /** 任务范围: global（全局） | product（产品级） */
  scope: 'global' | 'product'
  /** 产品级任务关联的产品ID */
  product_id: string | null
}

export interface SchedulerListResponse {
  jobs: SchedulerJobItem[]
  enabled: boolean
}
export interface ProductTaskMeta {
  id: string
  name: string
  target_markets: string[]
  lifecycle_stage: string
  compliance_status: string
  health_score: number
}

export interface SchedulerGroupedResponse {
  global: SchedulerJobItem[]
  products: Record<string, SchedulerJobItem[]>
  product_meta: Record<string, ProductTaskMeta>
  enabled: boolean
}

export const schedulerApi = {
  /** 获取所有定时任务 */
  list: () => request<SchedulerListResponse>(`${API}/scheduler/jobs`),

  /** 获取按维度(global/product)分组的定时任务 */
  listGrouped: () => request<SchedulerGroupedResponse>(`${API}/scheduler/jobs/grouped`),

  /** 获取可调度的任务模板 */
  listTasks: () =>
    request<{ tasks: Array<{ name: string; description?: string; func_ref?: string }> }>(
      `${API}/scheduler/tasks`
    ),

  /** 创建定时任务 */
  create: (data: {
    task: string
    trigger_type: 'interval' | 'cron'
    trigger_args: Record<string, unknown>
    job_id?: string
    replace_existing?: boolean
  }) =>
    request<{ ok: boolean; job_id: string; task: string; trigger: string }>(
      `${API}/scheduler/jobs`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  /** 暂停任务 */
  pause: (jobId: string) =>
    request<{ ok: boolean; job_id: string; status: string }>(
      `${API}/scheduler/jobs/${jobId}/pause`,
      { method: 'POST' }
    ),

  /** 恢复任务 */
  resume: (jobId: string) =>
    request<{ ok: boolean; job_id: string; status: string }>(
      `${API}/scheduler/jobs/${jobId}/resume`,
      { method: 'POST' }
    ),

  /** 删除任务 */
  delete: (jobId: string) =>
    request<{ ok: boolean; job_id: string; status: string }>(
      `${API}/scheduler/jobs/${jobId}`,
      { method: 'DELETE' }
    ),

  /** 立即触发任务 */
  trigger: (jobId: string) =>
    request<{ ok: boolean; job_id: string; status: string }>(
      `${API}/scheduler/jobs/${jobId}/trigger`,
      { method: 'POST' }
    ),

  /** 获取任务-Worker绑定 */
  getBindings: () =>
    request<{ bindings: Record<string, string> }>(`${API}/scheduler/bindings`),

  /** 更新任务-Worker绑定 */
  updateBinding: (taskName: string, workerId: string) =>
    request<{ ok: boolean; task: string; worker_id: string }>(
      `${API}/scheduler/bindings/${taskName}`,
      { method: 'PUT', body: JSON.stringify({ worker_id: workerId }) }
    ),
}


// ── 风险情报引擎 API ──────────────────────────────────────────────────────────

export type RiskDomain = 'tariff' | 'conflict' | 'financial'
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface LlmAnalysis {
  summary: string       // ≤80字事件概述
  impact: string        // ≤60字影响分析
  actions: string[]     // ≤3条建议行动
  confidence: number    // 置信度 0~1
  analyzed_at?: string
  model?: string
}

export interface RiskIntelItem {
  id: string
  source_type: string
  source_name: string
  title: string
  summary?: string
  url?: string
  pub_time?: string
  collected_at: string
  risk_domain?: RiskDomain
  risk_category?: string
  risk_score: number
  severity: RiskSeverity
  sentiment?: string
  affected_markets: string[]
  affected_hs_codes: string[]
  matched_keywords: string[]
  trigger_source?: string
  jin10_id?: string
  jin10_important?: number
  jin10_channel?: number[]
  analyzed: number
  alert_id?: string
  headline_summary?: string
  // LLM 深度分析字段
  llm_analysis?: LlmAnalysis | null
  llm_analyzed?: number   // 0=未分析, 1=已分析
  llm_error?: string | null
}

export interface RiskIntelKeyword {
  id: string
  user_id: string
  keyword: string
  label?: string
  domain: string
  auto_suggested: number
  source_hint?: string
  periodic_enabled: number
  cron_expr: string
  last_run_at?: string
  next_run_at?: string
  total_runs: number
  total_hits: number
  enabled: number
  created_at: string
  updated_at: string
}

export interface RiskIntelRun {
  id: string
  run_type: string
  keyword_id?: string
  keyword: string
  user_id?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  items_found: number
  items_new: number
  alerts_created: number
  error_msg?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

export interface RiskIntelSearchResult {
  run_id: string
  keyword: string
  total_found: number
  items_new: number
  alerts_triggered: number
  duration_ms?: number
  items: RiskIntelItem[]
  error?: string
}

export interface RiskHeatmap {
  by_domain: Record<string, { count: number; critical: number; high: number; avg_score: number }>
  trend: Array<{ date: string; tariff?: number; conflict?: number; financial?: number }>
  top_markets: Array<{ market: string; count: number }>
  latest_critical: RiskIntelItem[]
  generated_at: string
}

export const riskIntelApi = {
  // 主动关键词检索
  search: (keyword: string, domain?: string, save = true) =>
    request<RiskIntelSearchResult>(`${API}/risk-intel/search`, {
      method: 'POST',
      body: JSON.stringify({ keyword, domain: domain || undefined, save }),
    }),

  // 历史情报流
  getFeed: (params?: {
    q?: string; domain?: string; severity?: string
    min_score?: number; hours?: number; source_name?: string
    jin10_only?: boolean; important_only?: boolean
    page?: number; size?: number
  }) => {
    const p = new URLSearchParams()
    if (params?.q)             p.set('q', params.q)
    if (params?.domain)        p.set('domain', params.domain)
    if (params?.severity)      p.set('severity', params.severity)
    if (params?.min_score)     p.set('min_score', String(params.min_score))
    if (params?.hours)         p.set('hours', String(params.hours))
    if (params?.source_name)   p.set('source_name', params.source_name)
    if (params?.jin10_only)    p.set('jin10_only', 'true')
    if (params?.important_only) p.set('important_only', 'true')
    if (params?.page)          p.set('page', String(params.page))
    if (params?.size)          p.set('size', String(params.size))
    return request<{ items: RiskIntelItem[]; total: number; page: number; has_next: boolean }>(
      `${API}/risk-intel/feed?${p.toString()}`
    )
  },

  // 热力图
  getHeatmap: (hours = 168) =>
    request<RiskHeatmap>(`${API}/risk-intel/heatmap?hours=${hours}`),

  // 关键词 CRUD
  listKeywords: (domain?: string) => {
    const p = domain ? `?domain=${domain}` : ''
    return request<RiskIntelKeyword[]>(`${API}/risk-intel/keywords${p}`)
  },
  addKeyword: (data: {
    keyword: string; label?: string; domain?: string
    periodic_enabled?: boolean; cron_expr?: string
  }) =>
    request<RiskIntelKeyword>(`${API}/risk-intel/keywords`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateKeyword: (id: string, data: Partial<RiskIntelKeyword>) =>
    request<RiskIntelKeyword>(`${API}/risk-intel/keywords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteKeyword: (id: string) =>
    fetchWithAuth(`${API}/risk-intel/keywords/${id}`, {
      method: 'DELETE',
    }),
  suggestKeywords: (markets?: string[], domains?: string[]) =>
    request<{ suggestions: Array<{ keyword: string; domain: string; source_hint: string; already_tracked: boolean }> }>(
      `${API}/risk-intel/keywords/suggest`,
      { method: 'POST', body: JSON.stringify({ markets, domains }) }
    ),
  runKeyword: (id: string) =>
    request<{ run_id: string; keyword: string; status: string }>(`${API}/risk-intel/keywords/${id}/run`, {
      method: 'POST',
    }),

  // 执行记录
  getRuns: (keyword_id?: string) => {
    const p = keyword_id ? `?keyword_id=${keyword_id}` : ''
    return request<RiskIntelRun[]>(`${API}/risk-intel/runs${p}`)
  },
  getRun: (runId: string) =>
    request<RiskIntelRun>(`${API}/risk-intel/runs/${runId}`),

  // LLM 分析管理
  getAnalyzeStatus: () =>
    request<{ total: number; done: number; pending: number; errors: number }>(
      `${API}/risk-intel/analyze/status`
    ),
  triggerAnalyze: (batchSize = 20, minScore = 0) =>
    request<{ status: string; batch_size: number; queue_before: number }>(
      `${API}/risk-intel/analyze/trigger?batch_size=${batchSize}&min_score=${minScore}`,
      { method: 'POST' }
    ),
  analyzeItem: (itemId: string) =>
    request<{ status: string; item_id: string; message: string }>(
      `${API}/risk-intel/analyze/item/${itemId}`,
      { method: 'POST' }
    ),
}

// ── 产品出海生命周期 API ──────────────────────────────────────────────────────

export type LifecycleStage = 'concept' | 'design' | 'sourcing' | 'ready' | 'active' | 'fulfilling' | 'aftersale' | 'end'

export interface SupplierInfo {
  id: string
  name: string
  source_type: string
  contact_name: string
  contact_phone: string
  contact_email: string
  address: string
  country: string
  business_license: string
  tax_id: string
  has_invoice: boolean
  certifications: string[]
  categories: string[]
  rating: number
  risk_level: string
  status: string
  tags: string[]
  ai_review?: Record<string, unknown> | null
  ai_review_at?: string
  created_at: string
  updated_at: string
}

export interface ContractInfo {
  id: string
  product_id: string
  supplier_id: string
  contract_type: string
  template_id: string
  title: string
  version: number
  status: string
  delivery_term: string
  currency: string
  total_amount: number
  payment_terms: string
  delivery_date: string
  quality_terms: string
  content_html: string
  content_vars: Record<string, unknown>
  compliance_issues: Array<{ level: string; code: string; message: string }>
  compliance_score: number
  parties: string[]
  signed_at?: string
  created_at: string
  updated_at: string
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  contract_type: string
  variables: Array<{ key: string; label: string; required?: boolean; default?: string }>
}

export interface PaymentChannel {
  id: string
  provider: string
  display_name: string
  currency: string[]
  markets: string[]
  status: string
  kyc_verified: boolean
  webhook_url: string
  test_mode: boolean
  chargeback_rate: number
  chargeback_limit: number
  pci_dss: boolean
  compliance_notes: Array<{ level: string; code: string; message: string }>
  last_tested_at?: string
  created_at: string
}

export interface LogisticsOrder {
  id: string
  product_id: string
  order_id: string
  carrier: string
  tracking_number: string
  service_type: string
  incoterm: string
  origin_country: string
  dest_country: string
  status: string
  estimated_delivery?: string
  insured: boolean
  insured_value: number
  freight_cost: number
  customs_declaration_id?: string
  created_at: string
  updated_at: string
}

/** 物流轨迹事件 */
export interface TrackingEvent {
  timestamp?: string
  status?: string
  status_code?: string
  location?: string
  description?: string
  message?: string
}

/** 物流追踪响应（getTracking / refreshTracking） */
export interface TrackingResult {
  events: TrackingEvent[]
  latest_event?: TrackingEvent
  current_status?: string
  estimated_delivery?: string
}

/** 承运商 */
export interface Carrier {
  id: string
  name: string
  code: string
}

/** 供应商风险评估响应 */
export interface SupplierRiskAssessment {
  risk_level: string
  score: number
  factors?: Array<{ dimension: string; score: number; note?: string }>
}

/** 合同版本 */
export interface ContractVersion {
  version: number
  created_at: string
  status?: string
  changelog?: string
}

/** 支付通道合规检查响应 */
export interface PaymentComplianceCheck {
  status: string
  passed: boolean
  message?: string
  issues?: Array<{ level: string; code: string; message: string }>
}

/** 支付通道拒付统计 */
export interface ChargebackStats {
  total_count: number
  chargeback_count: number
  chargeback_rate: number
  by_currency?: Array<{ currency: string; count: number; rate: number }>
}

/** 关税税率表条目 */
export interface TariffRate {
  hs_code: string
  description?: string
  duty_rate: number
  dest_country?: string
}

/** 管制商品检查响应 */
export interface ControlledGoodsCheck {
  is_controlled: boolean
  restrictions: Array<{ code: string; description: string; authority?: string }>
}

/** 三单一致性检查响应 */
export interface ThreeWayCheck {
  passed: boolean
  checks: Array<{ name: string; passed: boolean; detail?: string }>
}

export interface CustomsDeclaration {
  id: string
  product_id: string
  logistics_id?: string
  mode: string
  hs_code: string
  declared_name: string
  declared_value: number
  declared_currency: string
  quantity: number
  unit: string
  origin_country: string
  dest_country: string
  duty_rate: number
  calculated_duty: number
  vat_applicable: boolean
  ioss_number?: string
  documents: string[]
  compliance_checks: Array<{ check: string; passed: boolean; detail?: string }>
  status: string
  exception_reason?: string
  created_at: string
  // ── DEVLOG.md 扩展字段 ──
  brand?: string
  model_spec?: string
  unit_price?: number
  fx_rate_date?: string
  shipper_name?: string
  shipper_address?: string
  shipper_eori?: string
  consignee_name?: string
  consignee_address?: string
  order_id?: string
  contract_no?: string
  invoice_no?: string
  export_license_no?: string
  co_cert_no?: string
  ecommerce_record_no?: string
}

export interface DutyCalcResult {
  hs_code: string
  dest_country: string
  declared_value: number
  currency: string
  duty_rate_pct: number
  calculated_duty: number
  ioss_applicable: boolean
  ioss_tip: string
}

// ── 供应商 API ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: (params?: { status?: string; source_type?: string; country?: string }) => {
    const p = new URLSearchParams()
    if (params?.status) p.set('status', params.status)
    if (params?.source_type) p.set('source_type', params.source_type)
    if (params?.country) p.set('country', params.country)
    return request<SupplierInfo[]>(`${API}/suppliers?${p.toString()}`)
  },
  get: (id: string) => request<SupplierInfo>(`${API}/suppliers/${id}`),
  create: (data: Partial<SupplierInfo>) => request<SupplierInfo>(`${API}/suppliers`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SupplierInfo>) => request<SupplierInfo>(`${API}/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  verify: (id: string) => request<{ status: string; message: string }>(`${API}/suppliers/${id}/verify`, { method: 'POST' }),
  rate: (id: string, score: number, dimensions?: Record<string, number>, comment?: string) =>
    request(`${API}/suppliers/${id}/rate`, { method: 'POST', body: JSON.stringify({ score, dimensions: dimensions || {}, comment: comment || '' }) }),
  getProducts: (id: string) => request<{ products: SupplierInfo[]; total: number }>(`${API}/suppliers/${id}/products`),
  getRiskAssessment: (id: string) => request<SupplierRiskAssessment>(`${API}/suppliers/${id}/risk-assessment`),
}

// ── 合同 API ──────────────────────────────────────────────────────────────────
export const contractsApi = {
  listTemplates: () => request<ContractTemplate[]>(`${API}/contracts/templates`),
  getTemplate: (id: string) => request<ContractTemplate>(`${API}/contracts/templates/${id}`),
  generate: (data: {
    product_id: string; supplier_id: string; template_id: string
    title?: string; variables: Record<string, unknown>
    delivery_term?: string; currency?: string; total_amount?: number
    payment_terms?: string; delivery_date?: string; parties?: string[]
    auto_review?: boolean
  }) => request<ContractInfo>(`${API}/contracts/generate`, { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: { product_id?: string; supplier_id?: string; status?: string }) => {
    const p = new URLSearchParams()
    if (params?.product_id) p.set('product_id', params.product_id)
    if (params?.supplier_id) p.set('supplier_id', params.supplier_id)
    if (params?.status) p.set('status', params.status)
    return request<ContractInfo[]>(`${API}/contracts?${p.toString()}`)
  },
  get: (id: string) => request<ContractInfo>(`${API}/contracts/${id}`),
  update: (id: string, data: Partial<ContractInfo>) => request<ContractInfo>(`${API}/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  review: (id: string) => request<{ status: string; message: string }>(`${API}/contracts/${id}/review`, { method: 'POST' }),
  sign: (id: string) => request<ContractInfo>(`${API}/contracts/${id}/sign`, { method: 'POST' }),
  getVersions: (id: string) => request<{ versions: ContractVersion[] }>(`${API}/contracts/${id}/versions`),
}

// ── 支付通道 API ──────────────────────────────────────────────────────────────
export const paymentChannelsApi = {
  list: (status?: string) => request<PaymentChannel[]>(`${API}/payment-channels${status ? `?status=${status}` : ''}`),
  get: (id: string) => request<PaymentChannel>(`${API}/payment-channels/${id}`),
  create: (data: { provider: string; webhook_url?: string; test_mode?: boolean }) =>
    request<PaymentChannel>(`${API}/payment-channels`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PaymentChannel>) =>
    request<PaymentChannel>(`${API}/payment-channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  test: (id: string) => request<{ status: string }>(`${API}/payment-channels/${id}/test`, { method: 'POST' }),
  complianceCheck: (id: string) => request<PaymentComplianceCheck>(`${API}/payment-channels/${id}/compliance-check`, { method: 'POST' }),
  getChargebackStats: (id: string, days?: number) =>
    request<ChargebackStats>(`${API}/payment-channels/${id}/chargeback-stats${days ? `?days=${days}` : ''}`),
}

// ── 物流 API ──────────────────────────────────────────────────────────────────
export const logisticsApi = {
  listCarriers: () => request<Carrier[]>(`${API}/logistics/carriers`),
  createShipment: (data: {
    product_id: string; carrier: string; dest_country: string
    tracking_number?: string; service_type?: string; incoterm?: string
    insured?: boolean; insured_value?: number; freight_cost?: number
  }) => request<LogisticsOrder>(`${API}/logistics/shipments`, { method: 'POST', body: JSON.stringify(data) }),
  listShipments: (params?: { product_id?: string; status?: string }) => {
    const p = new URLSearchParams()
    if (params?.product_id) p.set('product_id', params.product_id)
    if (params?.status) p.set('status', params.status)
    return request<LogisticsOrder[]>(`${API}/logistics/shipments?${p.toString()}`)
  },
  getShipment: (id: string) => request<LogisticsOrder>(`${API}/logistics/shipments/${id}`),
  getTracking: (id: string) => request<TrackingResult>(`${API}/logistics/shipments/${id}/tracking`),
  refreshTracking: (id: string) => request<TrackingResult>(`${API}/logistics/shipments/${id}/refresh`, { method: 'POST' }),
}

// ── 报关 API ──────────────────────────────────────────────────────────────────
export const customsApi = {
  create: (data: {
    product_id: string; hs_code: string; declared_name: string
    declared_value: number; dest_country: string; quantity?: number
    mode?: string; origin_country?: string; documents?: string[]
    ioss_number?: string
    logistics_id?: string
    declared_currency?: string
    unit?: string
    // ── DEVLOG.md 扩展字段（15个）──
    brand?: string                    // 商品品牌
    model_spec?: string               // 型号规格
    unit_price?: number               // 单价
    fx_rate_date?: string             // 汇率日期
    shipper_name?: string             // 发货人名称
    shipper_address?: string          // 发货人地址
    shipper_eori?: string             // 发货人EORI
    consignee_name?: string           // 收货人名称
    consignee_address?: string        // 收货人地址
    order_id?: string                 // 关联销售订单ID
    contract_no?: string              // 合同号
    invoice_no?: string               // 发票号
    export_license_no?: string        // 出口许可证号
    co_cert_no?: string               // CO证书号
    ecommerce_record_no?: string      // 电商备案号
  }) => request<CustomsDeclaration>(`${API}/customs/declarations`, { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: { product_id?: string; status?: string }) => {
    const p = new URLSearchParams()
    if (params?.product_id) p.set('product_id', params.product_id)
    if (params?.status) p.set('status', params.status)
    return request<CustomsDeclaration[]>(`${API}/customs/declarations?${p.toString()}`)
  },
  get: (id: string) => request<CustomsDeclaration>(`${API}/customs/declarations/${id}`),
  submit: (id: string) => request<CustomsDeclaration>(`${API}/customs/declarations/${id}/submit`, { method: 'POST' }),
  check: (id: string) => request<{ status: string; message?: string; issues?: Array<{ level: string; code: string; message: string }> }>(`${API}/customs/declarations/${id}/check`, { method: 'POST' }),
  calculateDuty: (data: { hs_code: string; dest_country: string; declared_value: number; currency?: string }) =>
    request<DutyCalcResult>(`${API}/customs/duty-calculator`, { method: 'POST', body: JSON.stringify(data) }),
  getTariffRates: () => request<TariffRate[]>(`${API}/customs/tariff-rates`),
  clear: (id: string) => request<CustomsDeclaration>(`${API}/customs/declarations/${id}/clear`, { method: 'POST' }),
  markException: (id: string, reason: string) =>
    request<CustomsDeclaration>(`${API}/customs/declarations/${id}/exception?reason=${encodeURIComponent(reason)}`, { method: 'POST' }),
  checkControlledGoods: (params: { hs_code: string; declared_name: string; dest_country: string; shipper_name?: string; shipper_address?: string }) => {
    const p = new URLSearchParams({ hs_code: params.hs_code, declared_name: params.declared_name, dest_country: params.dest_country })
    if (params.shipper_name) p.set('shipper_name', params.shipper_name)
    if (params.shipper_address) p.set('shipper_address', params.shipper_address)
    return request<ControlledGoodsCheck>(`${API}/customs/controlled-goods/check?${p.toString()}`)
  },
  threeWayCheck: (data: { order_id?: string; declaration_id?: string; logistics_id?: string }) =>
    request<ThreeWayCheck>(`${API}/customs/three-way-check`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── 销售订单 API ─────────────────────────────────────────────────────────────────

export interface SalesOrder {
  id: string
  product_id?: string
  platform: string
  platform_order_id?: string
  buyer_name: string
  buyer_email: string
  buyer_address: { country?: string; city?: string; zip?: string; street?: string }
  items: Array<{ sku?: string; name: string; qty: number; unit_price: number; hs_code?: string }>
  currency: string
  total_amount: number
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PaymentRecord {
  id: string
  order_id: string
  channel_id?: string
  payment_ref?: string
  amount: number
  currency: string
  payer_email?: string
  payer_name?: string
  status: string
  paid_at?: string
  notes?: string
  created_at: string
}

export interface ConsistencyCheckResult {
  passed: boolean
  checks: Array<{
    dimension: string
    label: string
    passed: boolean
    detail: string
    severity?: string
  }>
  summary: string
}

export const ordersApi = {
  list: (params?: { product_id?: string; platform?: string; status?: string; limit?: number }) => {
    const p = new URLSearchParams()
    if (params?.product_id) p.set('product_id', params.product_id)
    if (params?.platform) p.set('platform', params.platform)
    if (params?.status) p.set('status', params.status)
    if (params?.limit) p.set('limit', String(params.limit))
    return request<SalesOrder[]>(`${API}/orders?${p.toString()}`)
  },
  create: (data: {
    platform?: string
    platform_order_id?: string
    product_id?: string
    buyer_name: string
    buyer_email?: string
    buyer_address?: Record<string, unknown>
    items?: Array<{ sku?: string; name: string; qty?: number; unit_price?: number; hs_code?: string }>
    currency?: string
    total_amount?: number
    status?: string
    notes?: string
  }) => request<SalesOrder>(`${API}/orders`, { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<SalesOrder>(`${API}/orders/${id}`),
  update: (id: string, data: Partial<SalesOrder>) =>
    request<SalesOrder>(`${API}/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPayments: (id: string) =>
    request<{ payments: PaymentRecord[]; summary: { total_paid: number; total_refunded: number; count: number } }>(`${API}/orders/${id}/payments`),
  addPayment: (id: string, data: {
    channel_id?: string
    payment_ref?: string
    amount: number
    currency?: string
    payer_email?: string
    payer_name?: string
    status?: string
    paid_at?: string
    notes?: string
  }) => request<PaymentRecord>(`${API}/orders/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  consistencyCheck: (id: string, params?: { declaration_id?: string; logistics_id?: string }) => {
    const p = new URLSearchParams()
    if (params?.declaration_id) p.set('declaration_id', params.declaration_id)
    if (params?.logistics_id) p.set('logistics_id', params.logistics_id)
    return request<ConsistencyCheckResult>(`${API}/orders/${id}/consistency-check?${p.toString()}`)
  },
}
