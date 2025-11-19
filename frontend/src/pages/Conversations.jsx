import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { chatAPI } from '../services/api'
import Topbar from '../components/Topbar'
import Button from '../components/Button'
import { Trash2 } from 'lucide-react'

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [summaries, setSummaries] = useState({})
  const [searchParams] = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const navigate = useNavigate()
  

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      const res = tenantId ? await chatAPI.getConversationsByTenant(tenantId) : await chatAPI.getConversations()
      setConversations(res.data.conversations || [])
    } catch (e) {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const computeSummary = (list) => {
    const items = (Array.isArray(list) ? list : []).slice(-4)
    const parts = items.map((m) => {
      const t = m.content ?? m.text ?? ''
      return String(t).replace(/\s+/g, ' ').trim()
    }).filter(Boolean)
    const joined = parts.join(' • ')
    if (joined.length <= 120) return joined || 'Sem conteúdo'
    return joined.slice(0, 117) + '…'
  }

  useEffect(() => {
    let active = true
    const fetchAll = async () => {
      const entries = await Promise.all(conversations.map(async (c) => {
        try {
          const res = await chatAPI.getConversation(c.id)
          const list = res.data?.messages || res.data?.history || []
          const s = computeSummary(list)
          return [c.id, s]
        } catch {
          return [c.id, c.titulo || 'Sem título']
        }
      }))
      if (!active) return
      const obj = {}
      for (const [id, s] of entries) obj[id] = s
      setSummaries(obj)
    }
    if (conversations.length) fetchAll()
    return () => { active = false }
  }, [conversations])

  const openConversation = (id) => {
    navigate(`/chat?id=${id}`)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await chatAPI.deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      setSummaries((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      // opcional: feedback de erro futuro
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Conversas" subtitle={tenantId ? `Histórico da organização ${tenantId}` : 'Histórico de conversas'} />
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 border-t border-neutral-border dark:border-neutral-border-dark">
          <div className="w-[60%] mx-auto p-4 space-y-2 overflow-y-auto overflow-x-hidden h-full">
            {loading ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhuma conversa encontrada</div>
            ) : (
              conversations.map((c) => (
                <div key={c.id} className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-md transition-all duration-fast hover:bg-neutral-light-secondary dark:hover:bg-neutral-dark-secondary overflow-hidden">
                  <button onClick={() => openConversation(c.id)} className="flex-1 min-w-0 text-left">
                    <div className="text-body truncate">{summaries[c.id] || c.titulo || 'Sem título'}</div>
                    <div className="text-small text-neutral-text-secondary">{new Date(c.updated_at || c.created_at).toLocaleString()}</div>
                  </button>
                  <Button variant="secondary" className="!h-8 !w-8 !p-0 ml-3 flex items-center justify-center shrink-0" onClick={(e) => handleDelete(e, c.id)} title="Excluir conversa">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}