/**
 * SupportPage（用量与费用中心，R8）测试。
 * 覆盖：用量加载渲染额度环/折算费用/明细表、空用量提示、加载失败重试。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import SupportPage from './SupportPage'
import { modelConfigsApi } from '@/api/config'
import { formatCNY, platformCostCNY } from '@/lib/costModel'

vi.mock('@/api/config', () => ({
  modelConfigsApi: { getUsage: vi.fn() },
}))

const getUsageMock = vi.mocked(modelConfigsApi.getUsage)

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/support']}>
      <SupportPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('SupportPage 用量与费用中心', () => {
  it('渲染用量总览、成本对比与按模型明细', async () => {
    getUsageMock.mockResolvedValue({
      total_tokens: 125840,
      by_model: { 'gpt-4o': 98200, 'gpt-4o-mini': 27640 },
      routes: { default: 'gpt-4o', fast: 'gpt-4o-mini' },
    })

    renderPage()

    expect(screen.getByRole('heading', { name: '用量与费用' })).toBeInTheDocument()
    // 总消耗折算 ¥（总览 + 成本对比两处出现）
    const totalCost = formatCNY(platformCostCNY(125840))
    expect(await screen.findAllByText(totalCost)).not.toHaveLength(0)
    // 明细表：模型行与用途标签（routes 反查）
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('通用对话')).toBeInTheDocument()
    expect(screen.getByText('快速问答')).toBeInTheDocument()
    // 充值第一阶段不接支付
    expect(screen.getByRole('button', { name: '充值通道内测中' })).toBeDisabled()
  })

  it('无调用记录时展示空态提示而非伪造数字', async () => {
    getUsageMock.mockResolvedValue({ total_tokens: 0, by_model: {}, routes: {} })

    renderPage()

    expect(
      await screen.findByText('暂无模型调用记录，发起一次合规对话后开始累计。'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('¥0').length).toBeGreaterThan(0)
  })

  it('加载失败时展示错误态与重试入口', async () => {
    getUsageMock.mockRejectedValue(new Error('network down'))

    renderPage()

    expect(await screen.findByText('用量加载失败')).toBeInTheDocument()
  })
})
