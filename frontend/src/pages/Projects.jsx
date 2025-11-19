import { useState, useEffect } from 'react'
import { projectsAPI, tenantsAPI } from '../services/api'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'
import { FolderKanban, Trash2, Edit2 } from 'lucide-react'
import useAuth from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ nome: '', descricao: '', tenant_id: '' })
  const [error, setError] = useState('')
  const [orgs, setOrgs] = useState([])
  const [orgLoading, setOrgLoading] = useState(false)
  const { user } = useAuth()
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filesModal, setFilesModal] = useState(false)
  const [files, setFiles] = useState([])
  const [filesLoading] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await projectsAPI.getByUser(user?.id)
        setProjects(res.data || [])
      } catch (error) {
        console.error('Erro ao carregar projetos:', error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) fetch()
  }, [user?.id])

  const loadOrgs = async () => {
    try {
      setOrgLoading(true)
      const res = await tenantsAPI.getMine()
      const list = res.data || []
      setOrgs(list)
      setFormData((prev) => ({ ...prev, tenant_id: list[0]?.id || '' }))
    } catch (e) {
      setOrgs([])
      setFormData((prev) => ({ ...prev, tenant_id: '' }))
    } finally {
      setOrgLoading(false)
    }
  }

  useEffect(() => {
    if (showModal) {
      loadOrgs()
    }
  }, [showModal])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.nome || !formData.tenant_id) {
      setError('Nome e Organização são obrigatórios')
      return
    }

    try {
      const response = await projectsAPI.create(formData)
      setProjects([...projects, response.data.project])
      setShowModal(false)
      setFormData({ nome: '', descricao: '', tenant_id: '' })
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao criar projeto')
    }
  }

  const openEdit = (project) => {
    setSelected(project)
    setFormData({ nome: project.nome || '', descricao: project.descricao || '', tenant_id: project.tenant_id || '' })
    setEditModal(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.nome) {
      setError('Nome é obrigatório')
      return
    }
    try {
      const res = await projectsAPI.update(selected.id, { nome: formData.nome, descricao: formData.descricao })
      const updated = res.data
      setProjects(projects.map((p) => (p.id === updated.id ? updated : p)))
      setEditModal(false)
      setSelected(null)
      setFormData({ nome: '', descricao: '', tenant_id: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar projeto')
    }
  }

  const openDelete = (project) => {
    setSelected(project)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    setError('')
    try {
      await projectsAPI.delete(selected.id)
      setProjects(projects.filter((p) => p.id !== selected.id))
      setDeleteModal(false)
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar projeto')
    }
  }

  

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Projetos" subtitle="Gerencie seus projetos de copywriting">
        <Button onClick={() => setShowModal(true)}>+ Projeto</Button>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-xl">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-neutral-text-secondary">Carregando...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderKanban size={64} className="text-neutral-text-secondary mb-4" />
            <h2 className="text-h3 mb-2">Nenhum projeto encontrado</h2>
            <p className="text-body text-neutral-text-secondary mb-6">
              Crie seu primeiro projeto para começar
            </p>
            <Button onClick={() => setShowModal(true)}>+ Projeto</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/files`)}
                className="cursor-pointer bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 hover:border-primary transition-all duration-fast"
              >
                <h3 className="text-h3 mb-2">{project.nome}</h3>
                {project.descricao && (
                  <p className="text-body text-neutral-text-secondary mb-4 line-clamp-2">
                    {project.descricao}
                  </p>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/files`) }}>
                    Arquivos
                  </Button>
                  <Button variant="secondary" aria-label="Editar" title="Editar" className="hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary" onClick={(e) => { e.stopPropagation(); openEdit(project) }}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="secondary" aria-label="Excluir" title="Excluir" className="hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary" onClick={(e) => { e.stopPropagation(); openDelete(project) }}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Projeto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Novo Projeto</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nome do Projeto"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Campanha de Verão"
                required
              />
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Organização</label>
                <div className="px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text">
                  {orgLoading ? 'Carregando...' : (orgs[0]?.nome || 'Nenhuma organização encontrada')}
                </div>
              </div>
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do projeto (opcional)"
                  className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text placeholder:text-neutral-text-secondary focus:outline-none focus:border-primary transition-all duration-fast resize-none"
                  rows={3}
                />
              </div>
              {error && (
                <div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Criar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ nome: '', descricao: '', tenant_id: '' })
                    setError('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Editar Projeto</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Nome do Projeto"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Campanha de Verão"
                required
              />
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do projeto"
                  className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text placeholder:text-neutral-text-secondary focus:outline-none focus:border-primary transition-all duration-fast resize-none"
                  rows={3}
                />
              </div>
              {error && (
                <div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">Salvar</Button>
                <Button type="button" variant="secondary" onClick={() => { setEditModal(false); setSelected(null); setError('') }}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Excluir Projeto</h2>
            <p className="text-body text-neutral-text-secondary mb-4">Tem certeza que deseja excluir &quot;{selected?.nome}&quot;?</p>
            {error && (
              <div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-3">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleDelete} className="flex-1">Excluir</Button>
              <Button type="button" variant="secondary" onClick={() => { setDeleteModal(false); setSelected(null); setError('') }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {filesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3">Arquivos do Projeto</h2>
              <Button variant="secondary" onClick={() => { setFilesModal(false); setSelected(null); setFiles([]) }}>Fechar</Button>
            </div>
            {filesLoading ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : files.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhum arquivo vinculado</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {files.map((f) => (
                  <div key={f.id} className="p-3 border border-neutral-border dark:border-neutral-border-dark rounded-md">
                    <div className="text-body font-semibold">{f.titulo}</div>
                    <div className="text-small text-neutral-text-secondary">Tipo: {f.tipo || '—'}</div>
                    <div className="text-small text-neutral-text-secondary">Atualizado: {new Date(f.updated_at || f.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
