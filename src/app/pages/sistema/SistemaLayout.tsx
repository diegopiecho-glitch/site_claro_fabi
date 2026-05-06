import { useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router'
import { Home, Building2, Settings, LogOut, ChevronRight } from 'lucide-react'
import { isAuthenticated, logout } from '../../lib/auth'

const NAV = [
  { path: '/sistema/home',          label: 'Dashboard',           Icon: Home      },
  { path: '/sistema/imoveis',       label: 'Imóveis',             Icon: Building2 },
  { path: '/sistema/configuracoes', label: 'Configurações do Site', Icon: Settings  },
]

export function SistemaLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) navigate('/sistema', { replace: true })
  }, [navigate])

  const handleLogout = () => {
    logout()
    navigate('/sistema')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-2xl">

        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 shadow-md shrink-0">
              <Home size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">Gerenciamento</p>
              <p className="text-xs text-slate-400 truncate">Sistema Imobiliário</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, label, Icon }) => {
            const active =
              path === '/sistema/imoveis'
                ? location.pathname.startsWith('/sistema/imoveis')
                : location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-amber-600 text-white font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {active && <ChevronRight size={14} className="shrink-0 opacity-70" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <Home size={14} />
            Ver site público
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full"
          >
            <LogOut size={17} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
