import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionMessage } from '@/types'

// 隔离被测单元：桩掉依赖运行时上下文（useAuth / react-query）的子面板
vi.mock('./RuntimePanels', () => ({
  ActionChainPanel: () => null,
  ArbitrationPanel: () => null,
  BrowserResultCard: () => null,
}))
vi.mock('@/components/chat/StreamMessageRenderer', () => ({
  StreamMessageRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))
vi.mock('@/components/chat/ComplianceCard', () => ({ ComplianceCard: () => null }))
vi.mock('@/components/chat/ApprovalCard', () => ({ ApprovalCard: () => null }))

import { MessageBubble } from './MessageBubble'

function assistantMsg(overrides: Partial<SessionMessage> = {}): SessionMessage {
  return {
    id: 'm1',
    role: 'assistant',
    content: '这是一条助手回复',
    sources: [],
    created_at: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

describe('MessageBubble 重试入口（U10）', () => {
  it('助手消息标记 error 时展示失败提示与重试按钮，点击触发 onRetry', async () => {
    const onRetry = vi.fn()
    render(<MessageBubble msg={assistantMsg({ error: true, content: '请求失败' })} onRetry={onRetry} />)

    expect(screen.getByText('回复生成失败。')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: '重试' })
    await userEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('stream_events 含 error 事件时同样识别为错误态', () => {
    render(
      <MessageBubble
        msg={assistantMsg({
          stream_events: [{ type: 'error', code: 'X', message: '中断', recoverable: true }],
        })}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByText('回复生成失败。')).toBeInTheDocument()
  })

  it('正常助手消息不展示重试入口', () => {
    render(<MessageBubble msg={assistantMsg()} onRetry={() => {}} />)
    expect(screen.queryByText('回复生成失败。')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument()
  })

  it('用户消息永不展示重试入口', () => {
    render(<MessageBubble msg={assistantMsg({ role: 'user', error: true })} onRetry={() => {}} />)
    expect(screen.queryByText('回复生成失败。')).not.toBeInTheDocument()
  })
})
