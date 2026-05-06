import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Home, Lock } from 'lucide-react'
import { login } from '../../lib/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setTimeout(() => {
      if (login(usuario, senha)) {
        navigate('/sistema/home')
      } else {
        setErro('Usuário ou senha inválidos.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-[0_8px_24px_rgba(217,119,6,0.40)]">
            <Home size={30} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Sistema</h1>
            <p className="text-slate-400 text-sm mt-1">Área restrita — faça login para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Usuário</Label>
              <Input
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Senha</Label>
              <Input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                required
              />
            </div>

            {erro && (
              <p className="text-red-400 text-sm text-center bg-red-950/40 border border-red-900/40 rounded-lg py-2">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold mt-2"
            >
              <Lock size={15} className="mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Credenciais padrão: admin / admin123
        </p>
      </div>
    </div>
  )
}
