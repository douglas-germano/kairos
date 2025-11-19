import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Digite aqui...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange && onChange(html)
    },
  })

  useEffect(() => {
    if (editor && typeof value === 'string' && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div className="border border-neutral-border dark:border-neutral-border-dark rounded-md">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-neutral-border dark:border-neutral-border-dark">
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="text-body px-2 py-1 rounded hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary">B</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="text-body px-2 py-1 rounded hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary">I</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="text-body px-2 py-1 rounded hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary">• List</button>
      </div>
      <div className="px-3.5 py-2.5">
        <EditorContent editor={editor} className="prose prose-sm max-w-none dark:prose-invert" />
      </div>
    </div>
  )
}