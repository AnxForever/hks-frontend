/**
 * 调度输入组件（精简移植 deer-flow-main scheduled-task-schedule-input.tsx）。
 *
 * 预设选择（每小时/每天/每周/每月/自定义 cron）+ once（datetime-local）+ 时区选择 + 下次运行预览。
 * 中文标签直写，不引 i18n hook。
 */

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  describeSchedule,
  pad2,
  parseCron,
  serializeCron,
  utcToZonedLocalInput,
  WEEKDAYS,
  zonedLocalToUtcIso,
  type CronParts,
  type CronPreset,
  type Weekday,
} from '@/core/scheduled-tasks/cron'

export type ScheduleValue = {
  schedule_type: 'once' | 'cron'
  schedule_spec: { cron?: string; run_at?: string }
  timezone: string
}

const PRESETS: CronPreset[] = ['hourly', 'daily', 'weekly', 'monthly', 'custom']

const PRESET_LABELS: Record<CronPreset, string> = {
  hourly: '每小时',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  custom: '自定义 Cron',
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日',
}

const FALLBACK_TIMEZONES = [
  'UTC', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore',
  'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
]

function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof tz === 'string' && tz.length > 0) return tz
  } catch { /* noop */ }
  return 'UTC'
}

function timezoneOptions(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] | undefined })
    .supportedValuesOf?.('timeZone')
  if (Array.isArray(supported) && supported.length > 0) return supported
  return FALLBACK_TIMEZONES
}

const TIMEZONE_OPTIONS = timezoneOptions()

export function ScheduledTaskScheduleInput({
  initial,
  onChange,
}: {
  initial: ScheduleValue
  onChange: (value: ScheduleValue) => void
}) {
  const [scheduleType, setScheduleType] = useState<'once' | 'cron'>(initial.schedule_type)
  const [preset, setPreset] = useState<CronPreset>(
    () => parseCron(initial.schedule_spec.cron ?? '0 9 * * *').preset,
  )
  const [parts, setParts] = useState<CronParts>(
    () => parseCron(initial.schedule_spec.cron ?? '0 9 * * *').parts,
  )
  const [runAtLocal, setRunAtLocal] = useState<string>(
    initial.schedule_type === 'once' && initial.schedule_spec.run_at
      ? utcToZonedLocalInput(initial.schedule_spec.run_at, initial.timezone || 'UTC')
      : '',
  )
  const [timezone, setTimezone] = useState<string>(initial.timezone || detectBrowserTimezone())

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (scheduleType === 'once') {
      const runAt = runAtLocal ? zonedLocalToUtcIso(runAtLocal, timezone) : ''
      onChangeRef.current({
        schedule_type: 'once',
        schedule_spec: runAt ? { run_at: runAt } : {},
        timezone,
      })
      return
    }
    const cron = preset === 'custom' ? (parts.raw ?? '') : serializeCron(preset, parts)
    onChangeRef.current({
      schedule_type: 'cron',
      schedule_spec: cron ? { cron } : {},
      timezone,
    })
  }, [scheduleType, preset, parts, runAtLocal, timezone])

  function updateParts(patch: Partial<CronParts>) {
    setParts((prev) => ({ ...prev, ...patch }))
  }

  function changePreset(next: CronPreset) {
    setParts((prev) => {
      const merged = { ...prev }
      if (next === 'weekly' && (merged.weekdays ?? []).length === 0) merged.weekdays = ['mon']
      if (next === 'monthly' && merged.dayOfMonth == null) merged.dayOfMonth = 1
      if (next === 'custom' && !merged.raw) merged.raw = serializeCron('daily', prev)
      return merged
    })
    setPreset(next)
  }

  function toggleWeekday(w: Weekday) {
    setParts((prev) => {
      const set = new Set(prev.weekdays ?? [])
      if (set.has(w)) {
        if (set.size <= 1) return prev
        set.delete(w)
      } else {
        set.add(w)
      }
      return { ...prev, weekdays: WEEKDAYS.filter((d) => set.has(d)) }
    })
  }

  const preview = describeSchedule({ scheduleType, preset, parts, runAtLocal, timezone })

  return (
    <div className="flex flex-col gap-2">
      {/* 调度类型切换 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={scheduleType === 'cron' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setScheduleType('cron')}
        >
          重复执行
        </Button>
        <Button
          variant={scheduleType === 'once' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setScheduleType('once')}
        >
          单次执行
        </Button>
      </div>

      {scheduleType === 'cron' ? (
        <>
          <Select value={preset} onValueChange={(v) => changePreset(v as CronPreset)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === 'hourly' && (
            <Input
              type="number" min={0} max={59}
              value={parts.minute ?? 0}
              onChange={(e) => updateParts({ minute: Number(e.target.value) })}
              aria-label="分钟"
            />
          )}

          {(preset === 'daily' || preset === 'weekly' || preset === 'monthly') && (
            <Input
              type="time"
              value={`${pad2(parts.hour ?? 9)}:${pad2(parts.minute ?? 0)}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number)
                updateParts({ hour: h, minute: m })
              }}
              aria-label="时间"
            />
          )}

          {preset === 'weekly' && (
            <div className="flex flex-wrap gap-1">
              <span className="text-muted-foreground w-full text-sm">星期</span>
              {WEEKDAYS.map((w) => {
                const active = (parts.weekdays ?? []).includes(w)
                return (
                  <Button
                    key={w}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleWeekday(w)}
                    aria-pressed={active}
                  >
                    {WEEKDAY_LABELS[w]}
                  </Button>
                )
              })}
            </div>
          )}

          {preset === 'monthly' && (
            <Input
              type="number" min={1} max={31}
              value={parts.dayOfMonth ?? 1}
              onChange={(e) => updateParts({ dayOfMonth: Number(e.target.value) })}
              aria-label="日期"
            />
          )}

          {preset === 'custom' && (
            <div className="flex flex-col gap-1">
              <Input
                value={parts.raw ?? ''}
                onChange={(e) => updateParts({ raw: e.target.value })}
                placeholder="分 时 日 月 周，如 0 9 * * 1-5"
                aria-label="Cron 表达式"
              />
              <a
                href="https://crontab.guru/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground text-xs hover:underline"
              >
                Cron 语法参考 ↗
              </a>
            </div>
          )}
        </>
      ) : (
        <Input
          type="datetime-local"
          value={runAtLocal}
          onChange={(e) => setRunAtLocal(e.target.value)}
          aria-label="执行时间"
        />
      )}

      {/* 时区选择 */}
      <Select value={timezone} onValueChange={setTimezone}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONE_OPTIONS.map((tz) => (
            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 下次运行预览 */}
      <div className="text-muted-foreground text-sm">{preview}</div>
    </div>
  )
}
