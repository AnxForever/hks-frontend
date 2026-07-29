/** 统一定时任务类型定义（对齐 deer-flow-main scheduled-tasks/types.ts）。 */

export type ScheduledTask = {
  id: string
  user_id: string
  scope: 'system' | 'user'
  title: string
  prompt: string
  schedule_type: 'once' | 'cron' | 'interval'
  schedule_spec: Record<string, unknown>
  timezone: string
  status: 'enabled' | 'paused' | 'running' | 'completed' | 'failed' | 'cancelled'
  product_id: string | null
  next_run_at: string | null
  last_run_at: string | null
  last_run_id: string | null
  last_error: string | null
  run_count: number
  created_at: string
  updated_at: string
}

export type ScheduledTaskRun = {
  id: string
  task_id: string
  trigger: 'scheduled' | 'manual'
  status: 'queued' | 'running' | 'success' | 'failed' | 'skipped'
  error: string | null
  response_preview: string | null
  scheduled_for: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}
