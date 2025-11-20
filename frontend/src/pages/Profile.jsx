import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../contexts/useAuth'
import Topbar from '../components/Topbar'
import Button from '../components/Button'
import Input from '../components/Input'
import QuotaCard from '../components/QuotaCard'

import { authAPI, tenantsAPI } from '../services/api'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [profileForm, setProfileForm] = useState({ nome: user?.nome || '', email: user?.email || '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [orgs, setOrgs] = useState([])
  const [orgsLoading, setOrgsLoading] = useState(false)
  const [orgError, setOrgError] = useState('')
  const [editingOrgId, setEditingOrgId] = useState(null)
  const [editingOrgName, setEditingOrgName] = useState('')
  const [orgQuotas, setOrgQuotas] = useState({})

  const loadProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      setProfileLoading(true)
      const res = await authAPI.getUser(user.id)
      const data = res.data || {}
      setProfileForm({ nome: data.nome || '', email: data.email || '' })
    } catch (e) {
      // silent
    } finally {
      setProfileLoading(false)
    }
  }, [user?.id])

  const loadOrgs = useCallback(async () => {
    try {
      setOrgsLoading(true)
      const res = await tenantsAPI.getMine()
      const list = res.data || []
      setOrgs(list)
      try {
        const quotas = await Promise.all(list.map(async (o) => {
          try {
            const q = await tenantsAPI.getQuota(o.id)
            return { id: o.id, quota: q.data || null }
          } catch (_) {
            return { id: o.id, quota: null }
          }
        }))
        const map = {}
        quotas.forEach(({ id, quota }) => { map[id] = quota })
        setOrgQuotas(map)
      } catch (_) {
        // ignore quota errors
      }
    } catch (e) {
      setOrgError(e.response?.data?.error || 'Erro ao carregar organizações')
      setOrgs([])
    } finally {
      setOrgsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadOrgs()
  }, [loadProfile, loadOrgs])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    try {
      setProfileLoading(true)
      await authAPI.updateUser(user.id, { nome: profileForm.nome, email: profileForm.email })
      updateUser({ nome: profileForm.nome, email: profileForm.email })
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Erro ao salvar perfil')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Deseja excluir sua conta? Esta ação é permanente.')) return
    try {
      await authAPI.deleteUser(user.id)
      logout()
      window.location.href = '/login'
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Erro ao excluir conta')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação de senha não coincide')
      return
    }
    try {
      setPasswordLoading(true)
      await authAPI.changePassword(user.id, { old_password: oldPassword, new_password: newPassword })
      setPasswordOpen(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Erro ao trocar senha')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Perfil" subtitle="Gerencie suas informações e organizações">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/plans')}>Contratar planos</Button>
          <Button variant="secondary" onClick={() => { logout(); window.location.href = '/login' }}>Sair</Button>
        </div>
      </Topbar>
      <div className="flex-1 p-xl">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-h3">
                {(profileForm.nome || user?.nome || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-h3">{profileForm.nome || user?.nome}</div>
                <div className="text-caption text-neutral-text-secondary">{profileForm.email || user?.email}</div>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input label="Nome" value={profileForm.nome} onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })} required />
              <Input label="Email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
              {profileError && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{profileError}</div>)}
              <div className="flex gap-3">
                <Button type="submit" disabled={profileLoading} className="flex-1">{profileLoading ? 'Salvando…' : 'Salvar'}</Button>
                <Button type="button" variant="secondary" onClick={() => setPasswordOpen((v) => !v)}>{passwordOpen ? 'Fechar' : 'Trocar Senha'}</Button>
                <Button type="button" variant="secondary" onClick={handleDeleteProfile}>Excluir Conta</Button>
              </div>
            </form>
            {passwordOpen && (
              <div className="mt-6 border-t border-neutral-border dark:border-neutral-border-dark pt-6">
                <div className="text-h4 mb-3">Trocar Senha</div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <Input label="Senha atual" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                  <Input label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                  <Input label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  {passwordError && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{passwordError}</div>)}
                  <div className="flex gap-3">
                    <Button type="submit" disabled={passwordLoading} className="flex-1">{passwordLoading ? 'Trocando…' : 'Salvar Senha'}</Button>
                    <Button type="button" variant="secondary" onClick={() => { setPasswordOpen(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError('') }}>Cancelar</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-h3">Organizações</h2>
              <p className="text-caption text-neutral-text-secondary mt-1">Suas organizações, planos e uso diário</p>
            </div>
            {orgError && (<div className="mb-3 text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{orgError}</div>)}
            {orgsLoading ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : orgs.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhuma organização</div>
            ) : (
              <div className="space-y-3">
                {orgs.map((o) => {
                  const quota = orgQuotas[o.id]
                  const percent = Math.min(100, Math.max(0, Number(quota?.percentage || 0)))
                  return (
                    <div key={o.id} className="p-4 rounded-lg border border-neutral-border dark:border-neutral-border-dark">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {editingOrgId === o.id ? (
                            <Input value={editingOrgName} onChange={(e) => setEditingOrgName(e.target.value)} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-body font-semibold">{o.nome}</div>
                              <span className="px-2 py-0.5 rounded-full border border-neutral-border dark:border-neutral-border-dark text-caption">{(o.plano || 'free').toUpperCase()}</span>
                            </div>
                          )}
                          {editingOrgId !== o.id ? (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-small text-neutral-text-secondary">
                                <span>Uso hoje</span>
                                {quota ? (<span>{percent}% • restante: {quota.remaining}</span>) : (<span>—</span>)}
                              </div>
                              <div className="h-2 rounded bg-neutral-light-secondary dark:bg-neutral-dark-secondary mt-1">
                                <div style={{ width: `${percent}%` }} className="h-2 rounded bg-primary"></div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {editingOrgId === o.id ? (
                            <>
                              <Button variant="secondary" onClick={() => { setEditingOrgId(null); setEditingOrgName('') }}>Cancelar</Button>
                              <Button onClick={async () => {
                                if (!editingOrgName.trim()) return
                                try {
                                  const res = await tenantsAPI.update(o.id, { nome: editingOrgName.trim() })
                                  setOrgs(orgs.map((x) => (x.id === o.id ? res.data.tenant : x)))
                                  setEditingOrgId(null)
                                  setEditingOrgName('')
                                } catch (err) {
                                  setOrgError(err.response?.data?.error || 'Erro ao atualizar organização')
                                }
                              }}>Salvar</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" onClick={() => { setEditingOrgId(o.id); setEditingOrgName(o.nome) }}>Editar</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <QuotaCard />
        </div>
      </div>
    </div>
  )
}