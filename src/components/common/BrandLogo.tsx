/**
 * 品牌 —— 「猿渡科技 / 避风港 SafeHarbor」
 *
 * 第二张品牌规范图的排版：
 *   [logo图标]  猿渡科技 YUANDU   ← 公司名（上）
 *               避风港 SafeHarbor  ← 产品名（下）
 *
 * - BrandLogo      单独的 logo 图标（public/brand/logo-1.jpg，透明背景）
 * - BrandWordmark  logo + 双行文字，用于导航 / 页脚品牌区
 */

export function BrandLogo({
  className = 'w-10 h-10',
}: {
  className?: string
}) {
  return (
    <img
      src="/brand/logo-1.jpg"
      alt="避风港 SafeHarbor"
      className={className}
      style={{ objectFit: 'contain' }}
      draggable={false}
    />
  )
}

/** 完整品牌区：logo + 右侧两行文字（公司名在上、产品名在下） */
export function BrandWordmark({
  logoClassName = 'w-10 h-10',
  /** 文字颜色主题：在浅色/奶油底上用深色文字 */
  tone = 'dark',
  className,
}: {
  logoClassName?: string
  tone?: 'dark' | 'light'
  className?: string
}) {
  const company = tone === 'dark' ? 'text-[#0B1E3F]' : 'text-white'
  const companyEn = tone === 'dark' ? 'text-[#0B1E3F]/50' : 'text-white/55'
  const product = tone === 'dark' ? 'text-[#B3541E]' : 'text-[#E8A882]'
  const productEn = tone === 'dark' ? 'text-[#B3541E]/70' : 'text-[#E8A882]/80'

  return (
    <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <BrandLogo className={`shrink-0 ${logoClassName}`} />
      <span className="leading-tight">
        {/* 公司名（上） */}
        <span className="block">
          <span className={`font-serif text-[15px] tracking-[0.18em] ${company}`}>
            猿渡科技
          </span>
          <span className={`ml-1.5 text-[11px] tracking-[0.25em] ${companyEn}`}>
            YUANDU
          </span>
        </span>
        {/* 产品名（下） */}
        <span className="mt-0.5 block">
          <span className={`font-serif text-[13px] tracking-[0.1em] ${product}`}>
            避风港
          </span>
          <span className={`ml-1.5 text-[12px] tracking-[0.1em] ${productEn}`}>
            SafeHarbor
          </span>
        </span>
      </span>
    </span>
  )
}

export default BrandLogo
