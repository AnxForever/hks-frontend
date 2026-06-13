import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  listRoutes,
  getActiveRoutes,
  saveRoute,
  updateRoute,
  deleteRoute,
  type RouteConfig,
} from '@/lib/api/model-config'

const API = '/api/v1'
const PROVIDERS = ['anthropic', 'openai', 'local'] as const

const DEFAULT_FORM = {
  role: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKeyEnv: 'ANTHROPIC_API_KEY',
  baseUrl: '',
  maxTokens: '4096',
  temperature: '0.7',
  topP: '0.9',
}

export default function ModelConfigPage() {
  const { authFetch, isAdmin } = useAuth()
  const confirm = useConfirm()
  const [routes, setRoutes] = useState<RouteConfig[]>([])
  const [fallbackChain, setFallbackChain] = useState<Record<string, string[]>>({})
  const [selectedRole, setSelectedRole] = useState<string | null>(null) // null = 新建模式
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const setField = (key: keyof typeof DEFAULT_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = useCallback(() => {
    setSelectedRole(null)
    setForm(DEFAULT_FORM)
    setError(null)
    setSuccess(null)
  }, [])

  const loadRoutes = useCallback(async () => {
    try {
      const [list, active] = await Promise.all([
        listRoutes(authFetch),
        getActiveRoutes(authFetch),
      ])
      setRoutes(list)
      setFallbackChain(active.fallback_chain ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载路由失败')
    }
  }, [authFetch])

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

  const handleEdit = (cfg: RouteConfig) => {
    setSelectedRole(cfg.role)
    setForm({
      role: cfg.role,
      provider: cfg.provider,
      model: cfg.model,
      apiKeyEnv: cfg.api_key_env,
      baseUrl: cfg.base_url,
      maxTokens: String(cfg.max_tokens),
      temperature: String(cfg.temperature),
      topP: String(cfg.top_p),
    })
    setError(null)
    setSuccess(null)
  }

  const handleReloadPrompts = async () => {
    setReloading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await authFetch(`${API}/prompts/reload`, { method: 'POST' })
      if (!res.ok) throw new Error('热加载失败')
      setSuccess('Prompt 模板已重新加载')
    } catch (e) {
      setError(e instanceof Error ? e.message : '热加载失败')
    } finally {
      setReloading(false)
    }
  }

  const handleSave = async () => {
    if (!form.role.trim() || !form.provider.trim() || !form.model.trim()) {
      setError('role、provider、model 为必填项')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const body = {
        role: form.role.trim(),
        provider: form.provider.trim(),
        model: form.model.trim(),
        api_key_env: form.apiKeyEnv.trim(),
        base_url: form.baseUrl.trim(),
        max_tokens: parseInt(form.maxTokens, 10) || 4096,
        temperature: Number.isFinite(parseFloat(form.temperature)) ? parseFloat(form.temperature) : 0.7,
        top_p: Number.isFinite(parseFloat(form.topP)) ? parseFloat(form.topP) : 0.9,
      }
      if (selectedRole) {
        await updateRoute(authFetch, selectedRole, body)
      } else {
        await saveRoute(authFetch, body)
      }
      const message = selectedRole ? '路由已更新' : '路由已创建'
      await loadRoutes()
      resetForm()
      setSuccess(message)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: string) => {
    if (routes.length <= 1) {
      setError('不能删除最后一个路由')
      return
    }
    if (
      !(await confirm({
        title: '删除路由',
        description: `确认删除角色「${role}」的模型路由？`,
        variant: 'destructive',
      }))
    )
      return
    try {
      await deleteRoute(authFetch, role)
      if (selectedRole === role) resetForm()
      await loadRoutes()
      setSuccess('路由已删除')
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-muted-foreground">仅管理员可访问</p>
      </div>
    )
  }

  const fallbackEntries = Object.entries(fallbackChain).filter(([, chain]) => chain?.length)

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">模型路由配置</h1>
              <p className="mt-1 text-[14px] text-muted-foreground/80">
                按角色（role）管理 LLM 路由；所有角色同时生效，API Key 经环境变量注入
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReloadPrompts}
              disabled={reloading}
              className="gap-2"
            >
              <RefreshCw className={cn('size-4', reloading && 'animate-spin')} />
              重载 Prompt 模板
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] px-8 py-8">
        {/* 路由总览 / 降级链 */}
        <section className="mb-6 rounded-lg border border-border/60 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">路由总览</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                共 {routes.length} 个角色路由{fallbackEntries.length > 0 ? '，下方为降级链' : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadRoutes} className="h-8 text-[12px]">
              刷新
            </Button>
          </div>
          {fallbackEntries.length > 0 ? (
            <div className="grid gap-3 text-[12px] md:grid-cols-2 xl:grid-cols-3">
              {fallbackEntries.map(([role, chain]) => (
                <div
                  key={role}
                  className="rounded-md border border-border/60 bg-background px-3 py-2"
                >
                  <div className="text-muted-foreground">{role}</div>
                  <div className="mt-1 truncate font-mono text-[11px]">{chain.join(' → ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/25 px-3 py-4 text-center text-[12px] text-muted-foreground">
              未配置降级链
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* 角色路由列表 */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">角色路由</h2>
              <button
                onClick={resetForm}
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                新建
              </button>
            </div>
            <div className="space-y-2">
              {routes.map((cfg) => (
                <div
                  key={cfg.role}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    selectedRole === cfg.role
                      ? 'border-foreground/30 bg-muted/40'
                      : 'border-border/60 hover:bg-muted/30',
                  )}
                >
                  <button onClick={() => handleEdit(cfg)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{cfg.role}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {cfg.provider} · {cfg.model}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground/80">
                      env: {cfg.api_key_env || '—'}
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cfg.role)}
                      disabled={routes.length <= 1}
                      className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 表单 */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">
              {selectedRole ? `编辑路由：${selectedRole}` : '新建路由'}
            </h2>
            {(error || success) && (
              <div
                className={cn(
                  'mb-4 rounded-lg p-3 text-[13px]',
                  error && 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
                  success && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
                )}
              >
                {error || success}
              </div>
            )}
            <div className="space-y-4 rounded-lg border border-border/60 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[13px]">角色 role</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setField('role', e.target.value)}
                    placeholder="如：default / chat / compliance"
                    disabled={!!selectedRole}
                    className="mt-1.5"
                  />
                  {selectedRole && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      role 是主键，编辑时不可修改；如需改名请新建后删除旧的。
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[13px]">Provider</Label>
                  <Select value={form.provider} onValueChange={(v) => setField('provider', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="选择 provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[13px]">模型 model</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setField('model', e.target.value)}
                  placeholder="如：claude-sonnet-4-20250514"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-[13px]">API Key 环境变量名</Label>
                <Input
                  value={form.apiKeyEnv}
                  onChange={(e) => setField('apiKeyEnv', e.target.value)}
                  placeholder="如：ANTHROPIC_API_KEY"
                  className="mt-1.5 font-mono"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  此处填环境变量名（非明文 Key）；实际密钥在服务器环境变量中配置。
                </p>
              </div>
              <div>
                <Label className="text-[13px]">Base URL（可选）</Label>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => setField('baseUrl', e.target.value)}
                  placeholder="留空使用 provider 默认地址"
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-[13px]">Max Tokens</Label>
                  <Input
                    value={form.maxTokens}
                    onChange={(e) => setField('maxTokens', e.target.value)}
                    type="number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[13px]">Temperature</Label>
                  <Input
                    value={form.temperature}
                    onChange={(e) => setField('temperature', e.target.value)}
                    type="number"
                    step="0.1"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[13px]">Top P</Label>
                  <Input
                    value={form.topP}
                    onChange={(e) => setField('topP', e.target.value)}
                    type="number"
                    step="0.1"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {selectedRole && (
                  <Button variant="outline" onClick={resetForm} className="h-9 px-4 text-[13px]">
                    取消编辑
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.role.trim() || !form.model.trim()}
                  className="h-9 px-4 text-[13px]"
                >
                  {saving ? '保存中...' : selectedRole ? '更新路由' : '创建路由'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
