import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmProvider, useConfirm } from './useConfirm'

// 通过一个探针组件驱动 confirm()，验证统一交互反馈（U11）替代 window.confirm 的行为
function Probe({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm()
  return (
    <button
      onClick={async () => {
        const ok = await confirm({
          title: '卸载 Skill',
          description: '确定卸载此 Skill？',
          variant: 'destructive',
          confirmLabel: '卸载',
        })
        onResult(ok)
      }}
    >
      触发
    </button>
  )
}

describe('ConfirmProvider / useConfirm（U11）', () => {
  it('点击确认按钮 resolve(true)，并渲染自定义标题/描述/按钮文案', async () => {
    let result: boolean | null = null
    render(
      <ConfirmProvider>
        <Probe onResult={(v) => (result = v)} />
      </ConfirmProvider>,
    )

    await userEvent.click(screen.getByText('触发'))
    expect(screen.getByText('卸载 Skill')).toBeInTheDocument()
    expect(screen.getByText('确定卸载此 Skill？')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '卸载' }))
    expect(result).toBe(true)
  })

  it('点击取消按钮 resolve(false)', async () => {
    let result: boolean | null = null
    render(
      <ConfirmProvider>
        <Probe onResult={(v) => (result = v)} />
      </ConfirmProvider>,
    )

    await userEvent.click(screen.getByText('触发'))
    await userEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(result).toBe(false)
  })

  it('未包裹 Provider 时抛出可诊断错误', () => {
    expect(() => render(<Probe onResult={() => {}} />)).toThrow(
      'useConfirm must be used inside <ConfirmProvider>',
    )
  })
})
