import { Outlet } from 'react-router-dom'

import ConfigTabs from '@/components/config/ConfigTabs'

/**
 * 配置区共享布局 — Agent / Skills / Tools / 集成 / 模型 共用一份顶栏 Tab，
 * 子路由内容渲染进 Outlet，避免 5 个页面各自维护重复的顶栏。
 */
export default function ConfigLayout() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border/60 px-6 pt-4">
        <ConfigTabs />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
