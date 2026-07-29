import type { ToolItem } from '../../api/config'

interface Props {
  tool: ToolItem
  onEdit?: (tool: ToolItem) => void
  onDelete?: (id: string) => void
  onToggle?: (id: string) => void
}

/** 权限徽标配色（safe 绿 / 其余橙，提示受限能力）。 */
function permBadgeClass(permission?: string): string {
  return permission && permission !== 'safe'
    ? 'bg-[#FF9500]/10 text-[#FF9500]'
    : 'bg-[#34C759]/10 text-[#34C759]'
}

export default function ToolConfigCard({ tool, onEdit, onDelete, onToggle }: Props) {
  const isSystem = tool.source === 'system'
  const title = tool.display_name || tool.name
  const showFnName = tool.display_name && tool.display_name !== tool.name

  return (
    <div className="bg-white rounded-xl border border-black/6 p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center shrink-0">🔧</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="font-semibold text-sm text-[#1D1D1F] truncate">{title}</div>
              {isSystem && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0071E3]/10 text-[#0071E3] shrink-0">系统</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {showFnName && (
                <span className="text-[11px] text-[#86868B] font-mono truncate">{tool.name}</span>
              )}
              {tool.category && (
                <span className="text-[11px] text-[#86868B]">{tool.category}</span>
              )}
              {tool.permission && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${permBadgeClass(tool.permission)}`}>
                  {tool.permission}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggle && (
            <button
              onClick={() => onToggle(tool.id)}
              className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                tool.enabled
                  ? 'bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20'
                  : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'
              }`}
            >
              {tool.enabled ? '已启用' : '停用'}
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(tool)} className="text-xs text-[#0071E3] hover:underline px-1.5 py-0.5">编辑</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(tool.id)} className="text-xs text-[#FF3B30] hover:underline px-1.5 py-0.5">删除</button>
          )}
        </div>
      </div>

      {tool.description && (
        <div className="text-xs text-[#86868B] mb-2 line-clamp-2">{tool.description}</div>
      )}

      {/* 标签预览 */}
      {tool.tags && tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.map(tag => (
            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#424245]">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
