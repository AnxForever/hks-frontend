import { useEffect, useId, useMemo, useState } from 'react'
import {
  ArrowLeft,
  FileText,
  FileCode2,
  ClipboardCheck,
  X,
  Loader2,
  Download,
  Upload,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { ComplianceCard } from '@/components/chat/ComplianceCard'
import type { ComplianceResult, SessionMessage } from '@/types'

/**
 * 会话产物（对齐 DeerFlow Artifacts）：
 * - file:   Agent 通过 write_file/edit_file 落盘的虚拟文件
 * - report: 每条 AI 回复的合规报告（markdown 正文 + compliance_result）
 */
export type ChatArtifact =
  | {
      id: string
      kind: 'file'
      name: string
      path: string
      size?: number
      messageId: string
      // 产品 scope 产物（如 Agent 关联的认证文档登记记录）：
      // 携带真实 productId/artifactId 以支持上传附件与按记录删除
      productId?: string
      artifactId?: string
    }
  | {
      id: string
      kind: 'report'
      name: string
      content: string
      compliance_result?: ComplianceResult
      messageId: string
    }

/** 从会话消息聚合产物列表（供面板与触发入口共用）。 */
export function collectArtifacts(messages: SessionMessage[]): ChatArtifact[] {
  const artifacts: ChatArtifact[] = []
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue
    if (msg.compliance_result) {
      artifacts.push({
        id: `report_${msg.id}`,
        kind: 'report',
        name: '合规报告',
        content: msg.content,
        compliance_result: msg.compliance_result,
        messageId: msg.id,
      })
    }
    ;(msg.files ?? []).forEach((f, idx) => {
      if (f.exists === false) return
      artifacts.push({
        id: `file_${msg.id}_${idx}`,
        kind: 'file',
        name: f.name,
        path: f.path,
        size: f.size,
        messageId: msg.id,
      })
    })
  }
  return artifacts
}

/** 从单条消息聚合产物（用于消息内产物卡片）。 */
export function messageArtifacts(msg: SessionMessage): ChatArtifact[] {
  return collectArtifacts([msg])
}

function formatSize(size?: number): string {
  if (size == null) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function isMarkdown(name: string): boolean {
  return /\.(md|markdown)$/i.test(name)
}

/** 触发浏览器下载一个 Blob。 */
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function ArtifactIcon({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.kind === 'report') return <ClipboardCheck className="size-4 shrink-0 text-primary" />
  return isMarkdown(artifact.name) ? (
    <FileText className="size-4 shrink-0 text-muted-foreground" />
  ) : (
    <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
  )
}

function FileDetail({
  artifact,
  editing,
  onStopEditing,
}: {
  artifact: Extract<ChatArtifact, { kind: 'file' }>
  editing: boolean
  onStopEditing: () => void
}) {
  const { authFetch } = useAuth()
  const [content, setContent] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // 登记记录型产物（如 Agent 关联的认证文档）无落盘文件，跳过读取避免 404
    if (!artifact.path) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setContent('')
    authFetch(`/api/v1/chat/files?path=${encodeURIComponent(artifact.path)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { content?: string }) => {
        if (!cancelled) {
          setContent(data.content ?? '')
          setDraft(data.content ?? '')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '读取失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [artifact.path, authFetch])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authFetch(`/api/v1/chat/files?path=${encodeURIComponent(artifact.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setContent(draft)
      toast.success('已保存')
      onStopEditing()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!artifact.path) {
    return (
      <div className="px-1 py-6 text-[13px] text-muted-foreground">
        此产物为登记记录，暂无附件。可点击上方「上传附件」上传证书文件。
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        加载文件
      </div>
    )
  }
  if (error) {
    return <div className="px-1 py-6 text-[13px] text-destructive">读取产物失败：{error}</div>
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="min-h-[360px] w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-[12.5px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(content)
              onStopEditing()
            }}
            disabled={saving}
            className="rounded-md border border-border/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    )
  }

  if (isMarkdown(artifact.name)) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:p-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    )
  }
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-[12.5px] leading-relaxed">
      {content}
    </pre>
  )
}

function ArtifactDetail({
  artifact,
  editing,
  onStopEditing,
}: {
  artifact: ChatArtifact
  editing: boolean
  onStopEditing: () => void
}) {
  if (artifact.kind === 'report') {
    return (
      <div className="flex flex-col gap-3">
        {artifact.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
          </div>
        )}
        {artifact.compliance_result && <ComplianceCard result={artifact.compliance_result} />}
      </div>
    )
  }
  return <FileDetail artifact={artifact} editing={editing} onStopEditing={onStopEditing} />
}

/** 详情头部操作条：上传 / 下载 / 编辑 / 删除。 */
function ArtifactActions({
  artifact,
  editing,
  onToggleEdit,
  onDeleted,
  onChanged,
}: {
  artifact: ChatArtifact
  editing: boolean
  onToggleEdit: () => void
  onDeleted: (id: string) => void
  onChanged?: () => void
}) {
  const { authFetch } = useAuth()
  const confirm = useConfirm()
  const uploadInputId = useId()
  const [busy, setBusy] = useState(false)

  // 产品 scope 产物（登记记录）：可上传附件/按记录删除，不提供在线编辑
  const isProduct = artifact.kind === 'file' && !!artifact.productId && !!artifact.artifactId
  const canDownload = artifact.kind === 'report' || (artifact.kind === 'file' && !!artifact.path)

  const handleDownload = async () => {
    if (artifact.kind === 'report') {
      // 合规报告直接把 markdown 正文导出为 .md
      triggerBlobDownload(
        new Blob([artifact.content], { type: 'text/markdown;charset=utf-8' }),
        `${artifact.name}.md`,
      )
      return
    }
    setBusy(true)
    try {
      const res = await authFetch(
        `/api/v1/chat/files/download?path=${encodeURIComponent(artifact.path)}`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      triggerBlobDownload(await res.blob(), artifact.name)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '下载失败')
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选同一文件
    if (!file || artifact.kind !== 'file' || !artifact.productId || !artifact.artifactId) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await authFetch(
        `/api/v1/products/${encodeURIComponent(artifact.productId)}/artifacts/${encodeURIComponent(artifact.artifactId)}/upload`,
        { method: 'POST', body: form },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('附件已上传')
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (artifact.kind !== 'file') return
    const ok = await confirm({
      title: '删除产物',
      description: `确认删除「${artifact.name}」？此操作不可撤销。`,
      variant: 'destructive',
    })
    if (!ok) return
    setBusy(true)
    try {
      const res =
        isProduct && artifact.productId && artifact.artifactId
          ? await authFetch(
              `/api/v1/products/${encodeURIComponent(artifact.productId)}/artifacts/${encodeURIComponent(artifact.artifactId)}`,
              { method: 'DELETE' },
            )
          : await authFetch(`/api/v1/chat/files?path=${encodeURIComponent(artifact.path)}`, {
              method: 'DELETE',
            })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('已删除')
      onDeleted(artifact.id)
      onChanged?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {canDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          title="下载到本地"
          aria-label="下载到本地"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" />
        </button>
      )}
      {isProduct && (
        <>
          <label
            htmlFor={uploadInputId}
            title={artifact.kind === 'file' && artifact.path ? '替换附件' : '上传附件'}
            aria-label={artifact.kind === 'file' && artifact.path ? '替换附件' : '上传附件'}
            className={cn(
              'cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <Upload className="size-4" />
          </label>
          <input
            id={uploadInputId}
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={handleUpload}
          />
        </>
      )}
      {artifact.kind === 'file' && artifact.path && !isProduct && (
        <button
          type="button"
          onClick={onToggleEdit}
          disabled={busy}
          title={editing ? '退出编辑' : '编辑'}
          aria-label={editing ? '退出编辑' : '编辑'}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            editing ? 'bg-muted text-foreground' : 'text-muted-foreground',
          )}
        >
          <Pencil className="size-4" />
        </button>
      )}
      {artifact.kind === 'file' && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          title="删除"
          aria-label="删除"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  )
}

function CreateFileForm({
  pathPrefix,
  onCancel,
  onCreated,
}: {
  pathPrefix?: string
  onCancel: () => void
  onCreated: (artifact: Extract<ChatArtifact, { kind: 'file' }>) => void
}) {
  const { authFetch } = useAuth()
  const nameId = useId()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const filename = name.trim()
    if (!filename) return toast.error('请输入文件名')
    const prefix = (pathPrefix ?? 'output/chat').replace(/\/+$/, '')
    const path = `${prefix}/${filename}`
    setBusy(true)
    try {
      const res = await authFetch(`/api/v1/chat/files?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { detail?: string }).detail || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { path: string; name: string; size?: number }
      toast.success('文件已创建')
      onCreated({
        id: `created_${data.path}`,
        kind: 'file',
        name: data.name,
        path: data.path,
        size: data.size,
        messageId: 'user',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex flex-col gap-2 rounded-md border border-border/60 bg-background p-3"
    >
      <div>
        <label htmlFor={nameId} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          文件名
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如 整改清单.md"
          autoComplete="off"
          className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-[12.5px] outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="初始内容（可为空）…"
        spellCheck={false}
        className="min-h-[80px] w-full resize-y rounded-md border border-input bg-background p-2.5 font-mono text-[12px] leading-relaxed outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-border/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          创建
        </button>
      </div>
    </form>
  )
}

export function ArtifactsPanel({
  open,
  artifacts,
  focusId,
  onClose,
  onDeleted,
  uploadPathPrefix,
  onCreated,
  onChanged,
}: {
  open: boolean
  artifacts: ChatArtifact[]
  focusId?: string | null
  onClose: () => void
  onDeleted?: (id: string) => void
  uploadPathPrefix?: string
  onCreated?: (artifact: Extract<ChatArtifact, { kind: 'file' }>) => void
  onChanged?: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  // 外部聚焦某个产物时同步选中
  useEffect(() => {
    if (open && focusId) setSelectedId(focusId)
  }, [open, focusId])

  // 选中的产物被移除时回退到列表
  useEffect(() => {
    if (selectedId && !artifacts.some((a) => a.id === selectedId)) {
      setSelectedId(null)
    }
  }, [artifacts, selectedId])

  // 切换选中产物时退出编辑态
  useEffect(() => {
    setEditing(false)
  }, [selectedId])

  const selected = useMemo(
    () => artifacts.find((a) => a.id === selectedId) ?? null,
    [artifacts, selectedId],
  )

  if (!open) return null

  const handleDeleted = (id: string) => {
    onDeleted?.(id)
    setSelectedId(null)
  }

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border/60 bg-card/40">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-3.5" />
              返回
            </button>
          ) : (
            <span>产物 · {artifacts.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!selected && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              aria-label="新建文件"
              title="新建文件"
              className={cn(
                'rounded-md p-1 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                creating ? 'bg-muted text-foreground' : 'text-muted-foreground',
              )}
            >
              <Plus className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭产物面板"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {creating && !selected && (
          <CreateFileForm
            pathPrefix={uploadPathPrefix}
            onCancel={() => setCreating(false)}
            onCreated={(artifact) => {
              setCreating(false)
              onCreated?.(artifact)
            }}
          />
        )}
        {selected ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                <ArtifactIcon artifact={selected} />
                <span className="truncate">{selected.name}</span>
              </div>
              <ArtifactActions
                artifact={selected}
                editing={editing}
                onToggleEdit={() => setEditing((v) => !v)}
                onDeleted={handleDeleted}
                onChanged={onChanged}
              />
            </div>
            <ArtifactDetail
              artifact={selected}
              editing={editing}
              onStopEditing={() => setEditing(false)}
            />
          </div>
        ) : artifacts.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">
            暂无产物
            <p className="mt-1 text-[12px] text-muted-foreground/70">
              Agent 生成的文件与合规报告会在此汇总
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {artifacts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md border border-border/60 bg-background px-3 py-2.5 text-left transition-colors',
                    'hover:border-border hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <ArtifactIcon artifact={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{a.name}</span>
                    <span className="block text-[11px] text-muted-foreground/70">
                      {a.kind === 'report' ? '合规报告' : a.path || '登记记录'}
                    </span>
                  </span>
                  {a.kind === 'file' && a.size != null && (
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
                      {formatSize(a.size)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

