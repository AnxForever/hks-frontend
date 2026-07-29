import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldAlert, Clock, FileWarning } from 'lucide-react'

import LandingNav from '@/components/common/LandingNav'
import { BrandWordmark } from '@/components/common/BrandLogo'
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  landingCopy,
  LandingLangContext,
  useLandingLang,
  type Lang,
} from '@/pages/landing/content'

/**
 * LandingPage — 面向中小跨境卖家的业务化入口页。
 * 区块顺序：Hero(含产品预览卡) → 痛点共鸣 → 运作流程 → 全链路场景 → 产品演示
 *           → 政策动向 → 定价 → FAQ → CTA。
 *
 * 设计基调：保留奶油底色（cream）+ 衬线大标题的编辑部风格，
 * 借鉴 demo 的信息结构（Hero 预览、三步流程、KPI、信任条），不套用其 SaaS 皮肤。
 * 内容集中在 landing/content.ts，支持局部 ZH/EN 切换（不引 i18n 库）。
 */
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('zh')
  const t = landingCopy[lang]

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  return (
    <LandingLangContext.Provider value={{ lang, setLang, t }}>
      <div className="min-h-screen bg-cream text-cream-foreground">
        <LandingNav />

        <Hero />
        <PainPoints />
        <HowItWorks />
        <Scenarios />
        <ProductDemo />
        <PolicyNews />
        <Pricing />
        <Faq />
        <CallToAction />
        <SiteFooter />
      </div>
    </LandingLangContext.Provider>
  )
}

/* ─────────────────────────── Hero ─────────────────────────── */

const painIcons = [FileWarning, ShieldAlert, Clock]

function Hero() {
  const { t } = useLandingLang()
  return (
    <section className="pt-32 md:pt-40 pb-24 md:pb-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* 左：文案 */}
        <div>
          <RevealOnScroll>
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-8">
              {t.hero.eyebrow}
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tighter mb-12">
              {t.hero.titleLine1}
              <br />
              <span className="italic text-cream-foreground/80">{t.hero.titleLine2}</span>
            </h1>
          </RevealOnScroll>
          <div className="max-w-2xl">
            <RevealOnScroll delay={240}>
              <p className="font-sans text-lg md:text-xl text-cream-foreground/80 leading-relaxed mb-12">
                {t.hero.desc}
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={360}>
              <div className="flex flex-wrap items-center gap-8">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm text-cream bg-cream-foreground hover:bg-cream-foreground/85 transition-colors"
                >
                  {t.hero.ctaPrimary}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#demo"
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="group inline-flex items-center gap-3 text-sm text-cream-foreground/60 hover:text-cream-foreground transition-colors"
                >
                  <span className="relative">
                    {t.hero.ctaSecondary}
                    <span className="absolute left-0 bottom-0 w-0 h-px bg-cream-foreground group-hover:w-full transition-all duration-300" />
                  </span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </RevealOnScroll>
            {/* 信任条：只列可验证事实（不含无出处统计数字与未接入平台） */}
            <RevealOnScroll delay={480}>
              <p className="mt-12 text-xs uppercase tracking-[0.3em] text-cream-foreground/40">
                {t.hero.trust}
              </p>
            </RevealOnScroll>
          </div>
        </div>

        {/* 右：产品预览卡（借 demo 的信息结构，用 cream 语言重绘） */}
        <RevealOnScroll delay={240}>
          <HeroPreview />
        </RevealOnScroll>
      </div>
    </section>
  )
}

/** 产品预览卡：窗口栏 + KPI 三格 + AI 对话气泡 + 实时监控状态 */
function HeroPreview() {
  const { t } = useLandingLang()
  return (
    <div className="border border-rule/15 bg-cream-foreground/[0.02] shadow-lg">
      {/* 窗口栏 */}
      <div className="flex items-center justify-between border-b border-rule/10 px-5 py-3.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-cream-foreground/20" />
          <span className="size-2.5 rounded-full bg-cream-foreground/20" />
          <span className="size-2.5 rounded-full bg-cream-foreground/20" />
        </div>
        <span className="text-xs tracking-wide text-cream-foreground/40">{t.hero.previewUrl}</span>
      </div>

      <div className="p-6">
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-cream-foreground/40">
          {t.hero.previewTag}
        </p>

        {/* KPI 三格 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="border-l-2 border-emerald-600/50 bg-cream px-3 py-3">
            <div className="text-[11px] text-cream-foreground/50">{t.hero.kpiSafe}</div>
            <div className="mt-1 font-serif text-2xl text-emerald-700">12</div>
          </div>
          <div className="border-l-2 border-amber-500/50 bg-cream px-3 py-3">
            <div className="text-[11px] text-cream-foreground/50">{t.hero.kpiWarn}</div>
            <div className="mt-1 font-serif text-2xl text-amber-600">5</div>
          </div>
          <div className="border-l-2 border-red-600/50 bg-cream px-3 py-3">
            <div className="text-[11px] text-cream-foreground/50">{t.hero.kpiRisk}</div>
            <div className="mt-1 font-serif text-2xl text-red-600">1</div>
          </div>
        </div>

        {/* AI 对话气泡 */}
        <div className="border border-rule/15 bg-cream p-4">
          <div className="mb-3 flex justify-end">
            <p className="max-w-[85%] bg-cream-foreground/[0.06] px-3 py-2 text-xs leading-relaxed text-cream-foreground/80">
              {t.hero.chatQ}
            </p>
          </div>
          <div className="flex">
            <p className="max-w-[92%] bg-cream-foreground px-3 py-2 text-xs leading-relaxed text-cream">
              {t.hero.chatA}
            </p>
          </div>
        </div>

        {/* 实时监控状态 */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-cream-foreground/50">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
          {t.hero.monitorStatus}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── 痛点共鸣 ─────────────────────────── */

function PainPoints() {
  const { t } = useLandingLang()
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.pain.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.pain.title}</h2>
          </div>
        </RevealOnScroll>
        {/* 编辑式排版：去卡片化，用大序号 + 发丝分隔线建立杂志专栏感 */}
        <div className="border-t border-rule/10">
          {t.pain.items.map((p, idx) => {
            const Icon = painIcons[idx] ?? FileWarning
            return (
              <RevealOnScroll key={p.title} delay={idx * 60}>
                <article className="group grid grid-cols-1 border-b border-rule/10 py-10 transition-colors duration-500 md:grid-cols-[auto_1fr_1.5fr] md:items-start md:gap-10 hover:bg-cream-foreground/[0.015]">
                  {/* 大序号：衬线，作为视觉锚点，hover 时变实 */}
                  <span
                    className="select-none font-serif text-6xl leading-none tracking-tighter text-cream-foreground/15 transition-colors duration-500 group-hover:text-cream-foreground/40 md:text-7xl"
                    aria-hidden="true"
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {/* 标题：大字，带图标小标记 */}
                  <div className="mt-4 flex items-center gap-3 md:mt-0">
                    <Icon className="size-4 shrink-0 text-cream-foreground/40 transition-colors duration-500 group-hover:text-cream-foreground/70" aria-hidden="true" />
                    <h3 className="font-serif text-2xl tracking-tight transition-transform duration-500 group-hover:-translate-y-0.5 md:text-3xl">
                      {p.title}
                    </h3>
                  </div>
                  {/* 描述：左侧细发丝引导，弱化正文 */}
                  <div className="mt-4 border-l border-rule/20 pl-6 md:mt-0">
                    <p className="font-sans text-sm leading-relaxed text-cream-foreground/60 md:text-[15px]">
                      {p.description}
                    </p>
                  </div>
                </article>
              </RevealOnScroll>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── 运作流程（三步） ─────────────────────────── */

function HowItWorks() {
  const { t } = useLandingLang()
  return (
    <section id="how" className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.how.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.how.title}</h2>
          </div>
        </RevealOnScroll>
        <div className="grid md:grid-cols-3 gap-px bg-rule/10 border border-rule/10">
          {t.how.steps.map((s, idx) => (
            <RevealOnScroll key={s.step} delay={idx * 80} className="h-full">
              <article className="group relative h-full bg-cream p-8 transition-colors duration-300 hover:bg-cream-foreground/[0.03]">
                <p className="mb-5 text-xs font-medium tracking-[0.3em] text-cream-foreground/40">
                  {s.step}
                </p>
                <h3 className="mb-4 font-serif text-2xl tracking-tight">{s.title}</h3>
                <p className="font-sans text-sm text-cream-foreground/70 leading-relaxed">
                  {s.description}
                </p>
                <span className="mt-6 block h-px w-8 bg-cream-foreground/20 transition-all duration-500 group-hover:w-16 group-hover:bg-cream-foreground/50" aria-hidden="true" />
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── 全链路场景 ─────────────────────────── */

function Scenarios() {
  const { t } = useLandingLang()
  return (
    <section id="scenarios" className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.scenarios.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.scenarios.title}</h2>
          </div>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.scenarios.items.map((s, idx) => (
            <RevealOnScroll key={s.stage} delay={idx * 80}>
              <article className="group relative h-full overflow-hidden border border-rule/15 bg-cream-foreground/[0.02] p-7 pt-24 transition-all duration-300 hover:-translate-y-1.5 hover:border-cream-foreground/40 hover:shadow-lg">
                <span
                  className="absolute -top-6 -left-2 select-none font-serif text-9xl leading-none text-cream-foreground/[0.06] transition-colors duration-300 group-hover:text-cream-foreground/[0.12]"
                  aria-hidden="true"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="absolute top-7 right-7 border border-rule/20 px-3 py-1 text-xs tracking-[0.3em] text-cream-foreground/60 transition-colors duration-300 group-hover:border-cream-foreground group-hover:bg-cream-foreground group-hover:text-cream">
                  {s.stage}
                </span>
                <h3 className="relative mb-4 font-serif text-xl md:text-2xl tracking-tight">
                  {s.problem}
                </h3>
                <p className="relative font-sans text-sm text-cream-foreground/70 leading-relaxed">
                  {s.solution}
                </p>
                <span className="mt-6 block h-px w-8 bg-cream-foreground/20 transition-all duration-500 group-hover:w-full group-hover:bg-cream-foreground/50" aria-hidden="true" />
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── 产品演示 ─────────────────────────── */

function ProductDemo() {
  const { t } = useLandingLang()
  return (
    <section id="demo" className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.demo.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.demo.title}</h2>
          </div>
        </RevealOnScroll>
        <div className="grid lg:grid-cols-2 gap-10">
          {/* 左：对话演示 */}
          <RevealOnScroll>
            <div className="h-full border border-rule/15 bg-cream-foreground/[0.02] p-8 transition-all duration-300 hover:border-cream-foreground/30 hover:shadow-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-6">
                {t.demo.chatTag}
              </p>
              <div className="mb-6 flex justify-end">
                <p className="max-w-[85%] bg-cream-foreground text-cream px-4 py-3 text-sm leading-relaxed">
                  {t.demo.chatQuestion}
                </p>
              </div>
              <div className="border border-rule/15 bg-cream p-5">
                <p className="mb-4 flex items-center gap-2 text-xs text-cream-foreground/50 tracking-wide">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
                  {t.demo.answerTag}
                </p>
                <dl className="space-y-3">
                  {t.demo.answer.map((row, idx) => (
                    <RevealOnScroll key={row.label} delay={150 + idx * 150}>
                      <div className="flex gap-4 border-l-2 border-rule/15 pl-4 text-sm transition-colors duration-300 hover:border-cream-foreground/60">
                        <dt className="w-16 shrink-0 font-medium text-cream-foreground/50">{row.label}</dt>
                        <dd className="text-cream-foreground/90 leading-relaxed">{row.value}</dd>
                      </div>
                    </RevealOnScroll>
                  ))}
                </dl>
              </div>
            </div>
          </RevealOnScroll>

          {/* 右：风险预警 */}
          <RevealOnScroll delay={80}>
            <div className="h-full border border-rule/15 bg-cream-foreground/[0.02] p-8 transition-all duration-300 hover:border-cream-foreground/30 hover:shadow-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-6">
                {t.demo.alertTag}
              </p>
              <div className="space-y-4">
                {t.demo.alerts.map((a, idx) => (
                  <RevealOnScroll key={a.text} delay={200 + idx * 150}>
                    <div className={`border bg-cream px-5 py-4 transition-transform duration-300 hover:translate-x-1 ${a.tone}`}>
                      <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
                        <span className={`size-1.5 rounded-full animate-pulse ${a.dot}`} aria-hidden="true" />
                        {a.level}
                        <span className="ml-auto font-normal text-cream-foreground/40">{a.time}</span>
                      </div>
                      <p className="text-sm text-cream-foreground/80 leading-relaxed">{a.text}</p>
                    </div>
                  </RevealOnScroll>
                ))}
              </div>
              <p className="mt-6 text-xs text-cream-foreground/40 leading-relaxed">
                {t.demo.alertFooter}
              </p>
            </div>
          </RevealOnScroll>
        </div>
        <RevealOnScroll>
          <div className="mt-12">
            <Link to="/auth/signup" className="inline-block group">
              <div className="flex items-center gap-3 text-sm text-cream-foreground/60 hover:text-cream-foreground transition-colors">
                <span className="relative">
                  {t.demo.cta}
                  <span className="absolute left-0 bottom-0 w-0 h-px bg-cream-foreground group-hover:w-full transition-all duration-300" />
                </span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ─────────────────────────── 政策动向（静态样例） ─────────────────────────── */

function PolicyNews() {
  const { t } = useLandingLang()
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.policy.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.policy.title}</h2>
          </div>
        </RevealOnScroll>
        <div className="divide-y divide-rule/10 border-y border-rule/10">
          {t.policy.items.map((n, idx) => (
            <RevealOnScroll key={n.title} delay={idx * 60}>
              <article className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-8 px-2 py-7 transition-all duration-300 hover:bg-cream-foreground/[0.04] hover:px-5">
                <span className="text-xs tracking-[0.3em] text-cream-foreground/50 shrink-0 w-24">
                  {n.date}
                </span>
                <span className="w-fit shrink-0 border border-rule/20 px-2.5 py-1 text-xs tracking-[0.2em] text-cream-foreground/70 transition-colors duration-300 group-hover:border-cream-foreground group-hover:bg-cream-foreground group-hover:text-cream">
                  {n.region}
                </span>
                <p className="font-sans text-sm md:text-base text-cream-foreground/80 leading-relaxed transition-colors duration-300 group-hover:text-cream-foreground">
                  {idx === 0 && (
                    <span className="mr-3 inline-flex items-center gap-1.5 align-middle text-xs text-red-700">
                      <span className="size-1.5 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
                      {t.policy.latest}
                    </span>
                  )}
                  {n.title}
                </p>
                <ArrowRight
                  className="ml-auto hidden md:block size-4 shrink-0 -translate-x-2 text-cream-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-cream-foreground/60"
                  aria-hidden="true"
                />
              </article>
            </RevealOnScroll>
          ))}
        </div>
        <p className="mt-6 text-xs text-cream-foreground/40">{t.policy.footer}</p>
      </div>
    </section>
  )
}

/* ─────────────────────────── 定价 ─────────────────────────── */

function Pricing() {
  const { t } = useLandingLang()
  return (
    <section id="pricing" className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.pricing.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.pricing.title}</h2>
          </div>
        </RevealOnScroll>
        <div className="grid md:grid-cols-3 gap-8">
          {t.pricing.tiers.map((tier, idx) => (
            <RevealOnScroll key={tier.name} delay={idx * 60}>
              <article
                className={`flex h-full flex-col border p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                  tier.highlight
                    ? 'border-cream-foreground bg-cream-foreground/[0.03] shadow-lg'
                    : 'border-rule/15 hover:border-cream-foreground/40 hover:shadow-lg'
                }`}
              >
                <div className="flex items-baseline justify-between mb-6">
                  <h3 className="font-serif text-2xl tracking-tight">{tier.name}</h3>
                  {tier.highlight && (
                    <span className="bg-cream-foreground px-2.5 py-1 text-xs uppercase tracking-[0.3em] text-cream">
                      {t.pricing.recommended}
                    </span>
                  )}
                </div>
                <div className="mb-8">
                  <span className="font-sans text-5xl font-semibold tracking-tight tabular-nums">
                    {tier.price}
                  </span>
                  <span className="text-sm text-cream-foreground/40">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-10">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-cream-foreground/70 leading-relaxed">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-cream-foreground/40" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link
                    to={tier.to}
                    className={`inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm transition-colors ${
                      tier.highlight
                        ? 'bg-cream-foreground text-cream hover:bg-cream-foreground/85'
                        : 'border border-rule/20 text-cream-foreground/80 hover:border-cream-foreground hover:text-cream-foreground'
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
        <RevealOnScroll>
          <p className="mt-10 text-center text-sm text-cream-foreground/60">{t.pricing.note1}</p>
          <p className="mt-2 text-center text-xs text-cream-foreground/40">{t.pricing.note2}</p>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ─────────────────────────── FAQ ─────────────────────────── */

function Faq() {
  const { t } = useLandingLang()
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-4xl mx-auto">
        <RevealOnScroll>
          <div className="mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40 mb-4">
              {t.faq.eyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t.faq.title}</h2>
          </div>
        </RevealOnScroll>
        <RevealOnScroll>
          <Accordion type="single" collapsible className="w-full">
            {t.faq.items.map((f, idx) => (
              <AccordionItem key={f.q} value={`faq-${idx}`} className="border-rule/10">
                <AccordionTrigger className="text-left font-sans text-base text-cream-foreground hover:no-underline hover:text-cream-foreground/70">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-cream-foreground/60 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ─────────────────────────── CTA ─────────────────────────── */

function CallToAction() {
  const { t } = useLandingLang()
  return (
    <section className="py-32 md:py-48 px-6 md:px-12 border-t border-rule/10">
      <div className="max-w-4xl mx-auto text-center">
        <RevealOnScroll>
          <h2 className="font-serif text-5xl md:text-7xl tracking-tight mb-8">{t.cta.title}</h2>
          <p className="font-sans text-lg text-cream-foreground/60 mb-12">{t.cta.desc}</p>
          <Link to="/auth/signup" className="inline-block group">
            <div className="flex items-center justify-center gap-3 text-sm text-cream-foreground/60 hover:text-cream-foreground transition-colors">
              <span className="relative">
                {t.cta.button}
                <span className="absolute left-0 bottom-0 w-0 h-px bg-cream-foreground group-hover:w-full transition-all duration-300" />
              </span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </RevealOnScroll>
      </div>
    </section>
  )
}

/* ─────────────────────────── Footer ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-rule/10 py-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <BrandWordmark logoClassName="w-12 h-12" />
          <div className="text-xs uppercase tracking-[0.3em] text-cream-foreground/40">
            © {new Date().getFullYear()} YUANDU
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────── Reveal-on-scroll ─────────────────────────── */

/**
 * 滚动渐显包装器：元素进入视口后淡入 + 上移归位，只播放一次。
 *
 * 早前版本因 Playwright fullPage 截图与 opacity 过渡竞态导致下方区块空白
 * 而被移除；本版通过以下兜底彻底规避该问题：
 *  - 自动化环境（navigator.webdriver，含 Playwright 截图）直接静态呈现
 *  - prefers-reduced-motion 直接静态呈现（index.css 全局规则的双保险）
 *  - 不支持 IntersectionObserver 的环境直接静态呈现
 */
function RevealOnScroll({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(shouldSkipReveal)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -48px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className
      )}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/** 静态呈现判定：命中任一条件则跳过动画，首帧即完整可见 */
function shouldSkipReveal(): boolean {
  if (typeof window === 'undefined') return true
  if (navigator.webdriver) return true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true
  if (!('IntersectionObserver' in window)) return true
  return false
}
