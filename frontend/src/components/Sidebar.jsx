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
    { path: '/conversations', icon: History, label: 'Conversas' },
    { path: '/agents', icon: Bot, label: 'Agentes' },
    { path: '/create', icon: FilePlus, label: 'Criar' },
    { path: '/projects', icon: FolderKanban, label: 'Projetos' },
    { path: '/images', icon: ImageIcon, label: 'Imagens' },
    { path: '/swipes', icon: Sparkles, label: 'Swipes' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} h-screen border-r border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark flex flex-col transition-all duration-300 ease-in-out`}>

      <div className="sticky top-0 z-40 h-[72px] px-xl bg-neutral-light dark:bg-neutral-dark">
        <div className="h-full flex items-center gap-3 justify-start">
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-neutral-text-secondary hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary hover:text-neutral-text transition-all duration-300 ease-in-out"
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <span className={`text-h3 font-semibold tracking-wide transition-opacity duration-300 ease-in-out ${collapsed ? 'opacity-0' : 'opacity-100'}`}>KAIROS</span>
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

