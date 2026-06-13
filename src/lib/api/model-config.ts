/**
 * 模型路由配置 API 客户端（role 路由制）。
 * 后端契约：app/api/model_config.py（prefix: /api/v1/model-configs）
 */

const BASE = '/api/v1/model-configs'

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>

/** 单条模型路由（对齐后端 ModelConfigResponse） */
export interface RouteConfig {
  role: string
  provider: string
  model: string
  api_key_env: string
  base_url: string
  max_tokens: number
  temperature: number
  top_p: number
}

/** 创建/更新请求体（对齐后端 ModelConfigRequest） */
export interface RouteConfigRequest {
  role: string
  provider: string
  model: string
  api_key_env?: string
  base_url?: string
  max_tokens?: number
  temperature?: number
  top_p?: number
}

/** GET /active 返回结构 */
export interface ActiveRoutes {
  routes: Record<string, { provider: string; model: string; max_tokens: number }>
  fallback_chain: Record<string, string[]>
}

type ModelConfigListResponse = RouteConfig[] | { configs?: unknown }

/** 尽量从后端 {detail} 提取可读错误，否则回退到 HTTP 状态码 */
async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (data?.detail && typeof data.detail === 'string') return data.detail
  } catch {
    /* 非 JSON 响应，忽略 */
  }
  return `${fallback}: HTTP ${res.status}`
}

function normalizeRouteConfigs(data: ModelConfigListResponse): RouteConfig[] {
  const configs = Array.isArray(data) ? data : data.configs
  if (!Array.isArray(configs)) {
    throw new Error('模型路由接口返回格式异常')
  }
  return configs as RouteConfig[]
}

/** 获取所有模型路由 */
export async function listRoutes(authFetch: AuthFetch): Promise<RouteConfig[]> {
  const res = await authFetch(BASE)
  if (!res.ok) throw new Error(await parseError(res, '获取模型路由失败'))
  const data = (await res.json()) as ModelConfigListResponse
  return normalizeRouteConfigs(data)
}

/** 获取当前激活路由 + 降级链 */
export async function getActiveRoutes(authFetch: AuthFetch): Promise<ActiveRoutes> {
  const res = await authFetch(`${BASE}/active`)
  if (!res.ok) throw new Error(await parseError(res, '获取激活路由失败'))
  const data = (await res.json()) as Partial<ActiveRoutes>
  return {
    routes: data.routes ?? {},
    fallback_chain: data.fallback_chain ?? {},
  }
}

/** 创建/更新路由（POST，后端按 role upsert） */
export async function saveRoute(
  authFetch: AuthFetch,
  body: RouteConfigRequest,
): Promise<{ ok: boolean; role: string }> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res, '保存路由失败'))
  return res.json()
}

/** 更新指定 role 的路由（PUT /{role}） */
export async function updateRoute(
  authFetch: AuthFetch,
  role: string,
  body: RouteConfigRequest,
): Promise<{ ok: boolean; role: string }> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(role)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res, '更新路由失败'))
  return res.json()
}

/** 删除指定 role 的路由（DELETE /{role}，后端不允许删除最后一个） */
export async function deleteRoute(
  authFetch: AuthFetch,
  role: string,
): Promise<{ ok: boolean; role: string }> {
  const res = await authFetch(`${BASE}/${encodeURIComponent(role)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res, '删除路由失败'))
  return res.json()
}
