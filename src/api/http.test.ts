/**
 * fetchWithAuth 运行时降级兜底（R4）测试。
 *
 * 覆盖三条路径：
 * 1. 网络层失败（TypeError）→ 回落 mock 数据 + 标记降级
 * 2. dev 代理标记头（X-Backend-Unreachable: 1）→ 回落 mock 数据 + 标记降级
 * 3. 对话端点在白名单外 → 不伪造回复，原样抛错
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithAuth } from './http'
import { getBackendStatus, markBackendOnline } from '@/lib/backendStatus'

const realFetch = globalThis.fetch

describe('fetchWithAuth 运行时降级（R4）', () => {
  beforeEach(() => {
    markBackendOnline()
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    markBackendOnline() // 复位状态并停掉健康探测定时器
    vi.restoreAllMocks()
  })

  it('网络层失败时回落 mock 数据并标记降级', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const res = await fetchWithAuth('/api/v1/products')

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(getBackendStatus()).toBe('degraded')
  })

  it('dev 代理返回 X-Backend-Unreachable 标记时回落 mock 数据', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'backend unreachable' }), {
        status: 503,
        headers: { 'X-Backend-Unreachable': '1' },
      })
    )

    const res = await fetchWithAuth('/api/v1/risk/alerts')

    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.alerts).toBeDefined()
    expect(getBackendStatus()).toBe('degraded')
  })

  it('对话端点不回落 mock，原样抛出网络错误', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(
      fetchWithAuth('/api/v1/chat/stream', { method: 'POST' })
    ).rejects.toThrow(TypeError)
    expect(getBackendStatus()).toBe('degraded')
  })

  it('后端恢复应答（含 4xx/5xx）后切回在线态', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await fetchWithAuth('/api/v1/products')
    expect(getBackendStatus()).toBe('degraded')

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
    await fetchWithAuth('/api/v1/products')
    expect(getBackendStatus()).toBe('online')
  })
})
