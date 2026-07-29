import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { cn } from '@/lib/utils'

const API = '/api/v1'

interface AgentListItem {
  id: string
  name: string
  type: string
  description: string
  system_prompt_preview: string
  enabled: boolean
  sort_order: number
  created_at: number
  updated_at: number
}

interface AgentDetail extends AgentListItem {
  system_prompt: string
}

interface SkillItem {
  skill_id: string
  name: string
  status: string
  description?: string
}

// 内置 Agent 类型标签
const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  general:       { label: '通用合规', className: 'text-blue-600 bg-blue-600/10 dark:text-blue-400 dark:bg-blue-400/10' },
  export_law:    { label: '出境法律', className: 'text-red-600 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10' },
  tax:           { label: '税务',     className: 'text-orange-600 bg-orange-600/10 dark:text-orange-400 dark:bg-orange-400/10' },
  culture:       { label: '民俗文化', className: 'text-green-600 bg-green-600/10 dark:text-green-400 dark:bg-green-400/10' },
  certification: { label: '认证标准', className: 'text-purple-600 bg-purple-600/10 dark:text-purple-400 dark:bg-purple-400/10' },
  custom:        { label: '自定义',   className: 'text-muted-foreground bg-muted' },
}

function getTypeInfo(type: string) {
  if (type in TYPE_LABELS) return TYPE_LABELS[type]!
  // 兼容带 agent_ 前缀的 type（如 agent_general → general）
  const stripped = type.replace(/^agent_/, '')
  if (stripped in TYPE_LABELS) return TYPE_LABELS[stripped]!
  if (type.startsWith('custom') || stripped.startsWith('custom')) return TYPE_LABELS.custom!
  return TYPE_LABELS.custom!
}

// 内置不可删除的 Agent id
const BUILTIN_IDS = new Set(['agent_general','agent_export_law','agent_tax','agent_culture','agent_cert'])

const EMPTY_FORM = {
  name: '',
  type: 'custom',
  description: '',
  system_prompt: '',
  enabled: true,
  sort_order: 99,
}

type ExtKey = 'skill_ids' | 'tool_ids'

export default function AgentConfigPage() {
  const { authFetch, isAdmin } = useAuth()
  const confirm = useConfirm()
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [selected, setSelected] = useState<AgentDetail | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [extLoading, setExtLoading] = useState(false)
  const [skillsList, setSkillsList] = useState<SkillItem[]>([])
  const [toolsList, setToolsList] = useState<SkillItem[]>([])
  const [agentSkills, setAgentSkills] = useState<string[]>([])
  const [agentTools, setAgentTools] = useState<string[]>([])

  const loadAgents = useCallback(async () => {
    const res = await authFetch(`${API}/agents`)
    if (res.ok) setAgents(await res.json())
  }, [authFetch])

  useEffect(() => { loadAgents() }, [])  // eslint-disable-line

  // 加载可用 Skills/Tools 列表（全局一次）
  useEffect(() => {
    const loadCatalog = async () => {
      const [skillsRes, toolsRes] = await Promise.all([
        authFetch(`${API}/skills`).catch(() => null),
        authFetch(`${API}/tools`).catch(() => null),
      ])
      if (skillsRes?.ok) {
        const data = await skillsRes.json()
        setSkillsList((data.skills || []).map((s: Record<string, unknown>) => ({
          skill_id: (s.name as string) || '',
          name: s.name as string,
          status: s.status as string,
          description: s.description as string | undefined,
        })))
      }
      if (toolsRes?.ok) {
        const data = await toolsRes.json()
        const tools = data.tools || data || []
        setToolsList((Array.isArray(tools) ? tools : []).map((t: Record<string, unknown>) => ({
          skill_id: (t.id as string) || (t.name as string) || '',
          name: t.name as string,
          status: t.enabled !== false ? 'enabled' : 'disabled',
          description: t.description as string | undefined,
        })))
      }
    }
    loadCatalog()
  }, [authFetch])

  const loadAgentExtensions = useCallback(async (agentId: string) => {
    setExtLoading(true)
    const [skillsRes, toolsRes] = await Promise.all([
      authFetch(`${API}/agents/${agentId}/skills`).catch(() => null),
      authFetch(`${API}/agents/${agentId}/tools`).catch(() => null),
    ])
    if (skillsRes?.ok) {
      const data = await skillsRes.json()
      setAgentSkills(data.skill_ids || [])
    }
    if (toolsRes?.ok) {
      const data = await toolsRes.json()
      setAgentTools(data.tool_ids || [])
    }
    setExtLoading(false)
  }, [authFetch])

  const toggleExtension = async (key: ExtKey, id: string, checked: boolean) => {
    const current = key === 'skill_ids' ? agentSkills : agentTools
    const next = checked ? [...current, id] : current.filter((x) => x !== id)
    if (key === 'skill_ids') setAgentSkills(next)
    else setAgentTools(next)
    // 新建态下 Agent 尚无 id，先缓存到本地，保存后再统一写入
    if (isNew || !selected) return
    await authFetch(`${API}/agents/${selected.id}/${key === 'skill_ids' ? 'skills' : 'tools'}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: next }),
    })
  }

  const openAgent = async (id: string) => {
    setIsNew(false)
    const res = await authFetch(`${API}/agents/${id}`)
    if (res.ok) {
      const data: AgentDetail = await res.json()
      setSelected(data)
      loadAgentExtensions(id)
      setForm({
        name: data.name,
        type: data.type,
        description: data.description,
        system_prompt: data.system_prompt,
        enabled: data.enabled,
        sort_order: data.sort_order,
      })
    }
  }

  const newAgent = () => {
    setIsNew(true)
    setSelected(null)
    setForm({ ...EMPTY_FORM })
    setAgentSkills([])
    setAgentTools([])
  }

  const handleSave = async () => {
    if (!isAdmin) return
    if (!form.name.trim() || !form.system_prompt.trim()) {
      toast.error('名称和 System Prompt 不能为空')
      return
    }
    setSaving(true)
    try {
      const url = isNew ? `${API}/agents` : `${API}/agents/${selected?.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail || '保存失败')
      }
      const saved: AgentDetail = await res.json()
      // 新建时把本地已选的 Skills/Tools 关联写入新建的 Agent
      if (isNew) {
        await Promise.all([
          authFetch(`${API}/agents/${saved.id}/skills`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_ids: agentSkills }),
          }).catch(() => null),
          authFetch(`${API}/agents/${saved.id}/tools`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool_ids: agentTools }),
          }).catch(() => null),
        ])
      }
      toast.success('保存成功')
      setIsNew(false)
      setSelected(saved)
      await loadAgents()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!isAdmin) return
    await authFetch(`${API}/agents/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    await loadAgents()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, enabled } : null)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return

    // 使用 toast.promise 显示确认对话框
    const confirmed = await confirm({ title: '删除 Agent', description: `确认删除 Agent「${name}」？内置 Agent 无法删除。`, variant: 'destructive' })
    if (!confirmed) return

    toast.promise(
      authFetch(`${API}/agents/${id}`, { method: 'DELETE' }),
      {
        loading: '删除中...',
        success: async (res) => {
          if (res.ok) {
            if (selected?.id === id) {
              setSelected(null)
              setForm({ ...EMPTY_FORM })
            }
            await loadAgents()
            return `已删除 ${name}`
          } else {
            const e = await res.json().catch(() => ({}))
            throw new Error(e.detail || '删除失败（内置 Agent 不可删除）')
          }
        },
        error: (err) => err.message || '删除失败',
      }
    )
  }

  const currentTitle = isNew ? '新建 Agent' : (selected?.name || 'Agent 配置')

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* 左栏 */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-border/60 bg-card">
        <div className="px-3 pb-2 pt-4">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Agent 列表
          </div>
          {isAdmin && (
            <button
              onClick={newAgent}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/80 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              <span>+</span> 新建自定义 Agent
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {agents.map(a => {
            const ti = getTypeInfo(a.type)
            const active = !isNew && selected?.id === a.id
            return (
              <button
                key={a.id}
                onClick={() => openAgent(a.id)}
                aria-pressed={active}
                className={cn(
                  'mb-0.5 flex w-full cursor-pointer flex-col gap-1 rounded-lg border-none px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'bg-muted'
                    : 'bg-transparent hover:bg-muted/60',
                  !a.enabled && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    ti.className
                  )}>
                    {ti.label}
                  </span>
                  <span className={cn(
                    'truncate text-[12px] text-foreground',
                    active && 'font-semibold'
                  )}>
                    {a.name}
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {a.system_prompt_preview}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 右栏 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-[15px] font-semibold text-foreground">{currentTitle}</h1>
              {selected && (
                <div className="text-[11px] text-muted-foreground">
                  {selected.enabled ? '已启用' : '已禁用'} · {getTypeInfo(selected.type).label}
                </div>
              )}
            </div>
          </div>

          {isAdmin && (selected || isNew) && (
            <div className="flex items-center gap-2">
              {selected && (
                <button
                  onClick={() => handleToggle(selected.id, !selected.enabled)}
                  className={cn(
                    'cursor-pointer rounded-lg border border-border bg-transparent px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted',
                    selected.enabled
                      ? 'text-destructive hover:text-destructive'
                      : 'text-success hover:text-success'
                  )}
                >
                  {selected.enabled ? '禁用' : '启用'}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer rounded-lg border-none bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              {selected && !BUILTIN_IDS.has(selected.id) && (
                <button
                  onClick={() => handleDelete(selected.id, selected.name)}
                  className="cursor-pointer rounded-lg border border-destructive/30 bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/5"
                >
                  删除
                </button>
              )}
            </div>
          )}
        </div>

        {/* 表单区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!(selected || isNew) ? (
            <div className="px-12 py-16 text-center text-muted-foreground">
              <div className="mb-3 text-[40px]">🤖</div>
              <div>从左侧选择 Agent 查看或编辑配置</div>
            </div>
          ) : (
            <>
              <div className="grid max-w-[800px] grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 名称 */}
                <Field label="Agent 名称">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="如：出境法律 Agent"
                    readOnly={!isAdmin}
                    className={inputClass}
                  />
                </Field>

                {/* 类型 */}
                <Field label="Agent 类型">
                  {BUILTIN_IDS.has(selected?.id || '') ? (
                    <div className={cn(inputClass, 'flex items-center gap-2 bg-muted')}>
                      <span className={cn(
                        'rounded px-2 py-0.5 text-[11px] font-semibold',
                        getTypeInfo(form.type).className
                      )}>
                        {getTypeInfo(form.type).label}
                      </span>
                      <span className="text-[13px] text-muted-foreground">{form.type}</span>
                    </div>
                  ) : (
                    <input
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      placeholder="custom_xxx"
                      readOnly={!isAdmin}
                      className={inputClass}
                    />
                  )}
                </Field>

                {/* 描述 */}
                <Field label="功能描述" span={2}>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="简要描述该 Agent 的职责范围"
                    readOnly={!isAdmin}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* System Prompt */}
              <div className="mt-4 max-w-[800px]">
                <Field label="System Prompt（发送给大模型的角色指令）">
                  <div className="relative">
                    <textarea
                      value={form.system_prompt}
                      onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                      readOnly={!isAdmin}
                      rows={16}
                      placeholder="输入该 Agent 的系统提示词，定义 AI 的角色、专业领域、回答风格和输出格式..."
                      className={cn(
                        'w-full resize-y rounded-lg border border-border bg-background px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none',
                        'min-h-[320px] focus-visible:ring-1 focus-visible:ring-ring',
                        !isAdmin && 'bg-muted'
                      )}
                    />
                    <div className="absolute bottom-2 right-3 text-[11px] text-muted-foreground/60">
                      {form.system_prompt.length} 字符
                    </div>
                  </div>
                </Field>
              </div>

              {/* 提示说明 */}
              <div className="mt-4 max-w-[800px] rounded-lg border border-primary/15 bg-primary/5 p-4 text-[12px] leading-relaxed text-primary">
                <strong>💡 System Prompt 编写提示</strong>
                <ul className="ml-4 mt-1.5 list-disc">
                  <li><strong>通用合规 Agent</strong>：需在末尾加 JSON 输出格式要求（product / target_country / action / confidence）</li>
                  <li><strong>专项 Agent</strong>：清晰定义专业领域边界，避免越权回答</li>
                  <li><strong>输出格式</strong>：建议明确指定回答语言、结构和详略程度</li>
                  <li>修改通用合规 Agent 的 System Prompt 将影响所有用户的合规查询行为</li>
                </ul>
              </div>

              {/* Skills / Tools 关联管理（新建态下先缓存，保存后写入） */}
              <div className="mt-6 max-w-[800px]">
                {isNew && (
                  <div className="mb-3 text-[12px] text-muted-foreground">
                    选中的 Skills / Tools 将在点击保存后一并关联到新 Agent。
                  </div>
                )}
                <ExtPanel
                  title="关联 Skills"
                  items={skillsList}
                  selected={agentSkills}
                  loading={extLoading}
                  canEdit={isAdmin}
                  onToggle={(id, checked) => toggleExtension('skill_ids', id, checked)}
                  emptyText="暂无可用 Skill"
                />
                <div className="h-4" />
                <ExtPanel
                  title="关联 Tools（插件）"
                  items={toolsList}
                  selected={agentTools}
                  loading={extLoading}
                  canEdit={isAdmin}
                  onToggle={(id, checked) => toggleExtension('tool_ids', id, checked)}
                  emptyText="暂无可用 Tool"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 扩展关联面板 ──────────────────────────────────────────────────

function ExtPanel({
  title,
  items,
  selected,
  loading,
  canEdit,
  onToggle,
  emptyText,
}: {
  title: string
  items: SkillItem[]
  selected: string[]
  loading: boolean
  canEdit: boolean
  onToggle: (id: string, checked: boolean) => void
  emptyText: string
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="text-[10px] font-normal text-muted-foreground/60 normal-case">
          ({selected.length}/{items.length || 0})
        </span>
      </div>
      {loading ? (
        <div className="py-2 text-[12px] text-muted-foreground">加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-2 text-[12px] text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => {
            const active = selected.includes(item.skill_id)
            return (
              <label
                key={item.skill_id}
                title={item.description || item.name}
                className={cn(
                  'inline-flex select-none items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
                  canEdit ? 'cursor-pointer' : 'cursor-default opacity-60',
                  active
                    ? 'border-success bg-success/10'
                    : 'border-border bg-transparent'
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  disabled={!canEdit}
                  onChange={(e) => onToggle(item.skill_id, e.target.checked)}
                  className="m-0 accent-success"
                />
                <span>{item.name}</span>
                {item.status && item.status !== 'active' && (
                  <span className="ml-0.5 text-[10px] text-warning">{item.status}</span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 工具组件 ──────────────────────────────────────────────────────────────────

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring'
