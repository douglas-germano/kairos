import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-neutral-light dark:bg-neutral-dark">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

export function TopbarSlot(props) {
  return <Topbar {...props} />
}

