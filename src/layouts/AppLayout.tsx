import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SessionProvider } from '@/hooks/useSessions'

export default function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isCommandK =
        (e.key.toLowerCase() === 'k' || e.code === 'KeyK') &&
        (e.metaKey || e.ctrlKey)

      if (isCommandK) {
        e.preventDefault()
        e.stopPropagation()
        setCommandOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down, true)
    return () => document.removeEventListener('keydown', down, true)
  }, [])

  return (
    <SessionProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </SessionProvider>
  )
}
