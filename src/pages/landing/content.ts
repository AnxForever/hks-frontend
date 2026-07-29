import { createContext, useContext } from 'react'

/**
 * 落地页双语内容字典（局部 i18n，不引第三方库）。
 *
 * 设计取舍：全站其余页面仍为中文单语，此处仅为面向出海用户的
 * 落地页提供 ZH/EN 切换。内容集中在此，组件只读不写，便于维护。
 */
export type Lang = 'zh' | 'en'

export interface LandingCopy {
  nav: {
    scenarios: string
    how: string
    demo: string
    pricing: string
    login: string
    signup: string
  }
  hero: {
    eyebrow: string
    titleLine1: string
    titleLine2: string
    desc: string
    ctaPrimary: string
    ctaSecondary: string
    trust: string
    // 产品预览卡
    previewTag: string
    previewUrl: string
    kpiSafe: string
    kpiWarn: string
    kpiRisk: string
    chatQ: string
    chatA: string
    monitorStatus: string
  }
  pain: {
    eyebrow: string
    title: string
    items: { title: string; description: string }[]
  }
  how: {
    eyebrow: string
    title: string
    steps: { step: string; title: string; description: string }[]
  }
  scenarios: {
    eyebrow: string
    title: string
    items: { stage: string; problem: string; solution: string }[]
  }
  demo: {
    eyebrow: string
    title: string
    chatTag: string
    chatQuestion: string
    answerTag: string
    answer: { label: string; value: string }[]
    alertTag: string
    alerts: { tone: string; dot: string; level: string; text: string; time: string }[]
    alertFooter: string
    cta: string
  }
  policy: {
    eyebrow: string
    title: string
    latest: string
    footer: string
    items: { date: string; region: string; title: string }[]
  }
  pricing: {
    eyebrow: string
    title: string
    recommended: string
    note1: string
    note2: string
    tiers: {
      name: string
      price: string
      period: string
      highlight: boolean
      features: string[]
      cta: string
      to: string
    }[]
  }
  faq: {
    eyebrow: string
    title: string
    items: { q: string; a: string }[]
  }
  cta: {
    title: string
    desc: string
    button: string
  }
}

const zh: LandingCopy = {
  nav: {
    scenarios: '场景',
    how: '运作流程',
    demo: '演示',
    pricing: '定价',
    login: '登录',
    signup: '开始使用',
  },
  hero: {
    eyebrow: '跨境合规智能助手',
    titleLine1: '跨境合规，',
    titleLine2: '不再是玄学',
    desc: '输入产品和目标国家，AI 秒级给出认证清单、HS 编码与税率——像雇了一位 24 小时在线的合规顾问，但只要顾问 1/10 的价格。',
    ctaPrimary: '免费开始',
    ctaSecondary: '查看演示',
    trust: '选品 · 上架 · 销售 · 物流 全链路覆盖  /  欧盟 · 美国 · 日本 · 韩国 法规知识内置',
    previewTag: '产品预览',
    previewUrl: 'safeharbor.app/dashboard',
    kpiSafe: '合规店铺',
    kpiWarn: '待处理预警',
    kpiRisk: '高风险项',
    chatQ: '「美国销售充电宝需要什么认证？」',
    chatA: '需 UN38.3 + FCC + UL2056，建议同步关注 CPSC 召回清单。',
    monitorStatus: '实时监控中 · 上次扫描 2 分钟前',
  },
  pain: {
    eyebrow: '这些坑，出海卖家都踩过',
    title: '合规出错的代价，从来不便宜',
    items: [
      {
        title: '认证费白花了',
        description: '花几万块做的认证，到了目标国家才发现标准不对口。缺一张证书，整批货只能压在仓库里。',
      },
      {
        title: '货被海关扣了',
        description: 'HS 编码报错一位，税率翻倍还要补申报。清关卡两周，旺季的现金流直接断档。',
      },
      {
        title: '店铺被下架了',
        description: '平台合规政策一年改好几轮，等收到下架邮件才知道新规生效。申诉周期里，链接权重已经掉光。',
      },
    ],
  },
  how: {
    eyebrow: '运作流程',
    title: '三步，搞定全链路合规',
    steps: [
      {
        step: 'STEP 01',
        title: '了解政策',
        description: '实时聚合各国法规、关税与高频查询场景，一站式掌握目标市场的政策动向。',
      },
      {
        step: 'STEP 02',
        title: '具体查询',
        description: '输入产品与目标国家，AI 秒级输出 HS 编码、税率、认证清单，结论附法规出处。',
      },
      {
        step: 'STEP 03',
        title: '持续监控',
        description: '接入店铺后自动扫描，红黄蓝三级预警，法规变动与申报期限第一时间触达。',
      },
    ],
  },
  scenarios: {
    eyebrow: '全链路场景',
    title: '从选品到清关，每一步都有人盯',
    items: [
      {
        stage: '选品',
        problem: '这个品能不能卖到那个国家？',
        solution: '下单开模前先查禁限售与认证门槛，避免选中根本进不去的市场。',
      },
      {
        stage: '上架',
        problem: '认证、标签、说明书到底要备哪些？',
        solution: '按产品和目标国家生成认证清单与待办任务，逐项打勾完成再上架。',
      },
      {
        stage: '销售',
        problem: 'HS 编码、税率、VAT 申报别再猜',
        solution: '秒级给出编码与税率依据，申报期限提前提醒，法规变动自动预警。',
      },
      {
        stage: '物流',
        problem: '清关文件缺一样，货就走不动',
        solution: '发货前核对清关文件清单，物流轨迹与合规状态一屏追踪。',
      },
    ],
  },
  demo: {
    eyebrow: '产品演示',
    title: '问一句，就是一份能落地的清单',
    chatTag: '智能对话',
    chatQuestion: '充电宝出口美国需要哪些认证？',
    answerTag: 'AI 合规助手 · 结论附法规出处',
    answer: [
      { label: '强制认证', value: 'UN38.3 运输测试 · FCC Part 15 · UL 2056（亚马逊要求）' },
      { label: 'HS 编码', value: '8504.40（静止式变流器 — 充电宝归类）' },
      { label: '进口税率', value: '基础税率 0% + 301 关税（按批次核实）' },
      { label: '监管要点', value: 'CPSC 事故通报义务 · 容量标识需与铭牌一致' },
    ],
    alertTag: '风险预警',
    alerts: [
      {
        tone: 'border-red-600/40 text-red-700',
        dot: 'bg-red-600',
        level: '高风险',
        text: '缺 UL 2056 认证 · SKU PB-20K · Amazon US',
        time: '2 小时前',
      },
      {
        tone: 'border-amber-500/40 text-amber-700',
        dot: 'bg-amber-500',
        level: '待处理',
        text: '德国 VAT 申报截止倒计时 5 天',
        time: '今天',
      },
      {
        tone: 'border-sky-600/40 text-sky-700',
        dot: 'bg-sky-600',
        level: '新规提示',
        text: '欧盟 GPSR 新规将影响 12 个在售 SKU',
        time: '昨天',
      },
    ],
    alertFooter: '店铺产品自动扫描，红黄蓝三级预警，附具体整改建议。',
    cta: '免费体验完整版',
  },
  policy: {
    eyebrow: '政策动向',
    title: '法规一直在变，平台替你盯着',
    latest: '最新',
    footer: '样例条目 · 注册后可按品类与市场订阅实时法规监控与推送',
    items: [
      {
        date: '2026-07',
        region: '欧盟',
        title: 'GPSR 通用产品安全新规全面执行，无欧盟责任人产品将被平台强制下架',
      },
      {
        date: '2026-06',
        region: '美国',
        title: 'CPSC 加强锂电池类产品事故通报审查，充电宝品类召回数量同比上升',
      },
      {
        date: '2026-06',
        region: '日本',
        title: 'PSE 认证目录更新，新增多类小家电纳入菱形 PSE 强制范围',
      },
    ],
  },
  pricing: {
    eyebrow: '定价',
    title: '订阅底座，额度透明，超出按量',
    recommended: '推荐',
    note1: '成本参考：外包合规咨询 ¥500–2000/次 · 专业版月费不到外包一次咨询的价格',
    note2: '在线支付通道内测中，订阅按钮暂为登录后留资入口',
    tiers: [
      {
        name: '免费版',
        price: 'Free',
        period: '',
        highlight: false,
        features: ['每月 10 次合规查询额度', '1 个店铺接入', '基础风险提醒'],
        cta: '免费开始',
        to: '/auth/signup',
      },
      {
        name: '专业版',
        price: '¥299',
        period: '/月',
        highlight: true,
        features: [
          '月度额度覆盖典型单店铺全部合规场景',
          '超出后按量充值，用多少付多少',
          '5 个店铺 · 实时风险扫描',
          '法规监控推送 · PDF 报告导出',
        ],
        cta: '登录后订阅',
        to: '/auth/login',
      },
      {
        name: '团队版',
        price: '¥599',
        period: '/月',
        highlight: false,
        features: ['专业版全部权益', '多店铺共享额度池', '多成员协作 · API 接入', '专属知识库 · 优先支持'],
        cta: '登录后订阅',
        to: '/auth/login',
      },
    ],
  },
  faq: {
    eyebrow: '常见问题',
    title: '你可能想问',
    items: [
      {
        q: 'AI 给出的结论能直接拿去报关吗？',
        a: '平台结论均附法规出处，可作为申报与备证的工作依据；正式报关文件建议由报关行按最终清单复核签发，平台的价值是把外包顾问几天的调研压缩到几秒。',
      },
      {
        q: '我的店铺和产品数据安全吗？',
        a: '店铺授权仅用于读取商品与订单信息做合规扫描，数据加密存储、不与第三方共享；可随时在设置中解除授权并删除数据。',
      },
      {
        q: '目前支持哪些电商平台？',
        a: '当前支持 Shopify 一键接入，Amazon 等平台在规划中；未接入平台的商品也可以手动录入后做合规检查。',
      },
      {
        q: '免费版的 10 次查询用完了怎么办？',
        a: '可以升级专业版获得月度额度，或等下月额度刷新；专业版超出月度额度后按量充值，用多少付多少。',
      },
      {
        q: '覆盖哪些目标市场？',
        a: '内置欧盟、美国、日本、韩国等主要市场的法规知识，并持续更新；小众市场可通过导入当地法规文件获得同等的查询体验。',
      },
    ],
  },
  cta: {
    title: '下一批货，合规先行',
    desc: '注册即享每月 10 次免费合规查询，不绑卡、不设隐藏门槛',
    button: '免费开始',
  },
}

const en: LandingCopy = {
  nav: {
    scenarios: 'Scenarios',
    how: 'How it works',
    demo: 'Demo',
    pricing: 'Pricing',
    login: 'Log in',
    signup: 'Get started',
  },
  hero: {
    eyebrow: 'AI compliance assistant for cross-border sellers',
    titleLine1: 'Cross-border compliance,',
    titleLine2: 'no more guesswork',
    desc: 'Enter your product and target market — AI returns the certification checklist, HS code, and tax rate in seconds. Like a 24/7 compliance advisor, at a tenth of the cost.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'See demo',
    trust: 'Full chain: sourcing · listing · selling · logistics  /  Built-in regulations: EU · US · Japan · Korea',
    previewTag: 'Product preview',
    previewUrl: 'safeharbor.app/dashboard',
    kpiSafe: 'Compliant stores',
    kpiWarn: 'Pending alerts',
    kpiRisk: 'High-risk items',
    chatQ: '"What certifications are needed to sell power banks in the US?"',
    chatA: 'UN38.3 + FCC + UL2056. Also monitor the CPSC recall list.',
    monitorStatus: 'Live monitoring · Last scan 2 min ago',
  },
  pain: {
    eyebrow: 'Every seller has been burned by these',
    title: 'Getting compliance wrong is never cheap',
    items: [
      {
        title: 'Certification money wasted',
        description: 'You spend a fortune on certs, then find the standard doesn’t match the target market. One missing certificate and the whole shipment sits in the warehouse.',
      },
      {
        title: 'Goods held at customs',
        description: 'One wrong digit in the HS code doubles the tariff and forces a re-filing. Clearance stalls for two weeks and peak-season cash flow dries up.',
      },
      {
        title: 'Store taken down',
        description: 'Platform policies change several times a year. By the time the takedown email arrives, the new rule is already in force and your listing rank is gone.',
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: 'Three steps to full-chain compliance',
    steps: [
      {
        step: 'STEP 01',
        title: 'Understand policy',
        description: 'Real-time aggregation of regulations, tariffs, and common queries — grasp the policy landscape of your target market in one place.',
      },
      {
        step: 'STEP 02',
        title: 'Query specifics',
        description: 'Enter product and target country; AI returns HS codes, tax rates, and certification checklists in seconds, each backed by a regulatory source.',
      },
      {
        step: 'STEP 03',
        title: 'Monitor continuously',
        description: 'Auto-scan once your store is connected. Red/Yellow/Blue alerts surface rule changes and filing deadlines the moment they matter.',
      },
    ],
  },
  scenarios: {
    eyebrow: 'Full-chain scenarios',
    title: 'From sourcing to clearance, every step is watched',
    items: [
      {
        stage: 'Sourcing',
        problem: 'Can this product even be sold there?',
        solution: 'Check bans, restrictions, and cert thresholds before tooling up — avoid picking a market you can’t enter.',
      },
      {
        stage: 'Listing',
        problem: 'Which certs, labels, and manuals do I need?',
        solution: 'Generate a cert checklist and to-do list by product and target country — tick each item off before you go live.',
      },
      {
        stage: 'Selling',
        problem: 'Stop guessing HS codes, tax rates, and VAT',
        solution: 'Instant codes and rate basis, filing-deadline reminders, and automatic alerts when regulations change.',
      },
      {
        stage: 'Logistics',
        problem: 'One missing clearance doc stops the shipment',
        solution: 'Verify the clearance document checklist before shipping; track logistics and compliance status on one screen.',
      },
    ],
  },
  demo: {
    eyebrow: 'Product demo',
    title: 'Ask once, get a checklist you can act on',
    chatTag: 'AI Chat',
    chatQuestion: 'What certifications do power banks need to be exported to the US?',
    answerTag: 'AI compliance assistant · conclusions cite regulatory sources',
    answer: [
      { label: 'Certs', value: 'UN38.3 transport test · FCC Part 15 · UL 2056 (Amazon requirement)' },
      { label: 'HS code', value: '8504.40 (static converters — power bank classification)' },
      { label: 'Import duty', value: 'Base rate 0% + Section 301 tariff (verify per batch)' },
      { label: 'Regulatory', value: 'CPSC incident reporting duty · capacity label must match nameplate' },
    ],
    alertTag: 'Risk alerts',
    alerts: [
      {
        tone: 'border-red-600/40 text-red-700',
        dot: 'bg-red-600',
        level: 'High risk',
        text: 'Missing UL 2056 cert · SKU PB-20K · Amazon US',
        time: '2 hours ago',
      },
      {
        tone: 'border-amber-500/40 text-amber-700',
        dot: 'bg-amber-500',
        level: 'Pending',
        text: 'Germany VAT filing due in 5 days',
        time: 'Today',
      },
      {
        tone: 'border-sky-600/40 text-sky-700',
        dot: 'bg-sky-600',
        level: 'New rule',
        text: 'EU GPSR update will affect 12 live SKUs',
        time: 'Yesterday',
      },
    ],
    alertFooter: 'Store products are auto-scanned with Red/Yellow/Blue alerts and specific remediation advice.',
    cta: 'Try the full version free',
  },
  policy: {
    eyebrow: 'Policy updates',
    title: 'Regulations keep changing — the platform watches for you',
    latest: 'Latest',
    footer: 'Sample entries · after signup, subscribe to live regulatory monitoring by category and market',
    items: [
      {
        date: '2026-07',
        region: 'EU',
        title: 'GPSR general product safety rules now in full force — products without an EU responsible person face mandatory takedown',
      },
      {
        date: '2026-06',
        region: 'US',
        title: 'CPSC tightens incident-report review for lithium battery products; power bank recalls up year over year',
      },
      {
        date: '2026-06',
        region: 'Japan',
        title: 'PSE certification catalog updated — more small appliances added to mandatory diamond-PSE scope',
      },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Subscription base, transparent quota, pay-as-you-go overage',
    recommended: 'Popular',
    note1: 'Reference: outsourced compliance consulting runs ¥500–2000/session — Pro costs less than a single consultation.',
    note2: 'Online payment is in private beta; subscribe buttons currently lead to a post-login sign-up.',
    tiers: [
      {
        name: 'Free',
        price: 'Free',
        period: '',
        highlight: false,
        features: ['10 compliance queries per month', '1 store connection', 'Basic risk alerts'],
        cta: 'Start free',
        to: '/auth/signup',
      },
      {
        name: 'Pro',
        price: '¥299',
        period: '/mo',
        highlight: true,
        features: [
          'Monthly quota covers a typical single-store workload',
          'Pay-as-you-go beyond the quota',
          '5 stores · real-time risk scanning',
          'Regulatory push · PDF report export',
        ],
        cta: 'Subscribe after login',
        to: '/auth/login',
      },
      {
        name: 'Team',
        price: '¥599',
        period: '/mo',
        highlight: false,
        features: ['Everything in Pro', 'Shared quota pool across stores', 'Multi-member collaboration · API access', 'Private knowledge base · priority support'],
        cta: 'Subscribe after login',
        to: '/auth/login',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'You might be wondering',
    items: [
      {
        q: 'Can I file customs directly with the AI’s conclusions?',
        a: 'Every conclusion cites a regulatory source and can serve as a working basis for filing and documentation. Official customs paperwork should be reviewed and signed off by your broker against the final checklist — the platform’s value is compressing days of consultant research into seconds.',
      },
      {
        q: 'Is my store and product data safe?',
        a: 'Store authorization is used only to read product and order info for compliance scanning. Data is encrypted at rest and never shared with third parties; you can revoke access and delete data anytime in settings.',
      },
      {
        q: 'Which e-commerce platforms are supported?',
        a: 'One-click Shopify integration is available now; Amazon and others are on the roadmap. Products on unsupported platforms can be entered manually for compliance checks.',
      },
      {
        q: 'What happens when the free tier’s 10 queries run out?',
        a: 'Upgrade to Pro for a monthly quota, or wait for next month’s reset. Pro bills pay-as-you-go beyond the monthly quota.',
      },
      {
        q: 'Which target markets are covered?',
        a: 'Built-in regulatory knowledge for major markets including the EU, US, Japan, and Korea, updated continuously. Niche markets get the same experience by importing local regulation files.',
      },
    ],
  },
  cta: {
    title: 'Next shipment, compliance first',
    desc: 'Sign up for 10 free compliance queries a month — no card, no hidden gates',
    button: 'Start free',
  },
}

export const landingCopy: Record<Lang, LandingCopy> = { zh, en }

/** 落地页语言上下文；非落地页路由下可能为 null，消费方需容错。 */
export interface LandingLangValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: LandingCopy
}

export const LandingLangContext = createContext<LandingLangValue | null>(null)

/** 读取落地页语言上下文；脱离 Provider 时回退到中文，供 LandingNav 等复用组件安全消费。 */
export function useLandingLang(): LandingLangValue {
  const ctx = useContext(LandingLangContext)
  if (ctx) return ctx
  return { lang: 'zh', setLang: () => {}, t: landingCopy.zh }
}
