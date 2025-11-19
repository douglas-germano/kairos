import { useEffect, useState, useCallback } from 'react'
import { tenantsAPI, projectsAPI } from '../services/api'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2 } from 'lucide-react'

export default function Create() {
  const [orgs, setOrgs] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const loadProjectsByOrg = useCallback(async (orgId) => {
    try {
      const res = await projectsAPI.getByTenant(orgId)
      setProjects(res.data || [])
    } catch {
      setProjects([])
    }
  }, [])

  const loadOrgs = useCallback(async () => {
    try {
      const res = await tenantsAPI.getMine()
      const list = res.data || []
      setOrgs(list)
      const first = list[0]?.id || ''
      setSelectedOrg(first)
      if (first) {
        await loadProjectsByOrg(first)
      } else {
        setProjects([])
      }
    } catch {
      setOrgs([])
      setSelectedOrg('')
      setProjects([])
    }
  }, [loadProjectsByOrg])

  const loadMyFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const res = await projectsAPI.getMyFiles()
      setFiles(res.data || [])
    } catch {
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    loadOrgs()
    loadMyFiles()
  }, [loadOrgs, loadMyFiles])

  


  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!title || !selectedProject) {
      setError('Título e Projeto são obrigatórios')
      return
    }
    setShowModal(false)
    navigate('/documents/new', { state: { projectId: selectedProject, orgId: selectedOrg, title } })
  }

  const openEditFile = (file) => {
    navigate(`/documents/${file.id}/edit`)
  }

  const openDeleteFile = (file) => {
    setSelectedFile(file)
    setDeleteModal(true)
  }

  const handleDeleteFile = async () => {
    try {
      await projectsAPI.deleteFile(selectedFile.id)
      setFiles(files.filter((f) => f.id !== selectedFile.id))
      setDeleteModal(false)
      setSelectedFile(null)
    } catch (err) {
      setError('Erro ao excluir documento')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Criar" subtitle="Escreva documentos e vincule a um projeto">
        <Button onClick={() => setShowModal(true)}>Criar Documento</Button>
      </Topbar>
      

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="max-w-3xl mx-auto">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6">
            <h2 className="text-h3 mb-4">Seus documentos</h2>
            {loadingFiles ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : files.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhum documento encontrado</div>
            ) : (
              <div className="space-y-3">
                {files.map((f) => (
                  <div key={f.id} className="p-3 border border-neutral-border dark:border-neutral-border-dark rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="text-body font-semibold">{f.titulo}</div>
                      <span className="text-small px-2 py-1 rounded bg-neutral-light-secondary dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark">
                        {f.project?.nome || 'Projeto'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-small text-neutral-text-secondary">Atualizado: {new Date(f.updated_at || f.created_at).toLocaleString()}</div>
                      <div className="flex gap-2">
                        <Button variant="secondary" aria-label="Editar" title="Editar" className="hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary" onClick={() => openEditFile(f)}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="secondary" aria-label="Excluir" title="Excluir" className="hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary" onClick={() => openDeleteFile(f)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-h3 mb-4">Novo Documento</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Informe o título" required />
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Organização</label>
                <div className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body">
                  {orgs[0]?.nome || 'Nenhuma organização encontrada'}
                </div>
              </div>
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Projeto</label>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body focus:outline-none focus:border-primary" required>
                  <option value="" disabled>{projects.length ? 'Selecione um projeto' : 'Selecione uma organização primeiro'}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="text-small text-neutral-text-secondary">Após confirmar, você será direcionado para o editor completo.</div>
              {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">Criar</Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Excluir Documento</h2>
            <p className="text-body text-neutral-text-secondary mb-4">Tem certeza que deseja excluir &quot;{selectedFile?.titulo}&quot;?</p>
            <div className="flex gap-3">
              <Button onClick={handleDeleteFile} className="flex-1">Excluir</Button>
              <Button type="button" variant="secondary" onClick={() => { setDeleteModal(false); setSelectedFile(null) }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}