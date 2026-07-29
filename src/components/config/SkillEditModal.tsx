import { useState, useEffect } from 'react'
import type { SkillItem } from '../../api/config'
import { skillsApi } from '../../api/config'
import { useConfirm } from '@/hooks/useConfirm'

interface Props {
  skill: SkillItem | null  // null = 新建模式
  onClose: () => void
  onSaved: () => void
}

export default function SkillEditModal({ skill, onClose, onSaved }: Props) {
  const confirm = useConfirm()
  const isNew = !skill

  const [name, setName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (skill) {
      setName(skill.name)
      setEnabled(skill.status !== 'disabled')
    }
  }, [skill])

  const handleSave = async () => {
    if (isNew) {
      if (!name.trim()) { setError('请输入名称'); return }
      setSaving(true)
      setError('')
      try {
        await skillsApi.install({
          name: name.trim(),
          source: 'manual',
          source_url: sourceUrl.trim() || undefined,
        })
        onSaved()
      } catch (e) {
        setError(e instanceof Error ? e.message : '安装失败')
      } finally {
        setSaving(false)
      }
    } else {
      setSaving(true)
      setError('')
      try {
        await skillsApi.update(skill!.name, { config: { enabled } })
        onSaved()
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存失败')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleDelete = async () => {
    if (!skill) return
    const ok = await confirm({
      title: '卸载 Skill',
      description: `确定卸载 Skill「${skill.name}」？`,
      variant: 'destructive',
      confirmLabel: '卸载',
    })
    if (!ok) return
    setSaving(true)
    try {
      await skillsApi.delete(skill.name)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    if (!skill) return
    setSaving(true)
    try {
      await skillsApi.refresh(skill.name)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[480px] max-h-[85vh] bg-card rounded-2xl shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-foreground">
            {isNew ? '安装技能' : `技能: ${skill?.name}`}
          </h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">{error}</div>
          )}

          {isNew ? (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">名称</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary/30"
                  placeholder="技能名称"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">来源 URL</label>
                <input
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary/30"
                  placeholder="https://github.com/org/skill-name"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">名称</label>
                  <div className="text-sm text-foreground px-3 py-2 bg-muted rounded-lg">{skill.name}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">版本</label>
                  <div className="text-sm text-foreground px-3 py-2 bg-muted rounded-lg">{skill.version || '-'}</div>
                </div>
              </div>

              {skill.description && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">描述</label>
                  <div className="text-sm text-foreground px-3 py-2 bg-muted rounded-lg">{skill.description}</div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">来源</label>
                <div className="text-sm text-foreground px-3 py-2 bg-muted rounded-lg">{skill.source}</div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">启用</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            {!isNew && (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={saving}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
                >
                  刷新
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40"
                >
                  卸载
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (isNew && !name.trim())}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              {saving ? '处理中...' : isNew ? '安装' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
