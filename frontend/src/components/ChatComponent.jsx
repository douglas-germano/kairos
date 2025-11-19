import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import { Plus, Mic, Square, Send, X, ExternalLink } from 'lucide-react'
import { voiceAPI } from '../services/api'

export default function ChatComponent({
  messages,
  loading,
  input,
  onChange,
  onKeyDown,
  onSubmit,
  onImagePaste,
  disabled,
  placeholder,
  submitLabel = 'Enviar',
  messagesWidthClass = 'w-[60%]',
  inputWidthClass = 'w-[70%]',
  canSubmit = false,
  attachedImage = null,
  onClearAttachment = undefined
}) {
  // --- ChatInput Logic ---
  const textareaRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    const text = (input || '').trim()
    if (!text && !canSubmit) return
    if (disabled || loading) return
    if (onSubmit) onSubmit(e)
    if (onChange) onChange({ target: { value: '' } })
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = '0px'
      el.focus()
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || []
    const fileItem = Array.from(items).find((it) => it.kind === 'file' && it.type.startsWith('image/'))
    if (!fileItem) return
    e.preventDefault()
    const file = fileItem.getAsFile()
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (onImagePaste && typeof dataUrl === 'string') {
        onImagePaste(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav'
      ]
      const supported = preferredTypes.find((t) => {
        try { return MediaRecorder.isTypeSupported(t) } catch { return false }
      })
      const mr = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      mr.onstop = async () => {
        try {
          const firstType = (chunksRef.current[0] && chunksRef.current[0].type) || ''
          const blobType = firstType || 'audio/webm'
          const blob = new Blob(chunksRef.current, { type: blobType })
          const ext = blobType.includes('mp4') ? 'mp4' : (blobType.includes('webm') ? 'webm' : (blobType.includes('wav') ? 'wav' : 'm4a'))
          const file = new File([blob], `input.${ext}`, { type: blobType })
          const form = new FormData()
          form.append('file', file)
          form.append('model', 'whisper-large-v3-turbo')
          const res = await voiceAPI.transcribe(form)
          const text = res.data?.text || ''
          if (text && onChange) {
            const next = (input || '').trim() ? `${input} ${text}` : text
            onChange({ target: { value: next } })
          }
        } catch (_) {
          // ignore
        } finally {
          setRecording(false)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } catch (_) {
      setRecording(false)
    }
  }

  const stopRecording = () => {
    try {
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') {
        mr.stop()
      } else {
        setRecording(false)
      }
    } catch (_) {
      setRecording(false)
    }
  }

  const handleFileSelect = (file) => {
    if (!file || !file.type?.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (onImagePaste && typeof dataUrl === 'string') {
        onImagePaste(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) handleFileSelect(files[0])
  }

  const onDragOverHandler = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeaveHandler = () => {
    setDragOver(false)
  }

  // --- ChatView Logic ---
  const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const mdToHtml = (md) => {
    if (!md) return ''
    let text = String(md)

    text = text.replace(/```([\s\S]*?)```/g, (m, code) => `<pre class="overflow-auto rounded-md p-3 bg-neutral-light-secondary dark:bg-neutral-dark-secondary"><code>${escapeHtml(code)}</code></pre>`) 
    text = text.replace(/^######\s(.+)$/gm, '<h6>$1</h6>')
    text = text.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>')
    text = text.replace(/^####\s(.+)$/gm, '<h4>$1</h4>')
    text = text.replace(/^###\s(.+)$/gm, '<h3>$1</h3>')
    text = text.replace(/^##\s(.+)$/gm, '<h2>$1</h2>')
    text = text.replace(/^#\s(.+)$/gm, '<h1>$1</h1>')

    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>')
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
    text = text.replace(/`([^`]+)`/g, (m, c) => `<code class="px-1 py-0.5 rounded bg-neutral-light-secondary dark:bg-neutral-dark-secondary">${escapeHtml(c)}</code>`) 

    const lines = text.split(/\r?\n/)
    let html = ''
    let inUl = false
    let inOl = false
    const flushLists = () => {
      if (inUl) { html += '</ul>'; inUl = false }
      if (inOl) { html += '</ol>'; inOl = false }
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/^\s*-\s+/.test(line) || /^\s*\*\s+/.test(line)) {
        if (!inUl) { flushLists(); html += '<ul class="list-disc pl-5 space-y-1">'; inUl = true }
        html += `<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`
        continue
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        if (!inOl) { flushLists(); html += '<ol class="list-decimal pl-5 space-y-1">'; inOl = true }
        html += `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`
        continue
      }
      if (/^\s*$/.test(line)) { flushLists(); continue }
      flushLists()
      html += `<p>${line}</p>`
    }
    flushLists()
    return html
  }
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-lg py-md scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h2 className="text-h2 mb-2">Bem-vindo ao KAIROS</h2>
              <p className="text-body text-neutral-text-secondary">Comece uma conversa digitando sua mensagem abaixo.</p>
            </div>
          </div>
        ) : (
          <div className={`${messagesWidthClass} mx-auto space-y-3`}>
            {messages.map((message) => (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`flex animate-slideUp ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-neutral-text'
                      : message.error
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      : 'bg-neutral-light-secondary dark:bg-neutral-dark-secondary text-neutral-text dark:text-neutral-light'
                  }`}
                >
                  {message.image_url ? (
                    <img src={message.image_url} alt="Imagem" className="rounded-md max-w-full mb-2" />
                  ) : null}
                  {message.content ? (
                    <div className="text-body break-words" dangerouslySetInnerHTML={{ __html: mdToHtml(message.content) }} />
                  ) : null}
                  {Array.isArray(message.links) && message.links.length > 0 ? (
                    <a
                      href={message.links[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center mt-2"
                      title="Abrir fonte"
                    >
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-slideUp">
                <div className="bg-neutral-light-secondary dark:bg-neutral-dark-secondary rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-neutral-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-neutral-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-neutral-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {messages.some((m) => m.image_url) ? (
        <div className="px-lg pb-md">
          <div className={`${messagesWidthClass} mx-auto`}>
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {messages.filter((m) => m.image_url).map((m) => (
                <button
                  key={`thumb-${m.id}`}
                  type="button"
                  className="shrink-0"
                  onClick={() => {
                    const el = document.getElementById(`msg-${m.id}`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  title="Abrir imagem"
                >
                  <img src={m.image_url} alt="Imagem" className="w-14 h-14 rounded object-cover border border-neutral-border dark:border-neutral-border-dark" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="border-t border-neutral-border dark:border-neutral-border-dark px-lg py-md bg-neutral-light dark:bg-neutral-dark">
        <div className={`${inputWidthClass} mx-auto`}>
          <form onSubmit={handleSubmit} className="flex items-center">
            <div
              className={`relative flex items-center gap-3 w-full rounded-2xl bg-neutral-light-secondary dark:bg-neutral-dark-secondary border px-4 py-3 ${dragOver ? 'border-primary' : 'border-neutral-border dark:border-neutral-border-dark'}`}
              onDrop={onDrop}
              onDragOver={onDragOverHandler}
              onDragLeave={onDragLeaveHandler}
            >
              <button
                type="button"
                className={`text-neutral-text-secondary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Anexar imagem"
              >
                <Plus size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                  e.target.value = ''
                }}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={onChange}
                onKeyDown={(evt) => {
                  if (onKeyDown) onKeyDown(evt)
                  if (!evt.defaultPrevented && evt.key === 'Enter' && !evt.shiftKey) {
                    evt.preventDefault()
                    handleSubmit(evt)
                  }
                }}
                onPaste={handlePaste}
                placeholder={placeholder || 'Pergunte alguma coisa'}
                className="flex-1 bg-transparent border-0 focus:outline-none text-body text-neutral-text placeholder:text-neutral-text-secondary resize-none"
                rows={1}
                disabled={disabled}
              />
              {attachedImage ? (
                <div className="flex items-center gap-2 shrink-0">
                  <img src={attachedImage} alt="Pré-visualização" className="w-12 h-12 rounded object-cover border border-neutral-border dark:border-neutral-border-dark" />
                  <button
                    type="button"
                    className="text-neutral-text-secondary hover:text-red-500"
                    onClick={() => onClearAttachment && onClearAttachment()}
                    title="Remover imagem"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className={`text-neutral-text-secondary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                disabled={disabled}
                title={recording ? 'Parar gravação' : 'Gravar áudio'}
              >
                {recording ? <Square size={18} className="text-red-500" /> : <Mic size={18} />}
              </button>

              {recording ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/60" aria-hidden="true"></div>
                  <div className="relative bg-transparent rounded-xl px-6 py-6 flex flex-col items-center gap-6">
                    <span className="sound-wave-lg text-primary">
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                      <span className="sound-bar-lg"></span>
                    </span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-neutral-border dark:border-neutral-border-dark hover:border-red-500"
                      title="Parar gravação"
                      aria-label="Parar gravação"
                    >
                      <Mic size={40} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ) : null}
              <Button type="submit" disabled={(!input?.trim() && !canSubmit) || loading || disabled} className="flex items-center gap-2">
                <Send size={18} />
                {loading ? 'Enviando...' : submitLabel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
