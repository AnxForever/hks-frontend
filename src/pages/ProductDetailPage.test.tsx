import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProductItem } from '@/lib/api/os'

// ── 桩掉数据 hook 与路由，聚焦聚合视图的渲染断言（U8）──────────────
const mockProduct: ProductItem = {
  id: 'p1',
  name: '智能温控器',
  target_markets: ['欧盟', '美国'],
  hs_code: '8537',
  vendor: 'ACME',
  manufacturer: 'ACME 制造',
  lifecycle_stage: 'sourcing',
  compliance_status: 'passed',
  risk_level: 'medium',
  health_score: 82,
  certifications: [
    { name: 'CE', status: 'valid' },
    { name: 'FCC', status: 'expired' },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
}

const navigateSpy = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: () => ({ productId: 'p1' }),
  useNavigate: () => navigateSpy,
}))

vi.mock('@/hooks/queries/useProducts', () => ({
  useProductsDashboard: () => ({
    isLoading: false,
    data: {
      products: [mockProduct],
      eventsByProduct: { p1: [] },
      alerts: [],
    },
  }),
  useProductComplianceHistory: () => ({
    isLoading: false,
    data: {
      product_id: 'p1',
      checks: [
        { check_id: 'c1', target_market: '欧盟', timestamp: '2026-02-10T00:00:00Z', session_id: 's1' },
      ],
    },
  }),
  useProductComplianceCheck: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/queries/useProductTodos', () => ({
  useProductTodos: () => ({
    data: {
      todos: [
        { id: 't1', title: '补充欧盟报关材料', status: 'submitted', priority: 'high', todo_type: 'declaration' },
        { id: 't2', title: '整改能效标签', status: 'pending', priority: 'medium', todo_type: 'compliance_gap' },
      ],
    },
  }),
}))

import ProductDetailPage from './ProductDetailPage'

describe('ProductDetailPage 聚合视图（U8）', () => {
  it('渲染产品名、健康度、证书、报关单、合规检查历史与待办', () => {
    render(<ProductDetailPage />)

    // 头部与健康度
    expect(screen.getByRole('heading', { name: '智能温控器' })).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    // 健康度构成因子：有效证书 1/2
    expect(screen.getByText('1/2')).toBeInTheDocument()

    // 证书列表复用 ProductItem.certifications
    expect(screen.getByText('CE')).toBeInTheDocument()
    expect(screen.getByText('FCC')).toBeInTheDocument()

    // 报关单来自 todo_type='declaration'
    expect(screen.getByText('补充欧盟报关材料')).toBeInTheDocument()

    // 合规检查历史来自 complianceHistory
    expect(screen.getByText('查看会话')).toBeInTheDocument()

    // 待办摘要展示未执行待办
    expect(screen.getByText('整改能效标签')).toBeInTheDocument()
  })
})
