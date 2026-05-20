import { NavLink, Outlet } from 'react-router-dom'

interface NavItem {
  to: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  { to: '/session', icon: '⌛', label: 'Focus' },
  { to: '/blocklist', icon: '🛡', label: 'Block' },
  { to: '/history', icon: '📊', label: 'History' },
]

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <nav
        className="flex flex-col items-center py-4 gap-4 shrink-0"
        style={{
          width: 64,
          background: '#1a1008',
          borderRight: '1px solid #3d2515',
        }}
      >
        {/* Logo */}
        <div className="mb-4">
          <img src="/logo.svg" className="w-10 h-10" alt="Laan logo" />
        </div>

        {/* Nav links */}
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center w-12 h-12 rounded-lg text-xl transition-colors duration-150',
                isActive
                  ? 'text-[#0f0a05]'
                  : 'text-[#A08060] hover:bg-[#3d2515]',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive ? { background: '#D4A017' } : {}
            }
          >
            <span>{icon}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#0f0a05' }}>
        <Outlet />
      </main>
    </div>
  )
}
