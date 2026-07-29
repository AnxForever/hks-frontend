import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useLandingLang, type Lang } from '@/pages/landing/content'
import { BrandWordmark } from '@/components/common/BrandLogo'

interface NavLink {
  label: string
  to: string
  variant?: 'link' | 'cta'
  /** When set, intercepts click to smooth-scroll to an in-page anchor */
  anchor?: string
}

/**
 * LandingPage 顶部导航。
 * - 桌面端（md+）：水平链接 + ZH/EN 语言切换
 * - 移动端：汉堡按钮 → Sheet 抽屉（切换开关置于抽屉内）
 * - 链接文案走 landing/content.ts 字典，随语言切换
 * - 全部走 design tokens（bg-cream / text-cream-foreground / border-rule）
 */
export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isLandingPage = location.pathname === '/'
  const { t } = useLandingLang()

  const links: NavLink[] = [
    { label: t.nav.scenarios, to: '/#scenarios', anchor: 'scenarios' },
    { label: t.nav.how, to: '/#how', anchor: 'how' },
    { label: t.nav.demo, to: '/#demo', anchor: 'demo' },
    { label: t.nav.pricing, to: '/#pricing', anchor: 'pricing' },
    { label: t.nav.login, to: '/auth/login', variant: 'link' },
    { label: t.nav.signup, to: '/auth/signup', variant: 'cta' },
  ]

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-rule/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 md:h-20 flex items-center justify-between">
        {/* Wordmark */}
        <Link to="/" aria-label="猿渡科技 · 避风港 SafeHarbor">
          <BrandWordmark logoClassName="w-9 h-9 md:w-10 md:h-10" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-12">
          {links.map((link) => (
            <NavItem
              key={link.label}
              link={link}
              onNavigate={() => {}}
              isLandingPage={isLandingPage}
            />
          ))}
          <LangToggle />
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-cream-foreground hover:bg-rule/5"
              aria-label="打开菜单"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-cream border-l border-rule/10 w-72 p-8"
          >
            <SheetTitle className="sr-only">站点导航</SheetTitle>
            <SheetDescription className="sr-only">
              前往场景、演示、定价介绍或登录页面。
            </SheetDescription>
            <div className="flex flex-col gap-8 mt-8">
              {links.map((link) => (
                <NavItem
                  key={link.label}
                  link={link}
                  onNavigate={() => setOpen(false)}
                  mobile
                  isLandingPage={isLandingPage}
                />
              ))}
              <LangToggle />
            </div>
            <p className="absolute bottom-8 left-8 text-xs uppercase tracking-[0.3em] text-cream-foreground/40">
              避风港
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}

/** ZH / EN 语言切换分段控件（脱离落地页 Provider 时切换为空操作，仍安全渲染）。 */
function LangToggle() {
  const { lang, setLang } = useLandingLang()
  const options: { key: Lang; label: string }[] = [
    { key: 'zh', label: '中' },
    { key: 'en', label: 'EN' },
  ]
  return (
    <div
      className="inline-flex overflow-hidden border border-rule/20 text-xs"
      role="group"
      aria-label="语言切换 / Language"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setLang(o.key)}
          aria-pressed={lang === o.key}
          className={cn(
            'px-2.5 py-1 tracking-wide transition-colors',
            lang === o.key
              ? 'bg-cream-foreground text-cream'
              : 'text-cream-foreground/60 hover:text-cream-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function NavItem({
  link,
  onNavigate,
  mobile = false,
  isLandingPage,
}: {
  link: NavLink
  onNavigate: () => void
  mobile?: boolean
  isLandingPage: boolean
}) {
  const base =
    'group relative text-sm tracking-wide transition-colors text-cream-foreground/60 hover:text-cream-foreground'
  const cta =
    'inline-flex items-center gap-2 px-5 py-2.5 text-sm text-cream bg-cream-foreground hover:bg-cream-foreground/85 transition-colors'
  const mobileBase = 'text-2xl font-serif tracking-tight'
  const mobileCta = 'inline-flex items-center justify-center px-6 py-3 text-sm tracking-wide text-cream bg-cream-foreground'

  if (link.variant === 'cta') {
    return (
      <Link
        to={link.to}
        onClick={onNavigate}
        className={cn(mobile ? mobileCta : cta)}
      >
        {link.label}
        <span aria-hidden>→</span>
      </Link>
    )
  }

  if (link.anchor) {
    if (!isLandingPage) {
      return (
        <a
          href={link.to}
          onClick={onNavigate}
          className={cn(base, mobile && mobileBase)}
        >
          {link.label}
          <span
            className={cn(
              'absolute left-0 -bottom-1 h-px bg-cream-foreground transition-all duration-300 w-0 group-hover:w-full',
              mobile && 'relative bottom-auto left-auto h-px w-0 mt-1'
            )}
          />
        </a>
      )
    }

    return (
      <a
        href={`#${link.anchor}`}
        onClick={(e) => {
          e.preventDefault()
          document
            .getElementById(link.anchor!)
            ?.scrollIntoView({ behavior: 'smooth' })
          onNavigate()
        }}
        className={cn(base, mobile && mobileBase)}
      >
        {link.label}
        <span
          className={cn(
            'absolute left-0 -bottom-1 h-px bg-cream-foreground transition-all duration-300 w-0 group-hover:w-full',
            mobile && 'relative bottom-auto left-auto h-px w-0 mt-1'
          )}
        />
      </a>
    )
  }

  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className={cn(base, mobile && mobileBase)}
    >
      {link.label}
      <span
        className={cn(
          'absolute left-0 -bottom-1 h-px bg-cream-foreground transition-all duration-300 w-0 group-hover:w-full',
          mobile && 'relative bottom-auto left-auto h-px w-0 mt-1'
        )}
      />
    </Link>
  )
}
