import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, FolderKanban, Sparkles, UserCircle, History, FilePlus, Bot, ChevronLeft, ChevronRight, Globe, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1')
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  const navItems = [
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/web', icon: Globe, label: 'Web' },
    { path: '/images', icon: ImageIcon, label: 'Imagens' },
    { path: '/conversations', icon: History, label: 'Conversas' },
    { path: '/agents', icon: Bot, label: 'Agentes' },
    { path: '/create', icon: FilePlus, label: 'Criar' },
    { path: '/projects', icon: FolderKanban, label: 'Projetos' },
    { path: '/swipes', icon: Sparkles, label: 'Swipes' },
  ]

  const { logout, user, currentTenant, switchTenant } = useAuth()
  const navigate = useNavigate()
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleTenantMenu = () => {
    setIsTenantMenuOpen(!isTenantMenuOpen)
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="h-screen w-64 bg-neutral-light dark:bg-neutral-dark-secondary border-r border-neutral-border dark:border-neutral-border-dark flex flex-col transition-colors duration-200">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <div className="flex-1 cursor-pointer" onClick={toggleTenantMenu}>
            <h1 className="text-h3 text-neutral-text-primary dark:text-neutral-text-primary-dark">Kairos</h1>
            {currentTenant && (
              <p className="text-xs text-neutral-text-secondary flex items-center">
                {currentTenant.nome}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </p>
            )}
          </div>

          {isTenantMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 mt-1">
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">Trocar Workspace</p>
                {/* Aqui poderíamos listar os tenants reais se tivéssemos a lista no contexto. 
                          Por enquanto, apenas mostramos o atual e uma opção de 'Gerenciar' */}
                <div className="px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => navigate('/settings')}>
                  Gerenciar Workspaces
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-md ${collapsed ? 'justify-center' : ''}
                transition-all duration-fast
                ${active
                  ? 'bg-primary text-neutral-text font-semibold'
                  : 'text-neutral-text-secondary hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary hover:text-neutral-text'
                }
              `}
            >
              <Icon size={20} />
              {!collapsed && <span className="text-body">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <Link
          to="/profile"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-neutral-text-secondary hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary hover:text-neutral-text transition-all duration-fast ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle size={20} />
          {!collapsed && <span className="text-body">Perfil</span>}
        </Link>
      </div>
    </div>
  )
}

