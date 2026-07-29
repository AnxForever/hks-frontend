/**
 * 跨境合规 recipe 预设（对齐 deer-flow-main recipes.ts 结构）。
 *
 * 纯前端快捷填充模板：用户点击 recipe chip 一键填充 title + prompt + schedule，
 * 仍可自由编辑。prompt 为可执行自然语言，发给 deepagents 主 Agent 自主执行。
 */

import type { ScheduleValue } from '@/components/workspace/scheduled-task-schedule-input'

export type Recipe = {
  id: string
  icon: string
  title: string
  prompt: string
  schedule: ScheduleValue
}

export const RECIPES: Recipe[] = [
  {
    id: 'regulation-scan',
    icon: '📜',
    title: '法规变更扫描',
    prompt:
      '请扫描目标市场（美国、欧盟、日本）最近 24 小时的跨境贸易法规变更，包括关税调整、进出口禁令、合规新规等。对每条变更：列出法规名称、发布机构、生效日期、影响范围及应对建议。输出为结构化 markdown 列表。',
    schedule: {
      schedule_type: 'cron',
      schedule_spec: { cron: '0 9 * * *' },
      timezone: '',
    },
  },
  {
    id: 'risk-intel',
    icon: '🌐',
    title: '风险情报扫描',
    prompt:
      '请执行全球贸易风险情报扫描：搜索最新的地缘政治风险、供应链中断、制裁更新、汇率异常波动等信号。对每个风险信号：标注风险等级（高/中/低）、影响市场、受影响品类及建议措施。输出为 markdown 表格。',
    schedule: {
      schedule_type: 'cron',
      schedule_spec: { cron: '0 8 * * *' },
      timezone: '',
    },
  },
  {
    id: 'cert-expiry',
    icon: '📋',
    title: '认证到期检查',
    prompt:
      '请检查所有已登记产品的合规认证状态：列出 30 天内即将到期或已过期的认证（CE、FDA、FCC、UL 等），标注产品名称、认证类型、到期日期、续期所需材料及建议行动。输出为按紧急程度排序的 markdown 列表。',
    schedule: {
      schedule_type: 'cron',
      schedule_spec: { cron: '0 10 * * 1' },
      timezone: '',
    },
  },
  {
    id: 'daily-brief',
    icon: '📊',
    title: '每日合规简报',
    prompt:
      '请生成今日跨境合规简报：汇总最近 24 小时的法规动态、风险预警、待处理合规事项、即将到期的认证，以及今日建议优先处理的 Top 3 行动项。格式简洁，适合快速浏览。',
    schedule: {
      schedule_type: 'cron',
      schedule_spec: { cron: '30 8 * * *' },
      timezone: '',
    },
  },
]
