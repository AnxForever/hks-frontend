/**
 * Cron 预设工具（精简移植 deer-flow-main core/scheduled-tasks/cron.ts）。
 *
 * 纯函数，无外部依赖。预设生成的 cron 表达式由本模块保证格式正确；
 * parseCron 仅往返本模块生成的规范形状，其余回退 custom。
 */

export type CronPreset = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type CronParts = {
  minute?: number
  hour?: number
  weekdays?: Weekday[]
  dayOfMonth?: number
  raw?: string
}

export type ScheduleFormState = {
  scheduleType: 'once' | 'cron'
  preset?: CronPreset
  parts?: CronParts
  runAtLocal?: string
  timezone: string
}

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const WEEKDAY_TO_CRON: Record<Weekday, string> = {
  mon: '1', tue: '2', wed: '3', thu: '4', fri: '5', sat: '6', sun: '0',
}

const CRON_TO_WEEKDAY: Record<string, Weekday> = {
  '0': 'sun', '1': 'mon', '2': 'tue', '3': 'wed', '4': 'thu', '5': 'fri', '6': 'sat', '7': 'sun',
}

const ZH_WEEKDAY: Record<Weekday, string> = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日',
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

export function pad2(n: number): string {
  return String(Math.trunc(Number.isFinite(n) ? n : 0)).padStart(2, '0')
}

function orderedWeekdays(days: Weekday[] | undefined): Weekday[] {
  const set = new Set(days ?? [])
  return WEEKDAYS.filter((w) => set.has(w))
}

export function serializeCron(preset: CronPreset, parts: CronParts): string {
  const m = clamp(parts.minute, 0, 59, 0)
  const h = clamp(parts.hour, 0, 23, 9)
  switch (preset) {
    case 'hourly':
      return `${m} * * * *`
    case 'daily':
      return `${m} ${h} * * *`
    case 'weekly': {
      const ordered = orderedWeekdays(parts.weekdays)
      if (ordered.length === 0) return `${m} ${h} * * *`
      return `${m} ${h} * * ${ordered.map((w) => WEEKDAY_TO_CRON[w]).join(',')}`
    }
    case 'monthly':
      return `${m} ${h} ${clamp(parts.dayOfMonth, 1, 31, 1)} * *`
    case 'custom':
      return (parts.raw ?? '').trim() || '0 9 * * *'
  }
}

export function parseCron(cron: string): { preset: CronPreset; parts: CronParts } {
  const expr = cron.trim()
  const fields = expr.split(/\s+/)
  if (fields.length !== 5) return { preset: 'custom', parts: { raw: expr } }

  const [mF, hF, domF, monF, dowF] = fields as [string, string, string, string, string]
  const numMinute = /^\d+$/.test(mF)
  const numHour = /^\d+$/.test(hF)
  const numDom = /^\d+$/.test(domF)
  const stars = domF === '*' && monF === '*'

  if (numMinute && hF === '*' && stars && dowF === '*') {
    return { preset: 'hourly', parts: { minute: Number(mF) } }
  }
  if (numMinute && numHour && stars && dowF === '*') {
    return { preset: 'daily', parts: { minute: Number(mF), hour: Number(hF) } }
  }
  if (numMinute && numHour && domF === '*' && monF === '*' && dowF !== '*' &&
      dowF.split(',').every((tok) => /^[0-7]$/.test(tok))) {
    const parsed = dowF.split(',').map((tok) => CRON_TO_WEEKDAY[tok]).filter((w): w is Weekday => Boolean(w))
    const ordered = orderedWeekdays(parsed)
    if (ordered.length > 0) {
      return { preset: 'weekly', parts: { minute: Number(mF), hour: Number(hF), weekdays: ordered } }
    }
  }
  if (numMinute && numHour && numDom && monF === '*' && dowF === '*') {
    return { preset: 'monthly', parts: { minute: Number(mF), hour: Number(hF), dayOfMonth: Number(domF) } }
  }
  return { preset: 'custom', parts: { raw: expr } }
}

/** 中文描述调度计划。 */
export function describeSchedule(state: ScheduleFormState): string {
  const tz = state.timezone
  if (state.scheduleType === 'once') {
    const runAt = (state.runAtLocal ?? '').replace('T', ' ')
    return `单次 ${runAt} (${tz})`
  }
  const parts = state.parts ?? {}
  const hhmm = `${pad2(parts.hour ?? 0)}:${pad2(parts.minute ?? 0)}`
  switch (state.preset) {
    case 'hourly':
      return `每小时第 ${parts.minute ?? 0} 分钟 (${tz})`
    case 'daily':
      return `每天 ${hhmm} (${tz})`
    case 'weekly': {
      const ordered = orderedWeekdays(parts.weekdays)
      if (ordered.length === 0) return `每天 ${hhmm} (${tz})`
      return `每周 ${ordered.map((w) => ZH_WEEKDAY[w]).join('、')} ${hhmm} (${tz})`
    }
    case 'monthly':
      return `每月 ${parts.dayOfMonth ?? 1} 日 ${hhmm} (${tz})`
    case 'custom':
      return `自定义: ${parts.raw ?? ''} (${tz})`
    default:
      return `自定义 (${tz})`
  }
}

/** 把 datetime-local 墙钟值（在 timezone 中解释）转为 UTC ISO 字符串。 */
export function zonedLocalToUtcIso(localValue: string, timezone: string): string {
  const [date, time] = localValue.split('T')
  const [y, mo, d] = (date ?? '').split('-').map(Number)
  const [h, mi] = (time ?? '00:00').split(':').map(Number)
  const refMs = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0)
  let offsetMs = tzOffsetMs(timezone, new Date(refMs))
  let utcMs = refMs - offsetMs
  const correctedOffsetMs = tzOffsetMs(timezone, new Date(utcMs))
  if (correctedOffsetMs !== offsetMs) {
    offsetMs = correctedOffsetMs
    utcMs = refMs - offsetMs
  }
  const utc = new Date(utcMs)
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}T${pad2(utc.getUTCHours())}:${pad2(utc.getUTCMinutes())}:${pad2(utc.getUTCSeconds())}+00:00`
}

/** UTC ISO → 时区墙钟 datetime-local 值。 */
export function utcToZonedLocalInput(iso: string, timezone: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const offsetMs = tzOffsetMs(timezone, d)
  const local = new Date(d.getTime() + offsetMs)
  return `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}T${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`
}

function tzOffsetMs(timezone: string, date: Date): number {
  const tzParts = formatParts(timezone, date)
  const utcParts = formatParts('UTC', date)
  return toUtcMs(tzParts) - toUtcMs(utcParts)
}

function formatParts(timezone: string, date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const out: Record<string, number> = {}
  for (const p of parts) out[p.type] = Number(p.value)
  return out
}

function toUtcMs(p: Record<string, number>): number {
  return Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0)
}
