import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import { productTodosApi, type TodoCreateBody } from '@/lib/api/os'

const todoKeys = {
  all: ['product-todos'] as const,
  byProduct: (productId: string) => ['product-todos', productId] as const,
}

export function useProductTodos(productId: string | undefined, status?: string) {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: [...todoKeys.byProduct(productId ?? ''), status],
    queryFn: () => productTodosApi.list(authFetch, productId!, status),
    enabled: Boolean(productId),
    staleTime: 15_000,
  })
}

export function useCreateTodo(productId: string) {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TodoCreateBody) => productTodosApi.create(authFetch, productId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.byProduct(productId) }),
  })
}

export function useExecuteTodo(productId: string) {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (todoId: string) => productTodosApi.execute(authFetch, productId, todoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.byProduct(productId) }),
  })
}

export function useUpdateTodo(productId: string) {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ todoId, ...body }: { todoId: string } & Partial<{ status: string; title: string; priority: string }>) =>
      productTodosApi.update(authFetch, productId, todoId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.byProduct(productId) }),
  })
}

export function useDeleteTodo(productId: string) {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (todoId: string) => productTodosApi.delete(authFetch, productId, todoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.byProduct(productId) }),
  })
}
