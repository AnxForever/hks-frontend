import { useState, useEffect, useCallback } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { modelConfigsApi, type ModelConfigItem } from '../api/config'

// 常见角色 / Provider 建议（datalist，仅便捷输入，非强约束）
const ROLE_SUGGESTIONS = ['risk_analysis', 'lifecycle_analysis', 'dispatch', 'embedding', 'general']
const PROVIDER_SUGGESTIONS = ['jiutian', 'openai', 'anthropic', 'deepseek', 'mimo', 'google']

const EMPTY_FORM = {
  role: '',
  provider: 'openai',
  model: '',
  api_key_env: '',
  base_url: '',
  max_tokens: '4096',
  temperature: '0.7',
  top_p: '0.9',
}

export default function ModelConfigPage() {
  const confirm = useConfirm()
  const [configs, setConfigs] = useState<ModelConfigItem[]>([])
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConfigs = useCallback(async () => {
    try {
      const data = await modelConfigsApi.list()
      setConfigs(data.configs || [])
    } catch {
      setConfigs([])
    }
  }, [])

  useEffect(() => { loadConfigs() }, [loadConfigs])

  const resetForm = useCallback(() => {
    setEditingRole(null)
    setForm({ ...EMPTY_FORM })
    setError(null)
    setSuccess(null)
  }, [])

  const handleEdit = (cfg: ModelConfigItem) => {
    setEditingRole(cfg.role)
    setForm({
      role: cfg.role,
      provider: cfg.provider,
      model: cfg.model,
      api_key_env: cfg.api_key_env || '',
      base_url: cfg.base_url || '',
      max_tokens: String(cfg.max_tokens ?? 4096),
      temperature: String(cfg.temperature ?? 0.7),
      top_p: String(cfg.top_p ?? 0.9),
    })
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (!form.role.trim() || !form.provider.trim() || !form.model.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        role: form.role.trim(),
        provider: form.provider.trim(),
        model: form.model.trim(),
        api_key_env: form.api_key_env.trim(),
        base_url: form.base_url.trim(),
        max_tokens: parseInt(form.max_tokens) || 4096,
        temperature: parseFloat(form.temperature),
        top_p: parseFloat(form.top_p),
      }
      if (editingRole) {
        await modelConfigsApi.update(editingRole, payload)
      } else {
        await modelConfigsApi.create(payload)
      }
      await loadConfigs()
      const message = editingRole ? '路由已更新' : '路由已创建'
      resetForm()
      setSuccess(message)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: string) => {
    if (!(await confirm({ title: '删除路由', description: `确认删除「${role}」模型路由？`, variant: 'destructive' }))) return
    try {
      await modelConfigsApi.delete(role)
      if (editingRole === role) resetForm()
      await loadConfigs()
      setSuccess('路由已删除')
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  // 权限模型：页面成员与管理员一致可见，写操作由后端 require_admin 兑底

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <div>
              <h1 className="text-[28px] font-semibold tracking-tight">模型配置</h1>
              <p className="mt-1 text-[14px] text-muted-foreground/80">
                按角色（role）管理 LLM 路由，与网关的多模型分发对齐
              </p>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] px-8 py-8">
        {(error || success) && (
          <div className={cn(
            'mb-6 rounded-lg p-3 text-[13px]',
            error && 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
            success && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
          )}>
            {error || success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* 路由列表 */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">已有路由</h2>
              <button
                onClick={resetForm}
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                新建
              </button>
            </div>
            {configs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/25 px-3 py-10 text-center text-[13px] text-muted-foreground">
                暂无路由，点击「新建」创建
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map((cfg) => (
                  <div
                    key={cfg.role}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      editingRole === cfg.role
                        ? 'border-foreground/30 bg-muted/40'
                        : 'border-border/60 hover:bg-muted/30',
                    )}
                  >
                    <button onClick={() => handleEdit(cfg)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{cfg.role}</div>
                          <div className="text-[11px] text-muted-foreground">{cfg.provider} · {cfg.model}</div>
                        </div>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
                        {cfg.api_key_env || '未设置 api_key_env'}
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cfg.role)}
                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 表单 */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">
              {editingRole ? `编辑路由：${editingRole}` : '新建路由'}
            </h2>
            <div className="space-y-4 rounded-lg border border-border/60 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-[13px]">角色 role</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="如：risk_analysis"
                    list="role-suggestions"
                    disabled={!!editingRole}
                    className="mt-1.5"
                  />
                  <datalist id="role-suggestions">
                    {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
                  </datalist>
                  {editingRole && (
                    <p className="mt-1 text-[11px] text-muted-foreground">role 为路由标识，编辑时不可修改。</p>
                  )}
                </div>
                <div>
                  <Label className="text-[13px]">模型供应商</Label>
                  <Input
                    value={form.provider}
                    onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}
                    placeholder="如：openai"
                    list="provider-suggestions"
                    className="mt-1.5"
                  />
                  <datalist id="provider-suggestions">
                    {PROVIDER_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <Label className="text-[13px]">模型名称</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="如：mimo-v2.5-pro"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-[13px]">API Key 环境变量名</Label>
                <Input
                  value={form.api_key_env}
                  onChange={(e) => setForm(f => ({ ...f, api_key_env: e.target.value }))}
                  placeholder="如：MIMO_API_KEY（存储的是环境变量名，非明文密钥）"
                  className="mt-1.5"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  后端按此环境变量名读取真实密钥，页面不保存明文 Key。
                </p>
              </div>
              <div>
                <Label className="text-[13px]">接口地址 (Base URL)</Label>
                <Input
                  value={form.base_url}
                  onChange={(e) => setForm(f => ({ ...f, base_url: e.target.value }))}
                  placeholder="如：https://api.xiaomimimo.com/v1"
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-[13px]">最大令牌数</Label>
                  <Input
                    value={form.max_tokens}
                    onChange={(e) => setForm(f => ({ ...f, max_tokens: e.target.value }))}
                    type="number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[13px]">温度 (Temperature)</Label>
                  <Input
                    value={form.temperature}
                    onChange={(e) => setForm(f => ({ ...f, temperature: e.target.value }))}
                    type="number"
                    step="0.1"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[13px]">Top P（核采样）</Label>
                  <Input
                    value={form.top_p}
                    onChange={(e) => setForm(f => ({ ...f, top_p: e.target.value }))}
                    type="number"
                    step="0.1"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {editingRole && (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="h-9 px-4 text-[13px]"
                  >
                    取消编辑
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.role.trim() || !form.provider.trim() || !form.model.trim()}
                  className="h-9 px-4 text-[13px]"
                >
                  {saving ? '保存中...' : '保存路由'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
