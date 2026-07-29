import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// 桩掉运行时上下文：useAuth 提供可断言的 authFetch，useConfirm 直接放行
const authFetch = vi.fn()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ authFetch }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => async () => true,
}))

import { ArtifactsPanel, type ChatArtifact } from './ArtifactsPanel'

// 产品 scope 登记记录（Agent 关联的认证文档，file_path 为空）
function registrationArtifact(): ChatArtifact {
  return {
    id: 'cert1',
    kind: 'file',
    name: 'CE认证证书',
    path: '',
    messageId: 'product-p1',
    productId: 'p1',
    artifactId: 'cert1',
  }
}

// 普通会话落盘文件（path-based）
function fileArtifact(): ChatArtifact {
  return { id: 'file1', kind: 'file', name: '整改清单.md', path: 'output/chat/整改清单.md', messageId: 'm1' }
}

describe('ArtifactsPanel 产品登记记录（空 file_path）可上传/删除', () => {
  beforeEach(() => {
    authFetch.mockReset()
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ content: '内容' }) })
  })

  it('选中登记记录：提示上传、且不请求 chat/files；提供上传+删除，无下载/编辑', async () => {
    render(<ArtifactsPanel open artifacts={[registrationArtifact()]} onClose={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /CE认证证书/ }))

    expect(
      screen.getByText('此产物为登记记录，暂无附件。可点击上方「上传附件」上传证书文件。'),
    ).toBeInTheDocument()
    expect(authFetch).not.toHaveBeenCalled()
    expect(screen.getByTitle('上传附件')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载到本地' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument()
  })

  it('上传附件命中产品上传接口并触发 onChanged', async () => {
    const onChanged = vi.fn()
    const { container } = render(
      <ArtifactsPanel open artifacts={[registrationArtifact()]} onClose={() => {}} onChanged={onChanged} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /CE认证证书/ }))

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['pdf-bytes'], 'ce.pdf', { type: 'application/pdf' }))

    expect(authFetch).toHaveBeenCalledWith(
      '/api/v1/products/p1/artifacts/cert1/upload',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it('删除登记记录命中产品删除接口并触发 onDeleted+onChanged', async () => {
    const onDeleted = vi.fn()
    const onChanged = vi.fn()
    render(
      <ArtifactsPanel
        open
        artifacts={[registrationArtifact()]}
        onClose={() => {}}
        onDeleted={onDeleted}
        onChanged={onChanged}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /CE认证证书/ }))
    await userEvent.click(screen.getByRole('button', { name: '删除' }))

    expect(authFetch).toHaveBeenCalledWith(
      '/api/v1/products/p1/artifacts/cert1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(onDeleted).toHaveBeenCalledWith('cert1')
    expect(onChanged).toHaveBeenCalled()
  })

  it('普通会话落盘文件：请求 chat/files，提供下载/编辑/删除，无上传附件', async () => {
    render(<ArtifactsPanel open artifacts={[fileArtifact()]} onClose={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /整改清单\.md/ }))

    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/chat/files?path='))
    expect(screen.getByRole('button', { name: '下载到本地' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
    expect(screen.queryByTitle('上传附件')).not.toBeInTheDocument()
  })
})
