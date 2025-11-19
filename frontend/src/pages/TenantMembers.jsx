import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { tenantsAPI } from '../services/api'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'

export default function TenantMembers() {
  const { tenantId } = useParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [emailToAdd, setEmailToAdd] = useState('')
  const [emailToRemove, setEmailToRemove] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roleLabel = (r) => {
    const key = String(r || 'member').toLowerCase()
    if (key === 'owner') return 'Administrador'
    if (key === 'admin') return 'Administrador'
    if (key === 'member') return 'Membro'
    if (key === 'editor') return 'Editor'
    if (key === 'viewer') return 'Visualizador'
    return key.charAt(0).toUpperCase() + key.slice(1)
  }

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await tenantsAPI.getUsers(tenantId)
      setUsers(res.data || [])
    } catch (e) {
      setError('Erro ao carregar membros do tenant')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await tenantsAPI.addUserByEmail(tenantId, { email: emailToAdd, role: 'member' })
      setSuccess(res.data?.message || 'Usuário adicionado')
      setEmailToAdd('')
      await loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar usuário')
    }
  }

  const handleRemove = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await tenantsAPI.removeUserByEmail(tenantId, { email: emailToRemove })
      setSuccess(res.data?.message || 'Usuário removido')
      setEmailToRemove('')
      await loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover usuário')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Membros da Organização" subtitle="Gerencie usuários por email" />
      <div className="flex-1 p-xl">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3">Membros</h2>
              <span className="text-small text-neutral-text-secondary">Total: {users.length}</span>
            </div>
            {loading ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhum membro encontrado</div>
            ) : (
              <div className="space-y-3">
                {users.map((tu) => (
                  <div key={tu.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-border dark:border-neutral-border-dark">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        {(tu.user?.nome || tu.user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-body font-semibold">{tu.user?.nome || 'Usuário'}</div>
                        <div className="text-small text-neutral-text-secondary">{tu.user?.email || '—'}</div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full border border-neutral-border dark:border-neutral-border-dark text-caption">{roleLabel(tu.role)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6">
              <h3 className="text-h3 mb-4">Adicionar por Email</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input label="Email" type="email" value={emailToAdd} onChange={(e) => setEmailToAdd(e.target.value)} placeholder="usuario@exemplo.com" required />
                <Button type="submit" disabled={!emailToAdd}>Adicionar</Button>
              </form>
            </div>
            <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6">
              <h3 className="text-h3 mb-4">Remover por Email</h3>
              <form onSubmit={handleRemove} className="space-y-4">
                <Input label="Email" type="email" value={emailToRemove} onChange={(e) => setEmailToRemove(e.target.value)} placeholder="usuario@exemplo.com" required />
                <Button type="submit" variant="secondary" disabled={!emailToRemove}>Remover</Button>
              </form>
            </div>
            {(error || success) && (
              <div className={`p-3 rounded-md ${error ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20'}`}>{error || success}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}