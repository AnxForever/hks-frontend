import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import { integrationsApi, pipelineApi, productsApi, riskApi } from '@/lib/api/os'

export function useOverview(autoRefresh = false) {
  const { authFetch } = useAuth()
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      const results = await Promise.allSettled([
        productsApi.list(authFetch),
        pipelineApi.health(authFetch),
        riskApi.alerts(authFetch, { size: 50 }),
        integrationsApi.status(authFetch),
      ])

      const products = results[0].status === 'fulfilled' ? results[0].value : []
      const markets = new Set<string>()
      products.forEach((product) => product.target_markets?.forEach((market) => markets.add(market)))

      const alerts = results[2].status === 'fulfilled' ? results[2].value.alerts : []

      return {
        products,
        productCount: products.length,
        marketCount: markets.size,
        overallScore:
          results[1].status === 'fulfilled' ? Math.round(results[1].value.overall_score) : null,
        alerts,
        activeAlerts: alerts.filter((alert) => !alert.dismissed),
        integrationStatus: results[3].status === 'fulfilled' ? results[3].value.status : {},
        updatedAt: new Date().toLocaleTimeString('zh-CN'),
      }
    },
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 20_000,
  })
}

export function useDismissRiskAlert() {
  const { authFetch } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alertId: string) => riskApi.dismiss(authFetch, alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overview'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['risk'] })
    },
  })
}
