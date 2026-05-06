import { Link } from 'react-router'
import { Building2, Settings, Plus, Eye } from 'lucide-react'

const ATALHOS = [
  {
    to:    '/sistema/imoveis',
    Icon:  Building2,
    label: 'Imóveis',
    desc:  'Listar e gerenciar imóveis',
    cor:   'bg-amber-600 shadow-amber-600/30',
  },
  {
    to:    '/sistema/imoveis/novo',
    Icon:  Plus,
    label: 'Novo Imóvel',
    desc:  'Cadastrar nova propriedade',
    cor:   'bg-green-600 shadow-green-600/30',
  },
  {
    to:    '/sistema/configuracoes',
    Icon:  Settings,
    label: 'Configurações do Site',
    desc:  'Textos, fotos e redes sociais',
    cor:   'bg-slate-600 shadow-slate-600/30',
  },
  {
    to:       '/',
    Icon:     Eye,
    label:    'Ver Site',
    desc:     'Abrir site público',
    cor:      'bg-blue-600 shadow-blue-600/30',
    external: true,
  },
]

export function SistemaHome() {
  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Bem-vindo ao sistema de gerenciamento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ATALHOS.map(({ to, Icon, label, desc, cor, external }) => (
          <Link
            key={to}
            to={to}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="group bg-white rounded-2xl border border-slate-200 p-7 flex flex-col items-center gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl ${cor} text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}
            >
              <Icon size={30} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
