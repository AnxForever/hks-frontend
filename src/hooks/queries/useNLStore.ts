/**
 * NL Store TanStack Query hooks。
 * 记忆库以商品画像为核心视角：默认全量展示，namespace 仅作筛选。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import {
  createNLRecord,
  deleteNLRecord,
  getNLRecord,
  listAllNLRecords,
  listNLNamespaces,
  listNLNamespace,
  searchNL,
  updateNLRecord,
} from '@/lib/api/nlstore'
import type { NLRecordCreateRequest } from '@/types'

const KEYS = {
  all: ['nlstore'] as const,
}

/** 全量记录列表（所有 namespace） */
export function useAllNLRecords() {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => listAllNLRecords(authFetch),
    staleTime: 30_000,
  })
}

/** 命名空间列表（用于筛选 chip） */
export function useNLNamespaces() {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: [...KEYS.all, 'namespaces'],
    queryFn: () => listNLNamespaces(authFetch),
    staleTime: 60_000,
  })
}

/** 列出单个 namespace 记录摘要 */
export function useNLRecords(namespace: string) {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: [...KEYS.all, namespace],
    queryFn: () => listNLNamespace(authFetch, namespace),
    staleTime: 30_000,
    enabled: !!namespace,
  })
}

/** 获取单条完整记录 */
export function useNLRecord(namespace: string, key: string) {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: [...KEYS.all, namespace, key],
    queryFn: () => getNLRecord(authFetch, namespace, key),
    enabled: !!namespace && !!key,
  })
}

/** 全文搜索 */
export function useNLSearch() {
  const { authFetch } = useAuth()
  return useMutation({
    mutationFn: (params: { q: string; namespace?: string; maxResults?: number }) =>
      searchNL(authFetch, params.q, params.namespace, params.maxResults),
  })
}

/** 创建记录（namespace 由调用方指定） */
export function useCreateNLRecord() {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ namespace, ...req }: { namespace: string } & NLRecordCreateRequest) =>
      createNLRecord(authFetch, namespace, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

/** 更新记录（namespace 由调用方指定） */
export function useUpdateNLRecord() {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ namespace, key, ...req }: { namespace: string; key: string } & Partial<NLRecordCreateRequest>) =>
      updateNLRecord(authFetch, namespace, key, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

/** 删除记录（namespace 由调用方指定） */
export function useDeleteNLRecord() {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ namespace, key }: { namespace: string; key: string }) =>
      deleteNLRecord(authFetch, namespace, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
