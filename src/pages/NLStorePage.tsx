/**
 * 记忆库 — 商品记忆画像管理
 * 全量展示所有记忆记录，namespace 仅作分类筛选标签。
 * 支持：点击展开查看 / 编辑 / 删除 / 全文搜索 / 新增
 */
import { useEffect, useMemo, useState } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  useAllNLRecords,
  useCreateNLRecord,
  useDeleteNLRecord,
  useNLNamespaces,
  useNLRecord,
  useNLSearch,
  useUpdateNLRecord,
} from '@/hooks/queries/useNLStore'
import { cn } from '@/lib/utils'
import type { NLAllItem, NLRecordCreateRequest, NLSearchResult } from '@/types'

/** namespace 显示名映射 */
const NS_LABELS: Record<string, string> = {
  products: '商品画像',
  sessions: '会话记忆',
  memories: '通用记忆',
  strategies: '策略',
  default: '默认',
}
const nsLabel = (ns: string) => NS_LABELS[ns] ?? ns

export default function NLStorePage() {
  const [tab, setTab] = useState('browse')
  const confirm = useConfirm()
  const [nsFilter, setNsFilter] = useState<string | null>(null) // null = 全部
  const [expanded, setExpanded] = useState<{ ns: string; key: string } | null>(null)
  const [editing, setEditing] = useState<{ ns: string; key: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<NLSearchResult[] | null>(null)

  const { data: allRecords, isLoading } = useAllNLRecords()
  const { data: namespaces } = useNLNamespaces()
  const search = useNLSearch()
  const createRec = useCreateNLRecord()
  const updateRec = useUpdateNLRecord()
  const deleteRec = useDeleteNLRecord()

  // 展开/编辑时加载完整记录
  const activeNs = expanded?.ns ?? editing?.ns ?? ''
  const activeKey = expanded?.key ?? editing?.key ?? ''
  const { data: fullRecord, isLoading: loadingFull } = useNLRecord(activeNs, activeKey)

  const filtered = useMemo(
    () => (nsFilter ? (allRecords ?? []).filter((r) => r.namespace === nsFilter) : allRecords ?? []),
    [allRecords, nsFilter],
  )

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQ.trim()) return
    try {
      const r = await search.mutateAsync({ q: searchQ.trim() })
      setSearchResults(r)
      if (r.length === 0) toast.info('未命中相关记忆')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '搜索失败')
    }
  }

  const handleDelete = async (item: NLAllItem) => {
    if (!(await confirm({
      title: '删除记忆',
      description: `确认删除「${item.title || item.key}」？删除后不可恢复。`,
      variant: 'destructive',
    }))) return
    try {
      await deleteRec.mutateAsync({ namespace: item.namespace, key: item.key })
      toast.success('已删除')
      if (expanded?.key === item.key) setExpanded(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleUpdate = async (_ns: string, req: NLRecordCreateRequest) => {
    if (!editing) return
    try {
      await updateRec.mutateAsync({ namespace: editing.ns, key: editing.key, title: req.title, content_nl: req.content_nl, metadata: req.metadata, tags: req.tags })
      toast.success('已更新')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleCreate = async (ns: string, req: NLRecordCreateRequest) => {
    try {
      await createRec.mutateAsync({ namespace: ns, ...req })
      toast.success('已创建')
      setAdding(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-[1100px] px-6 py-7 sm:px-8 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">记忆库</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              商品记忆画像 · 点击卡片查看详情 · 支持编辑与删除
            </p>
          </div>
          <Button onClick={() => setAdding(true)} size="sm">
            <Plus className="mr-2 size-4" /> 添加记忆
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-8 sm:px-8 space-y-6">
        {/* 分类筛选 chip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNsFilter(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              nsFilter === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            全部{allRecords ? ` (${allRecords.length})` : ''}
          </button>
          {(namespaces ?? []).map((ns) => {
            const count = (allRecords ?? []).filter((r) => r.namespace === ns).length
            return (
              <button
                key={ns}
                onClick={() => setNsFilter(nsFilter === ns ? null : ns)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  nsFilter === ns
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {nsLabel(ns)} ({count})
              </button>
            )
          })}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="browse" className="gap-1.5">
              <Database className="size-3.5" /> 浏览
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="size-3.5" /> 搜索
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {isLoading ? <Loader /> : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
                <FileText className="mx-auto size-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {nsFilter ? `「${nsLabel(nsFilter)}」分类下暂无记忆记录` : '暂无记忆记录'}，点击右上角添加。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => {
                  const isExpanded = expanded?.ns === item.namespace && expanded?.key === item.key
                  return (
                    <div
                      key={`${item.namespace}/${item.key}`}
                      className={cn(
                        'rounded-lg border border-border bg-card transition-colors hover:border-foreground/20',
                        isExpanded && 'ring-1 ring-primary/30 border-primary/30',
                      )}
                    >
                      {/* 卡片头 — 点击展开/收起 */}
                      <div
                        className="flex cursor-pointer items-start justify-between gap-3 p-4"
                        onClick={() => setExpanded(isExpanded ? null : { ns: item.namespace, key: item.key })}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isExpanded
                              ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                            <span className="font-semibold text-[14px]">{item.title || item.key}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {nsLabel(item.namespace)}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-6">
                            {item.tags?.map((t) => (
                              <span key={t} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                <Tag className="size-2.5 mr-0.5" /> {t}
                              </span>
                            ))}
                            <span className="ml-1 text-[11px] text-muted-foreground/70">
                              更新于 {formatTime(item.updated_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); setEditing({ ns: item.namespace, key: item.key }) }}
                          >
                            <Pencil className="size-3" /> 编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* 展开详情 */}
                      {isExpanded && (
                        <div className="border-t border-border/60 px-4 pb-4 pt-3 pl-10">
                          {loadingFull ? (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin" /> 加载详情…
                            </div>
                          ) : fullRecord ? (
                            <div className="space-y-3">
                              <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[13px] leading-6 text-foreground/90">
                                {fullRecord.content_nl || '（无正文内容）'}
                              </div>
                              {fullRecord.metadata && Object.keys(fullRecord.metadata).length > 0 && (
                                <div>
                                  <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">元数据</p>
                                  <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-[11px] leading-5 text-muted-foreground">
                                    {JSON.stringify(fullRecord.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <p className="text-[11px] text-muted-foreground/70">
                                key: <span className="font-mono">{fullRecord.key}</span>
                                {' · '}创建于 {formatTime(fullRecord.created_at)}
                              </p>
                            </div>
                          ) : (
                            <p className="py-2 text-xs text-muted-foreground">详情加载失败</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search">
            <form onSubmit={handleSearch} className="flex items-end gap-3 mb-5">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">全文搜索</label>
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="输入关键词搜索标题 + 内容 + 标签"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button type="submit" disabled={search.isPending}>
                {search.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {search.isPending ? '搜索中' : '搜索'}
              </Button>
            </form>
            {searchResults && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">命中 {searchResults.length} 条</p>
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="cursor-pointer rounded-lg border border-border bg-card p-4 space-y-2 transition-colors hover:border-foreground/20"
                    onClick={() => {
                      setTab('browse')
                      setNsFilter(null)
                      setExpanded({ ns: r.namespace, key: r.key })
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="text-[10px]">{nsLabel(r.namespace)}</Badge>
                      <span className="font-medium">{r.title}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">匹配度 {r.score}</span>
                    </div>
                    <p className="text-[13px] leading-5 text-foreground/85">{r.content_preview}</p>
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 编辑 Dialog */}
        <NLRecordDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          title="编辑记忆"
          namespace={editing?.ns ?? 'products'}
          namespaceLocked
          namespaces={namespaces ?? []}
          initial={fullRecord && editing
            ? { key: fullRecord.key, title: fullRecord.title, content_nl: fullRecord.content_nl, metadata: fullRecord.metadata, tags: fullRecord.tags }
            : { key: '', title: '', content_nl: '', tags: [] }}
          loading={loadingFull && !!editing}
          onSave={handleUpdate}
          saving={updateRec.isPending}
        />

        {/* 新增 Dialog */}
        <NLRecordDialog
          open={adding}
          onClose={() => setAdding(false)}
          title="添加记忆"
          namespace="products"
          namespaceLocked={false}
          namespaces={namespaces ?? []}
          initial={{ key: '', title: '', content_nl: '', tags: [] }}
          loading={false}
          onSave={handleCreate}
          saving={createRec.isPending}
        />
      </div>
    </div>
  )
}

/* ── 记录编辑/新增 Dialog ─────────────────────────── */

function NLRecordDialog({
  open,
  onClose,
  title,
  namespace,
  namespaceLocked,
  namespaces,
  initial,
  loading,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  title: string
  namespace: string
  namespaceLocked: boolean
  namespaces: string[]
  initial: NLRecordCreateRequest
  loading: boolean
  onSave: (ns: string, req: NLRecordCreateRequest) => Promise<void>
  saving: boolean
}) {
  const [ns, setNs] = useState(namespace)
  const [form, setForm] = useState<NLRecordCreateRequest>(initial)

  useEffect(() => {
    if (open) {
      setNs(namespace)
      setForm(initial)
    }
  }, [open, namespace, initial.key, initial.title, initial.content_nl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.key.trim()) { toast.error('Key 不能为空'); return }
    await onSave(ns, { ...form, tags: form.tags?.filter((t) => t.trim()) })
  }

  const tagStr = form.tags?.join(', ') ?? ''

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {namespaceLocked ? `分类: ${nsLabel(namespace)}` : '选择记忆所属分类'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> 加载记录…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!namespaceLocked && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">分类</label>
                <select
                  value={ns}
                  onChange={(e) => setNs(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {(namespaces.length > 0 ? namespaces : ['products', 'default']).map((n) => (
                    <option key={n} value={n}>{nsLabel(n)}（{n}）</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Key</label>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={namespaceLocked}
                placeholder="唯一标识，如 p_商品名_id"
                autoFocus={!namespaceLocked}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">标题</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="如：商品档案: 人造花"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">内容</label>
              <textarea
                value={form.content_nl}
                onChange={(e) => setForm({ ...form, content_nl: e.target.value })}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="自然语言描述的记忆内容…"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">标签（逗号分隔）</label>
              <input
                value={tagStr}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="家居装饰, 欧盟"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>取消</Button>
              <Button type="submit" disabled={saving || !form.key.trim()}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── 工具函数 ─────────────────────────── */

function formatTime(iso: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> 加载中…
    </div>
  )
}
