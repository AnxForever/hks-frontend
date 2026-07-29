/**
 * 通知配置 — 推送渠道 CRUD（飞书 / 企业微信 / 钉钉 / Slack / Webhook / Shopify）
 *
 * 配置项按后端真实返回的渠道 config 动态渲染（app_id/app_secret/chat_id/webhook_url/shop_domain 等），
 * source=env 的渠道表示已由 .env 自动对齐（凭据只读 + 掩码展示）。
 * 字段 schema 仅描述"渲染哪些配置项"，真实值全部来自后端 / .env，无任何硬编码配置值。
 */
import { useEffect, useState } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import {
  BellRing,
  Loader2,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCreateChannel,
  useDeleteChannel,
  useNotifyChannels,
  useTestChannel,
  useToggleChannel,
  useUpdateChannel,
} from '@/hooks/queries/useNotify'
import { CHANNEL_LABEL, LEVEL_LABEL } from '@/lib/api/notify'
import type { ChannelBody, ChannelType, MinLevel, NotifyChannel } from '@/lib/api/notify'
import { cn } from '@/lib/utils'

/* ─────────────── 字段 Schema（仅元数据，真实值来自后端 / env） ─────────────── */

interface FieldDef {
  key: string
  label: string
  placeholder?: string
  secret?: boolean
  optional?: boolean
}

/** 各渠道类型的配置字段元数据 — 只声明渲染哪些配置项，不硬编码任何值 */
const CHANNEL_FIELDS: Record<ChannelType, FieldDef[]> = {
  feishu: [
    { key: 'app_id', label: 'App ID', placeholder: 'cli_xxx', optional: true },
    { key: 'app_secret', label: 'App Secret', secret: true, optional: true },
    { key: 'chat_id', label: 'Chat ID（默认推送目标）', placeholder: 'oc_xxx', optional: true },
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...', optional: true },
    { key: 'webhook_secret', label: '签名密钥（机器人开启加签时填写）', secret: true, optional: true },
  ],
  wecom: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...' },
  ],
  dingtalk: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...' },
    { key: 'webhook_secret', label: '签名密钥（机器人开启加签时填写）', secret: true, optional: true },
  ],
  slack: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
  ],
  email: [],
  webhook: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://...' },
  ],
  shopify: [
    { key: 'shop_domain', label: '店铺域名', placeholder: 'xxx.myshopify.com' },
    { key: 'access_token', label: 'Access Token（Custom App）', secret: true, optional: true },
    { key: 'webhook_secret', label: 'Webhook 签名密钥', secret: true, optional: true },
  ],
}

// 通知页仅管理 IM / 通知渠道；shopify 属数据平台，在「集成」页配置（不在此展示）
const CHANNEL_TYPES: ChannelType[] = ['feishu', 'wecom', 'dingtalk', 'slack', 'webhook']
const MIN_LEVELS: MinLevel[] = ['low', 'medium', 'high', 'critical']

const emptyForm: ChannelBody = {
  channel: 'feishu',
  name: '',
  config: {},
  enabled: true,
  min_level: 'medium',
}

/** 掩码敏感值，避免 env 凭据明文展示 */
function maskSecret(v: string): string {
  if (!v) return ''
  if (v.length <= 6) return '••••••'
  return `${v.slice(0, 4)}${'•'.repeat(Math.min(8, v.length - 6))}${v.slice(-2)}`
}

/** 根据渠道真实配置生成可读的连接信息 */
function describeChannel(ch: NotifyChannel): string {
  const cfg = ch.config || {}
  switch (ch.channel) {
    case 'feishu': {
      const app = cfg.app_id || ''
      const chat = cfg.chat_id || ''
      if (app && chat) return `${app} → ${chat}`
      return app || chat || cfg.webhook_url || '未配置'
    }
    case 'shopify':
      return cfg.shop_domain || '未配置'
    default:
      return cfg.webhook_url || '未配置'
  }
}

/** 渠道是否具备可发送的最小配置（状态点依据：仅 enabled 不代表可用） */
function isConfigured(ch: NotifyChannel): boolean {
  const cfg = ch.config || {}
  switch (ch.channel) {
    case 'feishu':
      return Boolean((cfg.app_id && cfg.app_secret) || cfg.webhook_url)
    case 'email':
      return Boolean(cfg.smtp_host && cfg.username)
    default:
      return Boolean(cfg.webhook_url || cfg.url)
  }
}

/** 按渠道类型做必填校验（env 渠道已对齐，跳过） */
function validateChannel(form: ChannelBody): string | null {
  const cfg = form.config || {}
  switch (form.channel) {
    case 'feishu':
      if (!cfg.app_id && !cfg.webhook_url) return '请至少填写 App ID 或 Webhook URL'
      return null
    case 'shopify':
      if (!cfg.shop_domain) return '店铺域名不能为空'
      return null
    default: {
      const url = cfg.webhook_url || ''
      if (!url.startsWith('http')) return 'Webhook 需以 http 开头'
      return null
    }
  }
}

export default function NotifyConfigPage() {
  const { data: channels, isLoading, isError } = useNotifyChannels()
  // 数据平台渠道（shopify）在「集成」页管理，通知页仅展示 IM/通知渠道
  const visibleChannels = channels?.filter((ch) => ch.channel !== 'shopify')
  const [editing, setEditing] = useState<NotifyChannel | null>(null)
  const confirm = useConfirm()
  const [adding, setAdding] = useState(false)
  const createCh = useCreateChannel()
  const updateCh = useUpdateChannel()
  const deleteCh = useDeleteChannel()
  const toggleCh = useToggleChannel()
  const testCh = useTestChannel()

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-[1100px] px-6 py-7 sm:px-8 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">通知配置</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              配置飞书 / 企业微信 / 钉钉 / Slack 等 IM 通知渠道，风险预警自动推送
            </p>
          </div>
          <Button onClick={() => setAdding(true)} size="sm">
            <Plus className="mr-2 size-4" /> 添加渠道
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-8 sm:px-8 space-y-4">
        {isLoading && <Loader />}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            加载渠道失败
          </div>
        )}
        {visibleChannels && visibleChannels.length === 0 && !isLoading && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
            <BellRing className="mx-auto size-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">暂无推送渠道。添加飞书、企业微信或钉钉渠道接收风险预警。</p>
            <Button onClick={() => setAdding(true)} size="sm">
              <Plus className="mr-2 size-3.5" /> 添加渠道
            </Button>
          </div>
        )}
        {visibleChannels?.map((ch) => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            onEdit={() => setEditing(ch)}
            onToggle={() =>
              toggleCh
                .mutateAsync({ id: ch.id, enabled: !ch.enabled })
                .then(() => toast.success(ch.enabled ? '已禁用' : '已启用'))
                .catch((e) => toast.error(e.message))
            }
            onTest={() =>
              testCh
                .mutateAsync(ch.id)
                .then((r) => {
                  if (r.ok) toast.success(`测试消息已发送到 ${r.name}`)
                  else toast.error(r.error ? `测试失败：${r.error}` : '测试失败')
                })
                .catch((e) => toast.error(e.message))
            }
            onDelete={async () => {
              if (!(await confirm({ title: '删除渠道', description: `确认删除「${ch.name}」？`, variant: 'destructive' }))) return
              deleteCh
                .mutateAsync(ch.id)
                .then(() => toast.success('已删除'))
                .catch((e) => toast.error(e.message))
            }}
            busy={toggleCh.isPending || testCh.isPending || deleteCh.isPending}
          />
        ))}

        {/* Add / Edit dialog */}
        <ChannelDialog
          open={adding || !!editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          source={editing?.source}
          initial={editing ? {
            channel: editing.channel,
            name: editing.name,
            config: { ...editing.config },
            enabled: editing.enabled,
            min_level: editing.min_level,
          } : emptyForm}
          onSubmit={(body) => {
            const p = editing
              ? updateCh.mutateAsync({ id: editing.id, body })
              : createCh.mutateAsync(body)
            return p
              .then(() => { setAdding(false); setEditing(null); toast.success(editing ? '已更新' : '已创建') })
              .catch((e) => toast.error(e.message))
          }}
          saving={createCh.isPending || updateCh.isPending}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────── Channel Row ─────────────────────────── */

function ChannelRow({
  channel,
  onEdit,
  onToggle,
  onTest,
  onDelete,
  busy,
}: {
  channel: NotifyChannel
  onEdit: () => void
  onToggle: () => void
  onTest: () => void
  onDelete: () => void
  busy: boolean
}) {
  const isEnv = channel.source === 'env'
  const configured = isConfigured(channel)
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'size-2 rounded-full',
              channel.enabled && configured ? 'bg-emerald-500' : channel.enabled ? 'bg-amber-400' : 'bg-muted-foreground/30',
            )}
            title={channel.enabled ? (configured ? '已启用' : '已启用（配置不完整）') : '已禁用'}
          />
          <span className="font-semibold text-[14px]">{channel.name}</span>
          <Badge variant="outline" className="text-[10px] uppercase">
            {CHANNEL_LABEL[channel.channel]}
          </Badge>
          {channel.enabled && !configured && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400">
              配置不完整
            </Badge>
          )}
          {isEnv && (
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="size-3 mr-0.5" /> .env 对齐
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            最低 {LEVEL_LABEL[channel.min_level]}风险
          </Badge>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground truncate font-mono">{describeChannel(channel)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy} className="h-8 text-xs">
          <Settings2 className="size-3.5 mr-1" /> 编辑
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggle} disabled={busy} className="h-8 text-xs">
          {channel.enabled ? '禁用' : '启用'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onTest} disabled={busy} className="h-8 text-xs">
          <Send className="size-3.5 mr-1" /> 测试
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy} className="h-8 text-xs text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────── Dialog ─────────────────────────── */

function ChannelDialog({
  open,
  onClose,
  initial,
  source,
  onSubmit,
  saving,
}: {
  open: boolean
  onClose: () => void
  initial: ChannelBody
  source?: string
  onSubmit: (body: ChannelBody) => Promise<unknown>
  saving: boolean
}) {
  const [form, setForm] = useState<ChannelBody>(initial)
  const isEnv = source === 'env'

  // 打开时用最新 initial 重置表单（仅在 open 切换时同步，避免无限重渲染）。
  useEffect(() => {
    if (open) setForm(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setCfg = (key: string, value: string) =>
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }))

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('名称不能为空')
    if (!isEnv) {
      const err = validateChannel(form)
      if (err) return toast.error(err)
    }
    await onSubmit(form)
  }

  const fields = CHANNEL_FIELDS[form.channel] || []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.name ? '编辑渠道' : '添加渠道'}</DialogTitle>
          <DialogDescription>
            {isEnv ? '该渠道已由 .env 自动对齐，凭据只读' : '配置飞书 / 企业微信 / 钉钉等推送渠道'}
          </DialogDescription>
        </DialogHeader>
        {isEnv && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="size-4 shrink-0" />
            凭据已从 .env 自动对齐，如需更改请修改 .env 文件后重启后端。
          </div>
        )}
        <form onSubmit={handle} className="space-y-4">
          <Field label="名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="如：风险预警群" />
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">渠道</label>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value as ChannelType, config: {} })}
              disabled={isEnv}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground"
            >
              {CHANNEL_TYPES.map((t) => (
                <option key={t} value={t}>{CHANNEL_LABEL[t]}</option>
              ))}
            </select>
          </div>
          {fields.map((f) => (
            <Field
              key={`${form.channel}-${f.key}`}
              label={f.label}
              value={form.config[f.key] || ''}
              onChange={(v) => setCfg(f.key, v)}
              placeholder={f.placeholder}
              secret={f.secret}
              readOnly={isEnv}
              displayValue={isEnv && f.secret ? maskSecret(form.config[f.key] || '') : undefined}
            />
          ))}
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
              最低推送等级
            </label>
            <select
              value={form.min_level}
              onChange={(e) => setForm({ ...form, min_level: e.target.value as MinLevel })}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MIN_LEVELS.map((l) => (
                <option key={l} value={l}>{LEVEL_LABEL[l]} 及以上</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret,
  readOnly,
  displayValue,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  secret?: boolean
  readOnly?: boolean
  /** env 场景下的掩码展示值（只读） */
  displayValue?: string
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      <input
        type={secret && !displayValue ? 'password' : 'text'}
        value={displayValue ?? value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete="off"
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring',
          readOnly && 'cursor-not-allowed bg-muted/40 text-muted-foreground',
        )}
      />
    </div>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> 加载中…
    </div>
  )
}
