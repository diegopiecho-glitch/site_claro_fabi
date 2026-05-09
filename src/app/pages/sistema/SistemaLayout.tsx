import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router'
import { Home, Building2, Settings, ListChecks, LogOut, ChevronRight, Loader2, Menu, X } from 'lucide-react'
import { isAuthenticated, logout, validateSession } from '../../lib/auth'

const NAV = [
  { path: '/sistema/home', label: 'Dashboard', Icon: Home },
  { path: '/sistema/imoveis', label: 'Imoveis', Icon: Building2 },
  { path: '/sistema/caracteristicas', label: 'Caracteristicas', Icon: ListChecks },
  { path: '/sistema/configuracoes', label: 'Configuracoes do Site', Icon: Settings },
]

export function SistemaLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let ativo = true

    ;(async () => {
      if (!isAuthenticated()) {
        navigate('/sistema', { replace: true })
        return
      }

      const valid = await validateSession()
      if (!ativo) return

      if (!valid) {
        navigate('/sistema', { replace: true })
        return
      }

      setCheckingAuth(false)
    })()

    return () => {
      ativo = false
    }
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/sistema')
  }

  const handleNavigate = () => {
    setMobileMenuOpen(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-amber-600" size={36} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`fixed z-40 flex h-full w-72 flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 md:z-20 md:w-60 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 shadow-md shrink-0">
              <Home size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">Gerenciamento</p>
              <p className="text-xs text-slate-400 truncate">Sistema Imobiliario</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, label, Icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(`${path}/`)

            return (
              <Link
                key={path}
                to={path}
                onClick={handleNavigate}
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
            Ver site publico
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

      <main className="flex-1 min-h-screen overflow-y-auto md:ml-60">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-amber-200 hover:text-amber-700"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-900">Sistema Imobiliario</p>
              <p className="truncate text-xs text-slate-500">Painel administrativo</p>
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
