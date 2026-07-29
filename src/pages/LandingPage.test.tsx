import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import LandingPage from './LandingPage'
import { landingCopy } from './landing/content'

const zh = landingCopy.zh
const en = landingCopy.en

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  it('默认以中文渲染核心区块', () => {
    renderPage()

    // Hero 标题（分两行，用 titleLine2 断言更稳）
    expect(screen.getByText(zh.hero.titleLine2)).toBeInTheDocument()
    // 痛点、运作流程、场景、演示、定价、FAQ、CTA 的标题各出现一次
    expect(screen.getByText(zh.pain.title)).toBeInTheDocument()
    expect(screen.getByText(zh.how.title)).toBeInTheDocument()
    expect(screen.getByText(zh.scenarios.title)).toBeInTheDocument()
    expect(screen.getByText(zh.demo.title)).toBeInTheDocument()
    expect(screen.getByText(zh.pricing.title)).toBeInTheDocument()
    expect(screen.getByText(zh.faq.title)).toBeInTheDocument()
    expect(screen.getByText(zh.cta.title)).toBeInTheDocument()
  })

  it('渲染 Hero 产品预览卡的 KPI 数字与标签', () => {
    renderPage()

    // KPI 三格标签
    expect(screen.getByText(zh.hero.kpiSafe)).toBeInTheDocument()
    expect(screen.getByText(zh.hero.kpiWarn)).toBeInTheDocument()
    expect(screen.getByText(zh.hero.kpiRisk)).toBeInTheDocument()
    // KPI 数字（预览卡内静态样例）
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(zh.hero.monitorStatus)).toBeInTheDocument()
  })

  it('渲染三步运作流程的每个步骤', () => {
    renderPage()

    for (const step of zh.how.steps) {
      expect(screen.getByText(step.step)).toBeInTheDocument()
      expect(screen.getByText(step.title)).toBeInTheDocument()
    }
  })

  it('点击语言切换后整页文案切换为英文', () => {
    renderPage()

    // 切换前：中文 Hero 描述在场
    expect(screen.getByText(zh.hero.desc)).toBeInTheDocument()

    // 语言切换控件里点 "EN"
    const langGroup = screen.getByRole('group', { name: /语言切换|Language/i })
    fireEvent.click(within(langGroup).getByText('EN'))

    // 切换后：英文文案出现，中文消失
    expect(screen.getByText(en.hero.desc)).toBeInTheDocument()
    expect(screen.queryByText(zh.hero.desc)).not.toBeInTheDocument()
    expect(screen.getByText(en.how.title)).toBeInTheDocument()
    expect(screen.getByText(en.pricing.title)).toBeInTheDocument()
  })

  it('切换回中文可复原', () => {
    renderPage()

    const langGroup = screen.getByRole('group', { name: /语言切换|Language/i })
    fireEvent.click(within(langGroup).getByText('EN'))
    expect(screen.getByText(en.hero.desc)).toBeInTheDocument()

    fireEvent.click(within(langGroup).getByText('中'))
    expect(screen.getByText(zh.hero.desc)).toBeInTheDocument()
    expect(screen.queryByText(en.hero.desc)).not.toBeInTheDocument()
  })
})
