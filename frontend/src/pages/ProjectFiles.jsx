import { useEffect, useState, useCallback, useRef } from 'react'
import { Edit2, Trash2, Eye } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsAPI } from '../services/api'
import Topbar from '../components/Topbar'
import Button from '../components/Button'

export default function ProjectFiles() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [previewModal, setPreviewModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewMime, setPreviewMime] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [p, f] = await Promise.all([
        projectsAPI.get(projectId),
        projectsAPI.getFiles(projectId),
      ])
      setProject(p.data || null)
      setFiles(f.data || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar arquivos')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  const openFile = async (file) => {
    try {
      if ((file.tipo || '').startsWith('text') || (file.tipo || '') === 'documento') {
        navigate(`/documents/${file.id}/edit`)
        return
      }
      const res = await projectsAPI.getFile(file.id)
      const content = res.data?.conteudo
      const mime = res.data?.tipo || 'application/octet-stream'
      if (!content) return
      const byteCharacters = atob(String(content))
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.titulo || 'arquivo'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Erro ao abrir arquivo')
    }
  }

  const openPreview = async (file) => {
    setSelected(file)
    setPreviewModal(true)
    setPreviewLoading(true)
    setPreviewText('')
    setPreviewUrl('')
    try {
      const res = await projectsAPI.getFile(file.id)
      const content = res.data?.conteudo || ''
      const mime = res.data?.tipo || 'application/octet-stream'
      setPreviewMime(mime)
      if ((mime || '').startsWith('text') || (mime || '') === 'documento') {
        setPreviewText(String(content))
      } else {
        const byteCharacters = atob(String(content))
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mime })
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao pré-visualizar arquivo')
      setPreviewText('')
      setPreviewUrl('')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setPreviewText('')
    setPreviewModal(false)
    setSelected(null)
  }

  const openEdit = (file) => {
    setSelected(file)
    setEditTitle(file.titulo || '')
    setEditModal(true)
  }

  const handleUpdateTitle = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await projectsAPI.updateFile(selected.id, { titulo: editTitle })
      setEditModal(false)
      setSelected(null)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao renomear arquivo')
    }
  }

  const openDelete = (file) => {
    setSelected(file)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    setError('')
    try {
      await projectsAPI.deleteFile(selected.id)
      setDeleteModal(false)
      setSelected(null)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir arquivo')
    }
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      let conteudo
      let tipo = file.type || 'arquivo'
      if ((file.type || '').startsWith('text')) {
        conteudo = await file.text()
      } else {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        conteudo = btoa(binary)
      }
      await projectsAPI.createFile(projectId, { titulo: file.name, conteudo, tipo })
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title={project?.nome ? `Arquivos: ${project.nome}` : 'Arquivos do Projeto'} subtitle={project?.descricao || ''}>
        <Button variant="secondary" onClick={() => navigate('/projects')}>Voltar</Button>
        <Button onClick={() => navigate('/documents/new', { state: { projectId, orgId: project?.tenant_id, title: 'Sem título' } })}>Novo Documento</Button>
        <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileChange} />
        <Button onClick={triggerUpload} disabled={uploading}>{uploading ? 'Enviando…' : 'Upload Arquivo'}</Button>
      </Topbar>
      <div className="flex-1 overflow-y-auto p-xl">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="text-neutral-text-secondary">Carregando...</div></div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-neutral-text-secondary mb-4">Nenhum arquivo encontrado</div>
            <Button onClick={() => navigate('/create')}>Novo Documento</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.id} className="text-left bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 hover:border-primary transition-all duration-fast">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openFile(f)} className="text-left flex-1">
                    <div className="text-body font-semibold truncate">{f.titulo}</div>
                    <div className="text-small text-neutral-text-secondary mt-1">Atualizado: {new Date(f.updated_at || f.created_at).toLocaleString()}</div>
                    <div className="text-small text-neutral-text-secondary mt-1">Tipo: {f.tipo || '—'}</div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="secondary" aria-label="Pré-visualizar" title="Pré-visualizar" className="!h-9 !w-9 !p-0 flex items-center justify-center" onClick={() => openPreview(f)}>
                      <Eye size={16} />
                    </Button>
                    <Button variant="secondary" aria-label="Editar" title="Editar" className="!h-9 !w-9 !p-0 flex items-center justify-center" onClick={() => openEdit(f)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="secondary" aria-label="Excluir" title="Excluir" className="!h-9 !w-9 !p-0 flex items-center justify-center" onClick={() => openDelete(f)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (<div className="mt-4 text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Renomear Arquivo</h2>
            <form onSubmit={handleUpdateTitle} className="space-y-4">
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Novo nome</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3.5 py-2.5 border rounded-md bg-transparent" required />
              </div>
              {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
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
            <h2 className="text-h3 mb-4">Excluir Arquivo</h2>
            <p className="text-body text-neutral-text-secondary mb-4">Tem certeza que deseja excluir &quot;{selected?.titulo}&quot;?</p>
            {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-3">{error}</div>)}
            <div className="flex gap-3">
              <Button onClick={handleDelete} className="flex-1">Excluir</Button>
              <Button type="button" variant="secondary" onClick={() => { setDeleteModal(false); setSelected(null); setError('') }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {previewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-0 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-border dark:border-neutral-border-dark">
              <h2 className="text-h3">Pré-visualizar: {selected?.titulo}</h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={closePreview}>Fechar</Button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              {previewLoading ? (
                <div className="text-neutral-text-secondary">Carregando...</div>
              ) : previewText ? (
                <pre className="whitespace-pre-wrap text-body">{previewText}</pre>
              ) : previewUrl ? (
                ((previewMime || '').startsWith('image')) ? (
                  <img src={previewUrl} alt={selected?.titulo || 'preview'} className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <iframe src={previewUrl} title={selected?.titulo || 'preview'} className="w-full h-[70vh]" />
                )
              ) : (
                <div className="text-neutral-text-secondary">Pré-visualização indisponível</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}