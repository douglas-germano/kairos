import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chatAPI, customAIsAPI, webAPI, visionAPI } from '../services/api'
import { AlertTriangle } from 'lucide-react'
import ChatComponent from '../components/ChatComponent'
import { TopbarSlot } from '../components/Layout'
import Button from '../components/Button'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [customAiId, setCustomAiId] = useState(null)
  const [isCustomAi, setIsCustomAi] = useState(false)
  const [customAiName, setCustomAiName] = useState('')
  const [imageGenerating] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const messagesEndRef = useRef(null)
  const [searchParams] = useSearchParams()
  const [model, setModel] = useState('claude-sonnet-4-5')


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = (input || '').trim()
    if ((!text && !pendingImage) || loading) return

    const now = Date.now()
    const userMessage = !pendingImage
      ? { id: now, role: 'user', content: text, timestamp: new Date() }
      : { id: now, role: 'user', content: text, image_url: pendingImage, timestamp: new Date() }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      if (!pendingImage && !isCustomAi && text.toLowerCase().startsWith('/web')) {
        const q = text.slice(4).trim()
        if (!q) return
        const res = await webAPI.search({ query: q })
        const assistantMessage = {
          id: now + 1,
          role: 'assistant',
          content: res.data?.answer || 'Não foi possível obter resultado da web.',
          links: (res.data?.sources || []).map((s) => s.url),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        if (res.data?.conversation_id) {
          localStorage.setItem('last_chat_conversation_id', String(res.data.conversation_id))
        }
        return
      }
      if (isCustomAi) {
        const res = await customAIsAPI.sendMessage(conversationId, { message: text, custom_ai_id: customAiId, model })
        const assistantMessage = {
          id: now + 1,
          role: 'assistant',
          content: res.data.assistant_message || 'Não foi possível obter resposta.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else if (!pendingImage) {
        const messagesHistory = [...messages.map(msg => ({ role: msg.role, content: msg.content })), { role: 'user', content: text }]
        const response = await chatAPI.sendMessage({ message: text, messages: messagesHistory, conversation_id: conversationId || undefined, model })
        const assistantMessage = {
          id: now + 1,
          role: 'assistant',
          content: response.data.message || 'Não foi possível obter resposta.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        if (response.data.conversation_id && response.data.conversation_id !== conversationId) {
          setConversationId(response.data.conversation_id)
          localStorage.setItem('last_chat_conversation_id', String(response.data.conversation_id))
        }
      } else if (pendingImage) {
        const res = await visionAPI.analyze({ image_url: pendingImage, prompt: text, persist: true })
        const answer = res.data?.answer || 'Não foi possível analisar a imagem.'
        const assistantMessage = {
          id: now + 1,
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        if (res.data?.conversation_id && res.data.conversation_id !== conversationId) {
          setConversationId(res.data.conversation_id)
          localStorage.setItem('last_chat_conversation_id', String(res.data.conversation_id))
        }
      }
    } catch (error) {
      const errorMessage = {
        id: now + 1,
        role: 'assistant',
        content: `Erro: ${error.response?.data?.error || 'Erro ao enviar mensagem'}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setPendingImage(null)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    localStorage.removeItem('last_chat_conversation_id')
  }

  const handleImagePaste = async (dataUrl) => {
    try {
      setPendingImage(dataUrl)
    } catch {
      setPendingImage(null)
    }
  }

  useEffect(() => {
    const entry = performance?.getEntriesByType?.('navigation')?.[0]
    const isReload = entry?.type === 'reload'
    if (!isReload) return
    const lastId = localStorage.getItem('last_chat_conversation_id')
    if (!lastId) return
    const restore = async () => {
      try {
        setLoading(true)
        const res = await chatAPI.getConversation(lastId)
        const list = res.data?.messages || res.data?.history || []
        const hydrated = list.map((m, idx) => ({
          id: m.id ?? idx,
          role: m.role ?? m.author ?? 'assistant',
          content: m.content ?? m.text ?? '',
          image_url: m.image_url || null,
          timestamp: m.timestamp ? new Date(m.timestamp) : (m.created_at ? new Date(m.created_at) : new Date())
        }))
        setMessages(hydrated)
        setConversationId(lastId)
      } catch {
        setMessages((prev) => prev)
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  useEffect(() => {
    const id = searchParams.get('id')
    const customId = searchParams.get('customAiConversationId')
    const customAi = searchParams.get('customAiId')
    if (!id && !customId) return
    const load = async () => {
      try {
        setLoading(true)
        if (customId) {
          const res = await customAIsAPI.getHistory(customId)
          const payload = res.data
          const list = Array.isArray(payload) ? payload : (payload?.messages || payload?.history || [])
          const hydrated = list.map((m, idx) => ({
            id: m.id ?? idx,
            role: m.role ?? m.author ?? 'assistant',
            content: m.conteudo ?? m.content ?? m.text ?? '',
            timestamp: m.timestamp ? new Date(m.timestamp) : (m.criada_em ? new Date(m.criada_em) : (m.created_at ? new Date(m.created_at) : new Date()))
          }))
          setMessages(hydrated)
          setConversationId(customId)
          setCustomAiId(customAi)
          setIsCustomAi(true)
          try {
            if (customAi) {
              const a = await customAIsAPI.get(customAi)
              setCustomAiName(a.data?.nome || '')
            } else {
              setCustomAiName('')
            }
          } catch {
            setCustomAiName('')
          }
        } else if (id) {
          const res = await chatAPI.getConversation(id)
          const list = res.data?.messages || res.data?.history || []
          const hydrated = list.map((m, idx) => ({
            id: m.id ?? idx,
            role: m.role ?? m.author ?? 'assistant',
            content: m.content ?? m.text ?? '',
            image_url: m.image_url || null,
            timestamp: m.timestamp ? new Date(m.timestamp) : (m.created_at ? new Date(m.created_at) : new Date())
          }))
          setMessages(hydrated)
          setConversationId(id)
          localStorage.setItem('last_chat_conversation_id', String(id))
          setIsCustomAi(false)
          setCustomAiId(null)
          setCustomAiName('')
        }
      } catch (e) {
        setMessages([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchParams])

  return (
    <div className="h-full flex flex-col bg-neutral-light dark:bg-neutral-dark">
      <TopbarSlot title="Chat" subtitle="Converse com a IA para criar seus textos">
        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="px-3 py-2 rounded-md border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark text-neutral-text dark:text-neutral-text-dark text-small focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="claude-opus-4-1">Claude Opus 4.1</option>
            <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
          </select>
          <Button onClick={handleNewChat}>+ Novo Chat</Button>
        </div>
      </TopbarSlot>

      {isCustomAi && (
        <div className="w-[60%] mx-auto mt-3">
          <div className="flex items-start gap-3 p-3 rounded-md border border-neutral-border dark:border-neutral-border-dark bg-neutral-light-secondary dark:bg-neutral-dark-secondary">
            <AlertTriangle size={18} className="text-neutral-text-secondary mt-0.5" />
            <div>
              <div className="text-small font-semibold">Você está usando um agente personalizado</div>
              <div className="text-caption text-neutral-text-secondary">{customAiName ? `Agente: ${customAiName}` : `As respostas usarão o prompt cadastrado do agente.`}</div>
            </div>
          </div>
        </div>
      )}

      <ChatComponent
        messages={messages}
        loading={loading || imageGenerating}
        input={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSubmit={handleSend}
        onImagePaste={handleImagePaste}
        disabled={loading || (isCustomAi && !conversationId)}
        placeholder="Pergunte alguma coisa"
        submitLabel="Enviar"
        messagesWidthClass="w-[60%]"
        inputWidthClass="w-[70%]"
        canSubmit={Boolean((input || '').trim() || pendingImage)}
        attachedImage={pendingImage}
        onClearAttachment={() => setPendingImage(null)}
      />
    </div>
  )
}

