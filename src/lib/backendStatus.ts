/**
 * 后端可达性状态机（运行时降级，R4）。
 *
 * 与构建期 mock（VITE_STREAM_MODE=mock）互补：正常构建的前端在后端进程
 * 不可达（连接被拒/断网）时，由 http.ts 调用 markBackendDegraded() 进入
 * 降级态并回落 mock 数据；降级期间定时探测 /api/v1/health，成功即恢复。
 *
 * UI 侧通过 subscribeBackendStatus/getBackendStatus 接入
 * useSyncExternalStore，展示"演示数据"提示条。
 */

export type BackendStatus = 'online' | 'degraded'

const PROBE_INTERVAL_MS = 15_000
const HEALTH_URL = '/api/v1/health'

let status: BackendStatus = 'online'
let probeTimer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function getBackendStatus(): BackendStatus {
  return status
}

export function subscribeBackendStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** HTTP 层在真实请求网络失败时调用：进入降级态并启动健康探测。 */
export function markBackendDegraded(): void {
  if (status === 'degraded') return
  status = 'degraded'
  notify()
  startProbe()
}

/** HTTP 层在真实请求成功（或探测成功）时调用：恢复在线态。 */
export function markBackendOnline(): void {
  stopProbe()
  if (status === 'online') return
  status = 'online'
  notify()
}

function startProbe() {
  if (probeTimer) return
  probeTimer = setInterval(() => {
    // 用原生 fetch 探测，绕开 fetchWithAuth 的 mock 回落逻辑
    fetch(HEALTH_URL, { credentials: 'include' })
      .then((res) => {
        if (res.ok) markBackendOnline()
      })
      .catch(() => {
        // 仍不可达，等待下一轮探测
      })
  }, PROBE_INTERVAL_MS)
}

function stopProbe() {
  if (probeTimer) {
    clearInterval(probeTimer)
    probeTimer = null
  }
}
