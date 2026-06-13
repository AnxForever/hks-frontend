import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  AlertTriangle,
  Library,
  Bot,
  Settings,
  Users,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useSessions } from '@/hooks/useSessions'
import type { SessionSummary } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAVIGATION_ITEMS = [
  { icon: LayoutDashboard, label: '仪表盘', path: '/app/dashboard', keywords: ['home', 'dashboard'] },
  { icon: MessageSquare, label: '智能对话', path: '/app/chat', keywords: ['chat', 'talk', 'ai'] },
  { icon: Search, label: '合规查询', path: '/app/compliance', keywords: ['query', 'search', 'compliance'] },
  { icon: AlertTriangle, label: '风险监控', path: '/app/risk-center', keywords: ['risk', 'alert', 'warning'] },
  { icon: Library, label: '知识库', path: '/app/knowledge', keywords: ['knowledge', 'docs', 'law'] },
]

const ADMIN_ITEMS = [
  { icon: Bot, label: 'Agent 配置', path: '/app/agent-config', keywords: ['agent', 'config'] },
  { icon: Settings, label: '模型配置', path: '/app/model-config', keywords: ['model', 'settings'] },
  { icon: Users, label: '用户管理', path: '/app/user-manage', keywords: ['user', 'manage'] },
]

const QUICK_ACTIONS = [
  { icon: Plus, label: '新建对话', action: 'new-chat', keywords: ['new', 'create'] },
  { icon: RefreshCw, label: '刷新数据', action: 'refresh', keywords: ['refresh', 'reload'] },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { sessions, newSession, openSession } = useSessions()
  const [search, setSearch] = useState('')

  // 重置搜索词
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const handleSelect = useCallback((callback: () => void) => {
    callback()
    onOpenChange(false)
  }, [onOpenChange])

  // 导航到页面
  const navigateTo = useCallback((path: string) => {
    handleSelect(() => navigate(path))
  }, [navigate, handleSelect])

  // 执行快速操作
  const executeAction = useCallback((action: string) => {
    handleSelect(() => {
      switch (action) {
        case 'new-chat':
          newSession()
          navigate('/app/chat')
          break
        case 'refresh':
          window.location.reload()
          break
      }
    })
  }, [navigate, newSession, handleSelect])

  // 打开会话
  const handleOpenSession = useCallback(async (id: string) => {
    handleSelect(async () => {
      await openSession(id)
      navigate('/app/chat')
    })
  }, [openSession, navigate, handleSelect])

  // 最近会话（限制显示前 5 个）
  const recentSessions = sessions.slice(0, 5)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="搜索页面、会话或执行操作..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>

        {/* 导航 */}
        <CommandGroup heading="导航">
          {NAVIGATION_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`${item.label} ${item.keywords.join(' ')}`}
              onSelect={() => navigateTo(item.path)}
            >
              <item.icon className="mr-2 size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* 管理员功能 */}
        {ADMIN_ITEMS.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="管理员">
              {ADMIN_ITEMS.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => navigateTo(item.path)}
                >
                  <item.icon className="mr-2 size-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 快速操作 */}
        <CommandSeparator />
        <CommandGroup heading="快速操作">
          {QUICK_ACTIONS.map((item) => (
            <CommandItem
              key={item.action}
              value={`${item.label} ${item.keywords.join(' ')}`}
              onSelect={() => executeAction(item.action)}
            >
              <item.icon className="mr-2 size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* 最近会话 */}
        {recentSessions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="最近会话">
              {recentSessions.map((session: SessionSummary) => (
                <CommandItem
                  key={session.id}
                  value={`${session.title} ${session.id}`}
                  onSelect={() => handleOpenSession(session.id)}
                >
                  <Clock className="mr-2 size-4" />
                  <span className="truncate">{session.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
