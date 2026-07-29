/**
 * 统一认证 HTTP 层（F4）
 *
 * 认证走后端下发的 HttpOnly access_token Cookie；前端不再持有/读取 token，
 * 也不再设置 Authorization: Bearer 头。
 *
 * - 所有请求携带 credentials: 'include'，浏览器自动附带 Cookie。
 * - 非安全方法（POST/PUT/PATCH/DELETE）从可读的 csrf_token Cookie 回填
 *   X-CSRF-Token 头（double-submit 模式），与后端 csrf_protect 中间件对齐。
 * - VITE_STREAM_MODE=mock 时（Vercel demo），拦截所有请求返回假数据。
 * - 运行时降级（R4）：后端不可达（连接被拒/断网）时自动回落 mock 数据，
 *   并通过 backendStatus 暴露降级状态供 UI 提示；后端恢复后自动切回。
 */

import { interceptFetchWithAuth } from '@/lib/mockRouter'
import { markBackendDegraded, markBackendOnline } from '@/lib/backendStatus'

const IS_MOCK = import.meta.env.VITE_STREAM_MODE === 'mock'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

// 对话类端点（SSE 流/非流回复）不做运行时回落：mockRouter 返回的是 JSON
// 而非 SSE，伪造会产生空回复/假回复；降级态下让既有错误分支如实提示失败。
const RUNTIME_FALLBACK_EXCLUDED = ['/api/v1/chat']
const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'X-CSRF-Token'

/** 读取可读（非 HttpOnly）的 csrf_token Cookie。 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`)
  )
  const value = match?.[1]
  return value ? decodeURIComponent(value) : null
}

/** 提取请求路径（兼容相对/绝对 URL），用于回落白名单判断。 */
function extractPath(url: string): string {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname
  } catch {
    return url
  }
}

/** 降级回落：白名单内的请求返回 mock 响应，否则返回 null。 */
function fallbackToMock(url: string, init: RequestInit): Response | null {
  const path = extractPath(url)
  if (RUNTIME_FALLBACK_EXCLUDED.some((prefix) => path.startsWith(prefix))) return null
  return interceptFetchWithAuth(url, init)
}

/**
 * 带认证的 fetch 封装：附带 Cookie，并在非安全方法上回填 CSRF 头。
 *
 * 用法与原生 fetch 一致，是前端唯一的受控请求入口。
 * VITE_STREAM_MODE=mock 时自动拦截，返回假数据；
 * 非 mock 构建下后端不可达时，运行时回落 mock 数据兜底。
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

  // Mock mode: intercept all requests at the fetch layer
  if (IS_MOCK) {
    const mockResponse = interceptFetchWithAuth(url, init)
    if (mockResponse) return mockResponse
  }

  const headers = new Headers(init.headers || {})
  const method = (init.method || 'GET').toUpperCase()
  if (!SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken()
    if (csrf && !headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, csrf)
  }

  try {
    const res = await fetch(input, { ...init, headers, credentials: 'include' })
    // dev 代理（vite.config.ts）在后端进程不可达时返回带标记头的 503，
    // 与后端真实 5xx 区分开：同样视为不可达，回落 mock 数据
    if (res.headers.get('X-Backend-Unreachable') === '1') {
      markBackendDegraded()
      return fallbackToMock(url, init) ?? res
    }
    // 只要后端能应答（含 4xx/5xx）就视为在线；降级仅针对网络层不可达
    markBackendOnline()
    return res
  } catch (error) {
    // 主动中断（AbortController）等非网络故障照常抛出
    if (!(error instanceof TypeError)) throw error

    // 网络层失败（连接被拒/断网）：标记降级并回落 mock 数据
    markBackendDegraded()
    const mockResponse = fallbackToMock(url, init)
    if (mockResponse) return mockResponse
    throw error
  }
}
