import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import SkillConfigCard from '../../components/config/SkillConfigCard'
import FileImportModal from '../../components/config/FileImportModal'
import SkillEditModal from '../../components/config/SkillEditModal'
import type { SkillItem } from '../../api/config'
import { skillsApi } from '../../api/config'
import { useConfirm } from '@/hooks/useConfirm'

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'installed', label: '已安装' },
  { key: 'not_installed', label: '未安装' },
] as const

export default function SkillsManagePage() {
  const confirm = useConfirm()
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<SkillItem | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const data = await skillsApi.list({ status: statusFilter || undefined })
      setSkills(data.skills)
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadSkills() }, [loadSkills])

  const handleEdit = (skill: SkillItem) => setEditing(skill)

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '卸载 Skill',
      description: '确定卸载此 Skill？',
      variant: 'destructive',
      confirmLabel: '卸载',
    })
    if (!ok) return
    try {
      await skillsApi.delete(id)
      loadSkills()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '卸载失败')
    }
  }

  const handleRefresh = async (id: string) => {
    try {
      await skillsApi.refresh(id)
      loadSkills()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '刷新失败')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await skillsApi.toggle(id)
      loadSkills()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '切换失败')
    }
  }

  const handleImport = async (source: { type: 'github' | 'zip' | 'manual'; value: string }) => {
    try {
      await skillsApi.install({
        name: source.value.split('/').pop() || source.value,
        source: source.type,
        source_url: source.type === 'github' ? source.value : undefined,
      })
      loadSkills()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导入失败')
    }
    setShowImport(false)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Skills 管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {skills.filter(s => s.status === 'installed' || s.status === 'enabled').length}/{skills.length} 个已安装
            </p>
          </div>
          <button onClick={() => setShowImport(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            + 导入 Skill
          </button>
        </div>

        {/* 状态过滤 */}
        <div className="mb-4 flex flex-wrap items-center gap-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">加载中...</div>
        ) : skills.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">暂无 Skill，点击上方按钮导入</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {skills.map(s => (
              <SkillConfigCard
                key={s.name}
                skill={s}
                onEdit={() => handleEdit(s)}
                onDelete={() => handleDelete(s.name)}
                onRefresh={() => handleRefresh(s.name)}
                onToggle={() => handleToggle(s.name)}
              />
            ))}
          </div>
        )}

        <FileImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />

        {editing && (
          <SkillEditModal
            skill={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); loadSkills() }}
          />
        )}
      </div>
    </div>
  )
}
