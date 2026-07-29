import type { SkillItem } from '../../api/config'

interface Props {
  skill: SkillItem
  onEdit?: (skill: SkillItem) => void
  onDelete?: (id: string) => void
  onRefresh?: (id: string) => void
  onToggle?: (id: string) => void
}

const sourceLabels: Record<string, string> = { github: 'GitHub', zip: 'ZIP', manual: '手动', builtin: '内置', script: '脚本' }

const isActive = (status: string) => status === 'installed' || status === 'enabled'

export default function SkillConfigCard({ skill, onEdit, onDelete, onRefresh, onToggle }: Props) {
  return (
    <div className="bg-white rounded-xl border border-black/6 p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0071E3]/10 flex items-center justify-center text-sm">🎯</div>
          <div>
            <div className="font-semibold text-sm text-[#1D1D1F]">{skill.name}</div>
            <div className="text-[11px] text-[#86868B]">{sourceLabels[skill.source || 'builtin']}{skill.version ? ` · v${skill.version}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggle && (
            <button
              onClick={() => onToggle(skill.name)}
              className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                skill.status !== 'disabled'
                  ? 'bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20'
                  : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'
              }`}
            >
              {skill.status !== 'disabled' ? '已启用' : '停用'}
            </button>
          )}
          {onRefresh && (
            <button onClick={() => onRefresh(skill.name)} className="text-xs text-[#86868B] hover:text-[#1D1D1F] px-1.5 py-0.5">刷新</button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(skill)} className="text-xs text-[#0071E3] hover:underline px-1.5 py-0.5">编辑</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(skill.name)} className="text-xs text-[#FF3B30] hover:underline px-1.5 py-0.5">删除</button>
          )}
        </div>
      </div>

      {skill.description && (
        <div className="text-xs text-[#86868B] mt-2">{skill.description}</div>
      )}

      {skill.source_url && (
        <div className="text-[11px] text-[#0071E3] mt-1 truncate">{skill.source_url}</div>
      )}

      <div className="flex items-center gap-3 mt-3 text-[11px] text-[#86868B]">
        <span className={`font-semibold ${isActive(skill.status) ? 'text-[#34C759]' : 'text-[#86868B]'}`}>
          {isActive(skill.status) ? '已安装' : '未安装'}
        </span>
        <span className={`font-semibold ${skill.status !== 'disabled' ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
          {skill.status !== 'disabled' ? '已激活' : '已停用'}
        </span>
      </div>
    </div>
  )
}
