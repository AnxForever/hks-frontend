import { useSyncExternalStore } from 'react'
import { CloudOff } from 'lucide-react'

import {
  getBackendStatus,
  subscribeBackendStatus,
} from '@/lib/backendStatus'

/**
 * 后端降级提示条（R4）。
 *
 * 后端不可达、前端回落 mock 数据期间常驻显示，避免用户把演示数据
 * 误当真实数据；后端恢复（health 探测成功）后自动消失。
 */
export function BackendDegradedBanner() {
  const status = useSyncExternalStore(
    subscribeBackendStatus,
    getBackendStatus,
    getBackendStatus
  )

  if (status !== 'degraded') return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-b border-amber-500/30 px-4 py-1.5 text-xs"
    >
      <CloudOff className="size-3.5 shrink-0" />
      <span>后端服务不可达，当前展示演示数据；服务恢复后将自动切回真实数据</span>
    </div>
  )
}
