/**
 * 合规知识库 — 真实化 RAG 导入 / 检索入口
 *
 * 4 个 Tab：
 *   - 我的知识库：已导入文档列表
 *   - PDF 上传：drag-drop 上传
 *   - URL 导入：从 URL 抓取
 *   - 语义搜索：直接查 ChromaDB 验证向量化效果
 *
 * 顶部 4 卡片：总文档 / 已完成 / 向量化中 / 错误（来自 /knowledge/stats）
 */
import { Database, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { KnowledgeList } from '@/components/knowledge/KnowledgeList'
import { PdfUpload } from '@/components/knowledge/PdfUpload'
import { SearchPanel } from '@/components/knowledge/SearchPanel'
import { UrlImport } from '@/components/knowledge/UrlImport'
import { useKnowledgeStats } from '@/hooks/queries/useKnowledge'
import { cn } from '@/lib/utils'

export default function KnowledgePage() {
  const { data: stats, isLoading: statsLoading } = useKnowledgeStats()

  return (
    <div className="h-full overflow-y-auto px-6 py-8 sm:px-12 sm:py-12">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <header className="mb-8">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">合规知识库</h1>
          <p className="text-[15px] text-muted-foreground">
            导入法规 PDF / URL，自动向量化后用于语义检索与合规问答
          </p>
        </header>

        {/* Stats cards */}
        <section
          className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3"
          aria-label="知识库统计"
        >
          <StatCard
            icon={Database}
            label="总文档"
            value={stats?.total_docs}
            loading={statsLoading}
            tone="default"
          />
          <StatCard
            icon={CheckCircle2}
            label="已就绪"
            value={stats?.done_count}
            loading={statsLoading}
            tone="success"
          />
          <StatCard
            icon={Loader2}
            label="向量化中"
            value={stats?.indexing_count}
            loading={statsLoading}
            tone="warning"
          />
          <StatCard
            icon={AlertCircle}
            label="失败"
            value={stats?.error_count}
            loading={statsLoading}
            tone="destructive"
          />
        </section>

        {/* Tabs */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-5 inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
            <TabsTrigger
              value="list"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <FileText className="size-3.5" />
              我的知识库
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              PDF 上传
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="px-3 py-1 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              URL 导入
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="px-3 py-1 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              语义搜索
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <KnowledgeList />
          </TabsContent>
          <TabsContent value="pdf">
            <PdfUpload />
          </TabsContent>
          <TabsContent value="url">
            <UrlImport />
          </TabsContent>
          <TabsContent value="search">
            <SearchPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Database
  label: string
  value: number | undefined
  loading: boolean
  tone: 'default' | 'success' | 'warning' | 'destructive'
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-colors',
        tone === 'success' && 'border-success/30',
        tone === 'warning' && 'border-warning/30',
        tone === 'destructive' && 'border-destructive/30',
        tone === 'default' && 'border-border',
      )}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon
          className={cn(
            'size-3.5',
            tone === 'success' && 'text-success',
            tone === 'warning' && 'text-warning',
            tone === 'destructive' && 'text-destructive',
            tone === 'default' && 'text-muted-foreground',
          )}
        />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {loading ? '…' : (value ?? 0)}
      </p>
    </div>
  )
}
