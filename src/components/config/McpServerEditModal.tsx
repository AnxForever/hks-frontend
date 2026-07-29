import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { McpServerItem } from '../../api/config'
import { mcpServersApi } from '../../api/config'

interface Props {
  server: McpServerItem | null  // null = 新建模式
  onClose: () => void
  onSaved: () => void
}

type KV = { key: string; value: string }

function toEntries(obj?: Record<string, string>): KV[] {
  if (!obj) return []
  return Object.entries(obj).map(([key, value]) => ({ key, value }))
}

function fromEntries(entries: KV[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of entries) {
    if (e.key.trim()) out[e.key.trim()] = e.value
  }
  return out
}

export default function McpServerEditModal({ server, onClose, onSaved }: Props) {
  const isNew = !server

  const [name, setName] = useState('')
  const [type, setType] = useState<'stdio' | 'sse' | 'http'>('stdio')
  const [command, setCommand] = useState('')
  const [argsText, setArgsText] = useState('')     // 空格/换行分隔
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [envEntries, setEnvEntries] = useState<KV[]>([])
  const [headerEntries, setHeaderEntries] = useState<KV[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (server) {
      setName(server.name)
      setType(server.type || 'stdio')
      setCommand(server.command || '')
      setArgsText((server.args || []).join(' '))
      setUrl(server.url || '')
      setDescription(server.description || '')
      setEnabled(server.enabled)
      setEnvEntries(toEntries(server.env))
      setHeaderEntries(toEntries(server.headers))
    }
  }, [server])

  const isRemote = type === 'sse' || type === 'http'

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('请输入名称'); return }
    if (type === 'stdio' && !command.trim()) { setError('stdio 传输需填写启动命令'); return }
    if (isRemote && !url.trim()) { setError(`${type} 传输需填写服务地址 URL`); return }

    setSaving(true)
    setError('')
    try {
      const args = argsText.split(/\s+/).map(s => s.trim()).filter(Boolean)
      const base = {
        type,
        command: type === 'stdio' ? command.trim() : null,
        args,
        url: isRemote ? url.trim() : null,
        env: fromEntries(envEntries),
        headers: fromEntries(headerEntries),
        description,
        enabled,
      }
      if (isNew) {
        await mcpServersApi.create({ name: name.trim(), ...base })
        toast.success('MCP Server 已创建', { description: name.trim() })
      } else {
        await mcpServersApi.update(server!.name, base)
        toast.success('MCP Server 已更新', { description: name.trim() })
      }
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败'
      setError(msg)
      toast.error('保存失败', { description: msg })
    } finally {
      setSaving(false)
    }
  }, [name, type, command, argsText, url, envEntries, headerEntries, description, enabled, isNew, isRemote, server, onSaved])

  const renderKV = (
    label: string,
    entries: KV[],
    setEntries: (fn: (prev: KV[]) => KV[]) => void,
    placeholder: string,
  ) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-[#86868B]">{label}</label>
        <button
          onClick={() => setEntries(prev => [...prev, { key: '', value: '' }])}
          className="text-xs text-[#0071E3] hover:underline px-1.5 py-0.5"
        >+ 添加</button>
      </div>
      {entries.length === 0 ? (
        <div className="text-xs text-[#C7C7CC] px-1">暂无</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={entry.key}
                onChange={e => setEntries(prev => prev.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))}
                className="w-[150px] px-2.5 py-1.5 rounded-lg border border-black/10 text-xs outline-none focus:border-[#0071E3]/30 font-mono"
                placeholder="键"
              />
              <input
                value={entry.value}
                onChange={e => setEntries(prev => prev.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-black/10 text-xs outline-none focus:border-[#0071E3]/30 font-mono"
                placeholder={placeholder}
              />
              <button
                onClick={() => setEntries(prev => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-[#FF3B30] hover:underline shrink-0 px-1"
              >删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[560px] max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-black/6 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">
            {isNew ? '新增 MCP Server' : `编辑 MCP Server: ${server?.name}`}
          </h2>
          <button onClick={onClose} className="text-sm text-[#86868B] hover:text-[#1D1D1F]">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-[#FF3B30]/5 border border-[#FF3B30]/20 text-sm text-[#FF3B30]">{error}</div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#86868B] block mb-1.5">名称 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isNew}
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 disabled:bg-[#F5F5F7] disabled:text-[#86868B]"
              placeholder="唯一名称，如 filesystem / github"
            />
            {!isNew && <p className="text-[11px] text-[#C7C7CC] mt-1">名称为唯一键，不可修改</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#86868B] block mb-1.5">描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 resize-none"
              placeholder="该 MCP Server 的用途"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#86868B] block mb-1.5">传输类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'stdio' | 'sse' | 'http')}
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 bg-white"
            >
              <option value="stdio">stdio（本地子进程）</option>
              <option value="http">http（远程服务）</option>
              <option value="sse">sse（远程服务）</option>
            </select>
          </div>

          {type === 'stdio' ? (
            <>
              <div>
                <label className="text-xs font-semibold text-[#86868B] block mb-1.5">启动命令 *</label>
                <input
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 font-mono"
                  placeholder="如 npx / uvx / python"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#86868B] block mb-1.5">命令参数</label>
                <input
                  value={argsText}
                  onChange={e => setArgsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 font-mono"
                  placeholder="空格分隔，如 -y @modelcontextprotocol/server-filesystem /data"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#86868B] block mb-1.5">服务地址 URL *</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm outline-none focus:border-[#0071E3]/30 font-mono"
                placeholder="https://... 支持 $VAR 环境变量占位符"
              />
            </div>
          )}

          {renderKV('环境变量 (env)', envEntries, setEnvEntries, '值，支持 $VAR 占位符')}
          {isRemote && renderKV('请求头 (headers)', headerEntries, setHeaderEntries, '值，支持 $VAR 占位符')}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-[#1D1D1F]">启用</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/6 px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA] transition-colors">取消</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1D1D1F] text-white hover:bg-[#2D2D2F] transition-colors disabled:opacity-40"
          >
            {saving ? '保存中...' : isNew ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
