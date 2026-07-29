/**
 * costModel 折算工具测试（R8）。
 * 覆盖：usage 提取的两种形态与无效输入、折算与节省计算、¥ 格式化分档。
 */
import { describe, expect, it } from 'vitest'

import {
  DIRECT_LLM_PRICE_CNY_PER_1K,
  PLATFORM_PRICE_CNY_PER_1K,
  formatCNY,
  platformCostCNY,
  roleLabel,
  savedCNY,
  tokensFromUsage,
} from './costModel'

describe('tokensFromUsage', () => {
  it('优先读取 total_tokens', () => {
    expect(tokensFromUsage({ total_tokens: 1840 })).toBe(1840)
  })

  it('无 total_tokens 时回退 input+output 相加', () => {
    expect(tokensFromUsage({ input_tokens: 1200, output_tokens: 600 })).toBe(1800)
  })

  it('无有效数字时返回 0（界面隐藏成本条，不伪造数字）', () => {
    expect(tokensFromUsage(undefined)).toBe(0)
    expect(tokensFromUsage(null)).toBe(0)
    expect(tokensFromUsage({})).toBe(0)
    expect(tokensFromUsage({ mode: 'mock_stream', events: 10 })).toBe(0)
    expect(tokensFromUsage({ total_tokens: -5 })).toBe(0)
  })
})

describe('折算与节省', () => {
  it('平台折算 = tokens/1000 × 平台单价', () => {
    expect(platformCostCNY(2000)).toBeCloseTo(2 * PLATFORM_PRICE_CNY_PER_1K)
  })

  it('节省 = 直调成本 − 平台成本，且不为负', () => {
    const tokens = 10_000
    expect(savedCNY(tokens)).toBeCloseTo(
      (tokens / 1000) * (DIRECT_LLM_PRICE_CNY_PER_1K - PLATFORM_PRICE_CNY_PER_1K),
    )
    expect(savedCNY(0)).toBe(0)
  })
})

describe('formatCNY', () => {
  it('分档格式化：0 / 小额三位 / 常规两位 / 大额取整', () => {
    expect(formatCNY(0)).toBe('¥0')
    expect(formatCNY(0.0221)).toBe('¥0.022')
    expect(formatCNY(3.5)).toBe('¥3.50')
    expect(formatCNY(6100)).toBe(`¥${(6100).toLocaleString('zh-CN')}`)
  })
})

describe('roleLabel', () => {
  it('已知角色映射为中文业务用途，未知角色原样返回', () => {
    expect(roleLabel('risk_analysis')).toBe('风险分析')
    expect(roleLabel('custom_role')).toBe('custom_role')
  })
})
