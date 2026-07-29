# 避风港跨境合规智能体平台 - 前端实现文档

**相关文档**:
- [设计系统文档](design-system.md) — 颜色、字体、组件库等设计规范
- [页面结构图与交互流程图](diagrams.md) — 路由结构、交互时序、状态流转图

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [路由系统](#4-路由系统)
5. [状态管理](#5-状态管理)
6. [组件架构](#6-组件架构)
7. [API通信](#7-api通信)
8. [类型系统](#8-类型系统)
9. [编码规范](#9-编码规范)
10. [性能优化](#10-性能优化)
11. [安全规范](#11-安全规范)

---

## 1. 项目概述

避风港跨境合规智能体平台前端是一个现代化的 React 单页应用，为跨境电商卖家提供合规检查、风险监控、知识库管理等核心功能。采用组件化架构，支持多端响应式适配，集成了实时聊天、流式响应、WebSocket 推送等高级特性。

**核心业务模块**：
- 智能对话（流式聊天）
- 合规检查与风险监控
- 知识库管理（PDF/URL导入）
- Shopify 集成
- Agent 配置管理
- 系统管理与用户权限

---

## 2. 技术栈

### 2.1 核心依赖

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 19 | UI框架 |
| 语言 | TypeScript | ~5.7.0 | 类型安全 |
| 构建工具 | Vite | 6 | 开发服务器与打包 |
| 样式 | TailwindCSS | 3.4.16 | 原子化CSS框架 |
| 组件库 | Radix UI | 1.x | 可访问性优先组件 |
| 状态管理 | TanStack React Query | 5.62 | 数据获取与缓存 |
| 轻量状态 | Zustand | 5 | 全局状态管理 |
| 主题系统 | next-themes | 0.4.6 | 深浅色主题切换 |
| 图标 | Lucide React | 0.460 | 图标库 |
| 路由 | React Router | 7.1 | 路由管理 |

### 2.2 工具依赖

| 工具 | 版本 | 用途 |
|------|------|------|
| tailwindcss-animate | 1.0.7 | TailwindCSS动画插件 |
| @tailwindcss/typography | 0.5.15 | 富文本排版 |
| class-variance-authority | 0.7.1 | 组件变体管理 |
| clsx | 2.1.1 | CSS类名组合 |
| tailwind-merge | 2.5.5 | TailwindCSS类名合并 |
| sonner | 1.7.4 | 通知系统 |
| react-markdown | 10.1.0 | Markdown渲染 |
| remark-gfm | 4.0.1 | GFM语法支持 |
| cmdk | 1.1.1 | 命令面板 |

---

## 3. 项目结构

```
frontend/
├── public/                    # 静态资源
│   └── favicon.svg
├── scripts/                   # 脚本工具
│   └── check-hex-colors.mjs   # 颜色校验脚本
├── src/
│   ├── api/                   # API配置
│   │   └── config.ts          # API基础配置
│   ├── components/            # 组件目录
│   │   ├── ui/                # Radix UI封装组件（22个）
│   │   ├── chat/              # 聊天相关组件
│   │   ├── common/            # 通用基础组件
│   │   ├── config/            # 配置管理组件
│   │   ├── knowledge/         # 知识库组件
│   │   ├── memory/            # 记忆库组件
│   │   ├── metrics/           # 指标图表组件
│   │   └── [业务组件].tsx     # 独立业务组件
│   ├── context/               # React Context
│   │   ├── AuthContext.tsx    # 认证状态
│   │   ├── AppStore.tsx       # 应用全局状态
│   │   ├── NotificationContext.tsx  # 通知状态
│   │   └── WebSocketContext.tsx    # WebSocket连接状态
│   ├── hooks/                 # 自定义Hook
│   │   ├── queries/           # React Query查询Hook
│   │   ├── useConfirm.tsx     # 确认对话框Hook
│   │   ├── useSSEChat.ts      # SSE流式聊天Hook
│   │   ├── useSessions.ts     # 会话管理Hook
│   │   ├── useWebSocket.ts    # WebSocket Hook
│   │   └── use-media-query.ts # 媒体查询Hook
│   ├── layouts/               # 布局组件
│   │   ├── AppLayout.tsx      # 主应用布局
│   │   └── AuthLayout.tsx     # 认证页面布局
│   ├── lib/                   # 工具库
│   │   ├── api/               # API客户端封装
│   │   ├── mockStream.ts      # Mock流式响应
│   │   ├── lifecycle.ts       # 生命周期管理
│   │   └── utils.ts           # 通用工具函数
│   ├── pages/                 # 页面组件
│   │   ├── config/            # 配置管理页面
│   │   └── [业务页面].tsx     # 各业务页面
│   ├── providers/             # 提供者组件
│   │   ├── QueryProvider.tsx  # React Query提供者
│   │   └── ThemeProvider.tsx  # 主题提供者
│   ├── router/                # 路由配置
│   │   ├── guards.tsx         # 权限守卫
│   │   └── index.tsx          # 路由表
│   ├── types/                 # 类型定义
│   │   └── index.ts           # 全局类型声明
│   ├── App.tsx                # 应用根组件
│   ├── index.css              # 全局样式
│   ├── main.tsx               # 应用入口
│   └── vite-env.d.ts          # Vite类型声明
├── components.json            # shadcn组件配置
├── index.html                 # HTML模板
├── package.json               # 依赖配置
├── postcss.config.js          # PostCSS配置
├── tailwind.config.ts         # TailwindCSS配置
├── tsconfig.json              # TypeScript配置
└── vite.config.ts             # Vite配置
```

### 3.1 目录职责说明

| 目录 | 职责 | 关键文件 |
|------|------|----------|
| `components/ui/` | Radix UI基础组件封装，提供统一样式接口 | button.tsx, dialog.tsx, select.tsx |
| `components/chat/` | 聊天功能相关组件 | ChatComposer.tsx, StreamMessageRenderer.tsx |
| `components/config/` | 系统配置管理组件 | AgentEditModal.tsx, ModelConfigCard.tsx |
| `components/knowledge/` | 知识库管理组件 | KnowledgeList.tsx, PdfUpload.tsx |
| `context/` | 全局状态管理 | AuthContext.tsx, AppStore.tsx |
| `hooks/queries/` | React Query数据查询Hook | useSessions.ts, useKnowledge.ts |
| `hooks/` | 业务逻辑Hook | useSSEChat.ts, useWebSocket.ts |
| `pages/` | 页面级组件 | Dashboard.tsx, ChatPage.tsx |
| `layouts/` | 布局容器 | AppLayout.tsx, AuthLayout.tsx |
| `lib/api/` | API请求封装 | shopify.ts, knowledge.ts |

---

## 4. 路由系统

### 4.1 路由表结构

```typescript
// 路由层级
/                          → LandingPage（公开）
/auth/login                → LoginPage（仅访客）
/auth/signup               → RegisterPage（仅访客）
/app/dashboard             → Dashboard（需登录）
/app/chat                  → ChatPage（需登录）
/app/monitor               → RiskCenter（需登录）
/app/knowledge             → KnowledgePage（需登录）
/app/agent-config          → AgentConfigPage（管理员）
/app/model-config          → ModelConfigPage（管理员）
/app/user-manage           → UserManagePage（管理员）
/shopify/callback          → ShopifyCallbackPage（OAuth回调）
*                          → NotFoundPage（404）
```

### 4.2 权限守卫

| 守卫组件 | 功能 | 使用场景 |
|----------|------|----------|
| `RequireAuth` | 必须登录才能访问 | `/app/*` 所有受保护路由 |
| `RequireAdmin` | 必须管理员权限 | `/app/agent-config`, `/app/user-manage` |
| `PublicOnly` | 仅未登录用户访问 | `/auth/login`, `/auth/signup` |

### 4.3 懒加载策略

```typescript
// 首屏关键页面 - 直接导入（保证首屏加载速度）
import Dashboard from '@/pages/Dashboard'
import ChatPage from '@/pages/ChatPage'

// 二级页面 - 懒加载（减小首屏Bundle）
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage'))

// 懒加载包装器
const Lazy = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)
```

---

## 5. 状态管理

### 5.1 状态分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (UI Components)                    │
├─────────────────────────────────────────────────────────────────┤
│  useState / useReducer          │  局部组件状态                    │
├─────────────────────────────────────────────────────────────────┤
│                      状态管理层                                  │
├─────────────────────────────────────────────────────────────────┤
│  React Query                    │  服务端数据（缓存、同步、失效）    │
│  Zustand (AppStore)             │  轻量全局状态（聊天配置）         │
│  React Context                  │  全局上下文（认证、主题、通知）    │
├─────────────────────────────────────────────────────────────────┤
│                       通信层                                     │
├─────────────────────────────────────────────────────────────────┤
│  Fetch API                      │  REST请求                       │
│  SSE (EventSource)              │  流式响应                       │
│  WebSocket                      │  实时推送                       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 React Query 配置

```typescript
// QueryProvider.tsx 核心配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                      // 重试次数
      staleTime: 30000,              // 数据新鲜时间 30s
      refetchOnWindowFocus: false,   // 窗口聚焦时不重新获取
    },
    mutations: {
      retry: 0,                      // 突变操作不重试
    },
  },
})
```

### 5.3 AuthContext 核心接口

```typescript
interface AuthContextValue {
  user: AuthUser | null              // 当前用户
  token: string | null               // JWT令牌
  isAdmin: boolean                   // 是否管理员
  loading: boolean                   // 加载状态
  login: (username, password) => Promise<void>
  logout: () => void
  authFetch: (input, init?) => Promise<Response>  // 带认证头的fetch
}
```

### 5.4 WebSocket 连接管理

```typescript
// useWebSocket Hook 特性
- 自动重连机制
- 心跳保活（30s间隔）
- 事件订阅/取消订阅
- 连接状态跟踪（idle/connecting/connected/disconnected/error）
- 用户ID绑定区分会话
```

---

## 6. 组件架构

### 6.1 UI组件库（Radix UI封装）

| 组件名 | 文件路径 | 功能描述 |
|--------|----------|----------|
| Button | components/ui/button.tsx | 按钮组件，支持多种变体和尺寸 |
| Dialog | components/ui/dialog.tsx | 模态对话框 |
| Input | components/ui/input.tsx | 输入框 |
| Select | components/ui/select.tsx | 下拉选择器 |
| Tabs | components/ui/tabs.tsx | 选项卡 |
| Card | components/ui/card.tsx | 卡片容器 |
| Badge | components/ui/badge.tsx | 徽章标签 |
| Tooltip | components/ui/tooltip.tsx | 工具提示 |
| Sheet | components/ui/sheet.tsx | 抽屉面板（移动端） |
| Command | components/ui/command.tsx | 命令面板 |
| Combobox | components/ui/combobox.tsx | 组合框（搜索+选择） |

### 6.2 组件设计原则

1. **单一职责**：每个组件只负责一件事
2. **可组合性**：组件间通过Props组合，避免深度嵌套
3. **可访问性**：所有组件遵循ARIA标准，支持键盘导航
4. **类型安全**：使用TypeScript接口定义Props
5. **样式隔离**：优先使用TailwindCSS原子类，必要时抽取可复用片段

### 6.3 Button组件示例

```typescript
// 变体定义
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
  }
)
```

---

## 7. API通信

### 7.1 API基础配置

```typescript
// api/config.ts
const API_BASE = '/api/v1'

// 请求拦截器模式（通过authFetch实现）
const authFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
```

### 7.2 API模块划分

| 模块 | 文件路径 | 接口范围 |
|------|----------|----------|
| 会话 | lib/api/chains.ts | 操作链相关接口 |
| 知识库 | lib/api/knowledge.ts | 文档导入、搜索 |
| 新闻 | lib/api/news.ts | 新闻监控 |
| Shopify | lib/api/shopify.ts | 店铺集成 |
| 通知 | lib/api/notify.ts | 通知配置 |
| 模型配置 | lib/api/model-config.ts | 模型管理 |

### 7.3 SSE流式响应

```typescript
// useSSEChat Hook 核心流程
1. 发送POST请求到 /api/v1/chat/stream
2. 设置 Accept: text/event-stream
3. 使用 getReader() 读取响应流
4. 解析SSE事件（event: type, data: json）
5. 事件类型：token, skill_start, skill_end, thinking, plan, done, error
6. 更新消息状态，触发UI重渲染
```

### 7.4 错误处理策略

```typescript
// 统一错误处理
- HTTP错误：检查response.ok，解析错误信息
- 网络错误：捕获fetch异常，显示连接失败提示
- SSE错误：注入error事件到消息流
- 业务错误：在组件层显示错误状态
```

---

## 8. 类型系统

### 8.1 核心类型定义

| 类型 | 用途 | 关键字段 |
|------|------|----------|
| `Session` | 完整会话 | id, messages, title, updated_at |
| `SessionMessage` | 会话消息 | id, role, content, stream_events |
| `StreamEvent` | 流式事件 | type, content, skill, args, result |
| `ComplianceResult` | 合规检查结果 | hs_code, risk_level, certifications |
| `RiskAlert` | 风险预警 | alert_id, severity, title, affected_products |
| `KnowledgeDoc` | 知识库文档 | id, doc_type, status, chunk_count |
| `ShopifyProductInfo` | Shopify产品 | shopify_id, title, variants |

### 8.2 StreamEvent类型枚举

```typescript
type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'skill_start'; skill: string; args: Record<string, unknown> }
  | { type: 'skill_end'; skill: string; result: Record<string, unknown> }
  | { type: 'thinking'; content: string; depth?: number }
  | { type: 'plan'; steps: PlanStep[]; current: number }
  | { type: 'action_card'; actions: StreamAction[] }
  | { type: 'agent_status'; agents: AgentStatus[] }
  | { type: 'conflict'; conflicts: ConflictResult[] }
  | { type: 'browser_result'; result: BrowserResult }
  | { type: 'error'; code: string; message: string }
  | { type: 'done'; message?: string; compliance_result?: ComplianceResult }
```

---

## 9. 编码规范

### 9.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `ChatComposer`, `StreamMessageRenderer` |
| Props接口 | I前缀 + PascalCase | `IButtonProps`, `IChatMessage` |
| Hook名 | use前缀 + camelCase | `useSSEChat`, `useConfirm` |
| 函数名 | camelCase | `sendMessage`, `parseSSEChunk` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE`, `IDLE_TIMEOUT_MS` |
| 文件命名 | kebab-case | `stream-message-renderer.tsx` |

### 9.2 Props设计原则

1. **必填与可选明确区分**：使用`?`标识可选参数
2. **提供合理默认值**：简化调用方使用
3. **避免过度嵌套**：Props层级不超过3层
4. **类型定义完整**：使用TypeScript接口

### 9.3 状态管理规范

1. **服务端数据**：使用React Query（useQuery/useMutation）
2. **全局状态**：使用Zustand或React Context
3. **组件局部状态**：使用useState/useReducer
4. **复杂状态逻辑**：抽取为自定义Hook

### 9.4 样式规范

1. **优先使用TailwindCSS原子类**
2. **避免硬编码颜色值**：使用语义化变量（`text-primary`, `bg-background`）
3. **响应式优先**：移动端优先设计，使用`sm:` `md:` `lg:`前缀
4. **抽离可复用样式**：使用`cn()`工具函数组合类名

---

## 10. 性能优化

### 10.1 代码分割

```typescript
// Vite配置中的代码分割
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-radix': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
        'cmdk': ['cmdk'],
        'lucide': ['lucide-react'],
        'utils': ['clsx', 'tailwind-merge'],
      },
    },
  },
}
```

### 10.2 渲染优化

| 优化手段 | 使用场景 |
|----------|----------|
| `React.memo()` | 减少不必要的组件重渲染 |
| `useMemo()` | 缓存计算结果 |
| `useCallback()` | 缓存回调函数 |
| `Suspense` | 懒加载组件，避免白屏 |
| `virtualize` | 大数据列表虚拟滚动 |

### 10.3 网络优化

- 请求缓存（React Query自动处理）
- 请求去重（React Query默认开启）
- 防抖节流（搜索输入等高频操作）
- SSE连接复用（避免重复建立连接）

---

## 11. 安全规范

### 11.1 认证安全

- JWT令牌存储在localStorage
- 请求时自动附加Authorization头
- 令牌过期后自动清除本地状态
- 启动时验证令牌有效性

### 11.2 XSS防护

- 使用React内置的HTML转义
- 避免使用`dangerouslySetInnerHTML`
- 对用户输入进行验证和清理

### 11.3 CSRF防护

- 使用JWT令牌作为认证方式
- 避免使用Cookie认证（CSRF风险高）
- API接口验证请求来源

### 11.4 数据保护

- 敏感信息（密码）不在前端存储
- API响应中不返回敏感数据
- 日志中不记录用户凭证

---

**文档版本**: v1.0  
**最后更新**: 2026-07-16  
**适用项目**: 避风港跨境合规智能体平台