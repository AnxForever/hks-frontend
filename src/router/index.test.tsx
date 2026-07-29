import { describe, expect, it } from 'vitest'
import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'

import { router } from './index'

describe('support routes', () => {
  it('redirects legacy public aliases into the authenticated support page', () => {
    const appRoute = router.routes.find((route) => route.path === '/app')
    const internalSupportRoute = appRoute?.children?.find((route) => route.path === 'support')
    const supportRoute = router.routes.find((route) => route.path === '/support')
    const paymentRoute = router.routes.find((route) => route.path === '/payment')
    const supportElement = supportRoute?.element as ReactElement<{
      to?: string
      replace?: boolean
    }> | undefined
    const paymentElement = paymentRoute?.element as ReactElement<{
      to?: string
      replace?: boolean
    }> | undefined

    expect(internalSupportRoute).toBeDefined()
    expect(supportElement?.type).toBe(Navigate)
    expect(supportElement).toMatchObject({
      props: { to: '/app/support', replace: true },
    })
    expect(paymentElement?.type).toBe(Navigate)
    expect(paymentElement).toMatchObject({
      props: { to: '/app/support', replace: true },
    })
  })
})
