/**
 * 用户自定义定时任务 API 客户端（对齐 deer-flow-main core/scheduled-tasks/api.ts）。
 *
 * 使用 sateharbor 的 authFetch 模式（useAuth() 提供，自动附加 JWT）。
 */

import type { AuthFetch } from '@/lib/api/os'
import type { ScheduledTask, ScheduledTaskRun } from './types'

const API = '/api/v1/scheduled-tasks'

async function request<T>(authFetch: AuthFetch, url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await authFetch(url, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.detail || body?.message || res.statusText
    throw new Error(`${detail || '请求失败'} (${res.status})`)
  }
  return res.json()
}

export type ScheduledTaskPayload = {
  title: string
  prompt: string
  schedule_type: 'once' | 'cron'
  schedule_spec: Record<string, unknown>
  timezone: string
  product_id?: string | null
}

export const scheduledTasksApi = {
  list: (authFetch: AuthFetch, scope: 'all' | 'system' | 'user' = 'all') =>
    request<ScheduledTask[]>(authFetch, `${API}?scope=${scope}`),

  get: (authFetch: AuthFetch, taskId: string) =>
    request<ScheduledTask>(authFetch, `${API}/${encodeURIComponent(taskId)}`),

  create: (authFetch: AuthFetch, payload: ScheduledTaskPayload) =>
    request<ScheduledTask>(authFetch, API, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (authFetch: AuthFetch, taskId: string, payload: Partial<Omit<ScheduledTaskPayload, 'schedule_type'>>) =>
    request<ScheduledTask>(authFetch, `${API}/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (authFetch: AuthFetch, taskId: string) =>
    request<{ id: string; deleted: boolean }>(authFetch, `${API}/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    }),

  pause: (authFetch: AuthFetch, taskId: string) =>
    request<ScheduledTask>(authFetch, `${API}/${encodeURIComponent(taskId)}/pause`, { method: 'POST' }),

  resume: (authFetch: AuthFetch, taskId: string) =>
    request<ScheduledTask>(authFetch, `${API}/${encodeURIComponent(taskId)}/resume`, { method: 'POST' }),

  trigger: (authFetch: AuthFetch, taskId: string) =>
    request<{ id: string; triggered: boolean; run_id: string | null }>(
      authFetch, `${API}/${encodeURIComponent(taskId)}/trigger`, { method: 'POST' },
    ),

  runs: (authFetch: AuthFetch, taskId: string, limit = 50, offset = 0) =>
    request<ScheduledTaskRun[]>(
      authFetch, `${API}/${encodeURIComponent(taskId)}/runs?limit=${limit}&offset=${offset}`,
    ),
}
