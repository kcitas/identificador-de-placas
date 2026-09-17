import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'

const ICONS: Record<string, ReactElement> = {
  dashboard: (
    <path d="M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  scanner: (
    <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M3 12h18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  history: (
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v5l3 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  statistics: (
    <path d="M4 20V10m6 10V4m6 16v-7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

const items = [
  { to: '/', label: 'Inicio', icon: 'dashboard' },
  { to: '/scanner', label: 'Escanear', icon: 'scanner' },
  { to: '/history', label: 'Historial', icon: 'history' },
  { to: '/statistics', label: 'Stats', icon: 'statistics' },
]

export function Nav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-border) bg-(--color-surface)/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] sm:sticky sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-around sm:justify-start sm:gap-1 sm:px-4 sm:py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition sm:flex-none sm:flex-row sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? 'text-(--color-accent) sm:bg-(--color-surface-2)'
                  : 'text-(--color-text-muted) hover:text-(--color-text)'
              }`
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
              {ICONS[item.icon]}
            </svg>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
