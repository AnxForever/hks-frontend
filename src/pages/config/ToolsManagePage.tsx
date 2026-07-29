import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import ToolConfigCard from '../../components/config/ToolConfigCard'
import McpServerEditModal from '../../components/config/McpServerEditModal'
import type { ToolItem, McpServerItem } from '../../api/config'
import { toolsApi, mcpServersApi } from '../../api/config'
import { useConfirm } from '@/hooks/useConfirm'

export default function ToolsManagePage() {
  const confirm = useConfirm()
  // ── 系统工具（只读，数据源：后端 ToolRegistry）─────────────────
  const [tools, setTools] = useState<ToolItem[]>([])
  const [toolsLoading, setToolsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')

  // ── MCP Servers（可配置，数据源：extensions_config.mcpServers）──
  const [servers, setServers] = useState<McpServerItem[]>([])
  const [serversLoading, setServersLoading] = useState(true)
  const [editing, setEditing] = useState<McpServerItem | null>(null)
  const [showNew, setShowNew] = useState(false)

  const loadTools = useCallback(async () => {
    setToolsLoading(true)
    try {
      const data = await toolsApi.list()
      setTools(data.tools)
    } catch {
      setTools([])
    } finally {
      setToolsLoading(false)
    }
  }, [])

  const loadServers = useCallback(async () => {
    setServersLoading(true)
    try {
      const data = await mcpServersApi.list()
      setServers(data.servers)
    } catch {
      setServers([])
    } finally {
      setServersLoading(false)
    }
  }, [])

  useEffect(() => { loadTools() }, [loadTools])
  useEffect(() => { loadServers() }, [loadServers])

  // 分类标签从已加载的系统工具动态派生
  const categoryTabs = useMemo(() => {
    const cats = Array.from(new Set(tools.map(t => t.category).filter(Boolean))) as string[]
    cats.sort()
    return [{ key: '', label: '全部' }, ...cats.map(c => ({ key: c, label: c }))]
  }, [tools])

  const filteredTools = useMemo(
    () => (categoryFilter ? tools.filter(t => t.category === categoryFilter) : tools),
    [tools, categoryFilter],
  )

  // ── MCP server 操作 ────────────────────────────────────────
  const handleDeleteServer = async (name: string) => {
    const ok = await confirm({
      title: '删除 MCP Server',
      description: `确定删除 MCP Server「${name}」？`,
      variant: 'destructive',
      confirmLabel: '删除',
    })
    if (!ok) return
    try {
      await mcpServersApi.delete(name)
      toast.success('已删除', { description: name })
      loadServers()
    } catch (e) {
      toast.error('删除失败', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const handleToggleServer = async (name: string) => {
    try {
      await mcpServersApi.toggle(name)
      loadServers()
    } catch (e) {
      toast.error('操作失败', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ── 系统工具（只读）──────────────────────────── */}
        <section>
          <div className="mb-1">
            <h1 className="text-lg font-semibold text-foreground">系统工具</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              内置能力，由系统注册并统一治理，共 {tools.length} 个（只读）
            </p>
          </div>

          {/* 分类过滤 */}
          {categoryTabs.length > 1 && (
            <div className="flex items-center flex-wrap gap-1 my-4">
              {categoryTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setCategoryFilter(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    categoryFilter === tab.key
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {toolsLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">加载中...</div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">暂无系统工具</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTools.map(t => (
                <ToolConfigCard key={t.id} tool={t} />
              ))}
            </div>
          )}
        </section>

        {/* ── MCP Servers（可配置）──────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">MCP 服务</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                接入外部工具来源，无需开发即可配置；
                {servers.filter(s => s.enabled).length}/{servers.length} 个已启用
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              + 新增 MCP Server
            </button>
          </div>

          {serversLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">加载中...</div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">暂无 MCP 服务，点击右上角新增</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {servers.map(s => (
                <div key={s.name} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">🔌</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{s.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.type}</span>
                          {s.type === 'stdio' ? (
                            <span className="text-[11px] text-muted-foreground truncate">{s.command || '—'}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground truncate">{s.url || '—'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleServer(s.name)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                          s.enabled
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {s.enabled ? '已启用' : '停用'}
                      </button>
                      <button onClick={() => setEditing(s)} className="text-xs text-primary hover:underline px-1.5 py-0.5">编辑</button>
                      <button onClick={() => handleDeleteServer(s.name)} className="text-xs text-destructive hover:underline px-1.5 py-0.5">删除</button>
                    </div>
                  </div>
                  {s.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {(editing || showNew) && (
          <McpServerEditModal
            server={editing}
            onClose={() => { setEditing(null); setShowNew(false) }}
            onSaved={() => { setEditing(null); setShowNew(false); loadServers(); loadTools() }}
          />
        )}
      </div>
    </div>
  )
}
