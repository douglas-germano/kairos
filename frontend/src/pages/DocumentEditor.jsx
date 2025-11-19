import { useMemo, useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import Button from '../components/Button'
import { Undo2, Redo2, Bold as BoldIcon, Italic as ItalicIcon, Strikethrough, Underline as UnderlineIcon, Code as CodeIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, Plus } from 'lucide-react'
import { projectsAPI } from '../services/api'
import Topbar from '../components/Topbar'

export default function DocumentEditor() {
  const { fileId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fileMeta, setFileMeta] = useState(null)
  const isEdit = !!fileId
  const extensions = useMemo(() => [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem,
    HorizontalRule,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image,
    CodeBlockLowlight.configure({ lowlight }),
    Placeholder.configure({ placeholder: 'Digite / para comandos' }),
  ], [])

  const editor = useEditor({
    extensions,
    content: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      try {
        const res = await projectsAPI.getFile(fileId)
        const html = res.data?.conteudo || ''
        editor?.commands.setContent(html)
        setFileMeta(res.data || null)
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao carregar documento')
      }
    }
    load()
  }, [isEdit, fileId, editor])

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const html = editor?.getHTML() || ''
      if (isEdit) {
        await projectsAPI.updateFile(fileId, { conteudo: html })
      } else {
        const projectId = location.state?.projectId
        const title = location.state?.title || 'Sem título'
        if (!projectId) throw new Error('Projeto não informado')
        await projectsAPI.createFile(projectId, { titulo: title, conteudo: html })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar documento')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    const pid = fileMeta?.project?.id || location.state?.projectId
    if (pid) navigate(`/projects/${pid}/files`)
    else navigate(-1)
  }

  

  
  

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Editor de Documento">
        <Button variant="secondary" onClick={handleBack}>Voltar</Button>
        <Button onClick={handleSave} disabled={saving || !editor}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </Topbar>
      

      <div className="sticky top-[72px] z-30 border-b border-neutral-border dark:border-neutral-border-dark bg-neutral-light-secondary dark:bg-neutral-dark-secondary">
        <div className="px-xl py-2 flex justify-center gap-2">
          <Button variant="secondary" aria-label="Desfazer" title="Desfazer" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 size={18} />
          </Button>
          <Button variant="secondary" aria-label="Refazer" title="Refazer" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 size={18} />
          </Button>
          <select
            value={editor?.isActive('heading', { level: 1 }) ? 'h1' : editor?.isActive('heading', { level: 2 }) ? 'h2' : editor?.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
            onChange={(e) => {
              const v = e.target.value
              const chain = editor?.chain().focus()
              if (v === 'h1') chain?.toggleHeading({ level: 1 }).run();
              else if (v === 'h2') chain?.toggleHeading({ level: 2 }).run();
              else if (v === 'h3') chain?.toggleHeading({ level: 3 }).run();
              else chain?.setParagraph().run();
            }}
            className="px-2.5 py-1.5 rounded-md border border-neutral-border dark:border-neutral-border-dark bg-transparent text-body"
          >
            <option value="p">H ▼</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </select>
          <Button variant="secondary" aria-label="Negrito" title="Negrito" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <BoldIcon size={18} />
          </Button>
          <Button variant="secondary" aria-label="Itálico" title="Itálico" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <ItalicIcon size={18} />
          </Button>
          <Button variant="secondary" aria-label="Tachado" title="Tachado" onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <Strikethrough size={18} />
          </Button>
          <Button variant="secondary" aria-label="Sublinhado" title="Sublinhado" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={18} />
          </Button>
          <Button variant="secondary" aria-label="Código" title="Código" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
            <CodeIcon size={18} />
          </Button>
          <Button variant="secondary" aria-label="Esquerda" title="Esquerda" onClick={() => editor?.chain().focus().setTextAlign('left').run()}>
            <AlignLeft size={18} />
          </Button>
          <Button variant="secondary" aria-label="Centro" title="Centro" onClick={() => editor?.chain().focus().setTextAlign('center').run()}>
            <AlignCenter size={18} />
          </Button>
          <Button variant="secondary" aria-label="Direita" title="Direita" onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
            <AlignRight size={18} />
          </Button>
          <Button variant="secondary" aria-label="Justificar" title="Justificar" onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify size={18} />
          </Button>
          <Button variant="secondary" aria-label="Adicionar" title="Adicionar" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            <Plus size={18} />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-xl py-lg">
        <div className="border border-neutral-border dark:border-neutral-border-dark rounded-md h-[calc(100vh-168px)] overflow-auto relative">
          <div className="px-3.5 py-2.5 min-h-full">
            <EditorContent editor={editor} className="prose prose-sm max-w-none dark:prose-invert min-h-full" />
          </div>
        </div>
        {error && (<div className="mt-4 text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
      </div>
    </div>
  )
}