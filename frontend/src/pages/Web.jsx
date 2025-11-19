import { useState } from 'react'
import { webAPI } from '../services/api'
import ChatComponent from '../components/ChatComponent'
import { TopbarSlot } from '../components/Layout'
import Button from '../components/Button'

export default function Web() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const isUrl = /^(https?:\/\/[^\s]+)$/i.test(q)
      const res = isUrl
        ? await webAPI.visit({ url: q, persist: true })
        : await webAPI.search({ query: q, persist: true })
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data?.answer || 'Não foi possível obter resultado da web.',
        links: isUrl ? [q] : (res.data?.sources || []).map((s) => s.url).filter(Boolean),
        timestamp: new Date(),
      }
      if (res.data?.conversation_id) {
        localStorage.setItem('last_chat_conversation_id', String(res.data.conversation_id))
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Erro: ${error.response?.data?.error || 'Falha na pesquisa na web'}`,
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const handleNewSearch = () => {
    setMessages([])
  }

  return (
    <div className="h-full flex flex-col bg-neutral-light dark:bg-neutral-dark">
      <TopbarSlot title="Web" subtitle="Pesquise na web e veja fontes">
        <Button onClick={handleNewSearch}>+ Nova Pesquisa</Button>
      </TopbarSlot>

      <ChatComponent
        messages={messages}
        loading={loading}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onSubmit={handleSend}
        placeholder="Pesquise na web..."
        submitLabel="Pesquisar"
        messagesWidthClass="w-[60%]"
        inputWidthClass="w-[70%]"
        canSubmit={!!input.trim()}
      />
    </div>
  )
}