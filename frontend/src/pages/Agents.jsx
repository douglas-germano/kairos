import { useEffect, useState, useCallback } from 'react'
import { tenantsAPI, customAIsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'
import { Bot, Trash2, Edit2, MessageSquare } from 'lucide-react'

export default function Agents() {
  const navigate = useNavigate()


  const [selectedOrg, setSelectedOrg] = useState('')
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)

  const [deleteModal, setDeleteModal] = useState(false)
  const [conversationsModal, setConversationsModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [agentConversations, setAgentConversations] = useState([])
  const [convLoading, setConvLoading] = useState(false)
  const [newConvTitle, setNewConvTitle] = useState('Nova Conversa')

  const loadOrgs = useCallback(async () => {
    try {
      const res = await tenantsAPI.getMine()
      const list = res.data || []
      if (!selectedOrg && list.length > 0) {
        setSelectedOrg(list[0].id)
      }
    } catch (e) {
      // ignore
    }
  }, [selectedOrg])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  const loadAgents = async (tenantId) => {
    if (!tenantId) return
    try {
      setLoading(true)
      const res = await customAIsAPI.getByTenant(tenantId)
      setAgents(res.data || [])
      setError('')
    } catch (e) {
      const msg = e.response?.data?.error || 'Falha ao carregar agentes'
      setError(msg)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAgents(selectedOrg) }, [selectedOrg])

  const openCreate = () => {
    navigate('/agents/new')
  }



  const openEdit = (agent) => {
    navigate(`/agents/${agent.id}/edit`)
  }

  const openDelete = (agent) => { setSelected(agent); setDeleteModal(true) }

  const handleDelete = async () => {
    setError('')
    try {
      await customAIsAPI.delete(selected.id)
      setAgents(agents.filter((a) => a.id !== selected.id))
      setDeleteModal(false)
      setSelected(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar agente')
    }
  }

  const openConversations = async (agent) => {
    setSelected(agent)
    setConversationsModal(true)
    try {
      setConvLoading(true)
      const res = await customAIsAPI.getConversations(agent.id)
      setAgentConversations(res.data || [])
    } catch (err) {
      setAgentConversations([])
    } finally {
      setConvLoading(false)
    }
  }

  const openNewConversationForAgent = async (agent) => {
    try {
      const res = await customAIsAPI.createConversation(agent.id, { tenant_id: selectedOrg, titulo: `Conversa com ${agent.nome}` })
      const convId = res.data.conversation.id
      navigate(`/chat?customAiConversationId=${convId}&customAiId=${agent.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conversa')
    }
  }

  const handleCreateConversation = async () => {
    if (!selected) return
    try {
      const res = await customAIsAPI.createConversation(selected.id, { tenant_id: selectedOrg, titulo: newConvTitle })
      setAgentConversations([res.data.conversation, ...agentConversations])
      setNewConvTitle('Nova Conversa')
    } catch (err) {
      // silent error UI minimal
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Agentes" subtitle="Crie e gerencie suas IA's personalizadas">
        <Button onClick={openCreate}>+ Agente</Button>
      </Topbar>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-xl">
        {error && (
          <div className="mb-4 p-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 flex items-center justify-between">
            <div className="text-small">{error}</div>
            <Button variant="secondary" onClick={() => loadAgents(selectedOrg)}>Recarregar</Button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="text-neutral-text-secondary">Carregando...</div></div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={64} className="text-neutral-text-secondary mb-4" />
            <h2 className="text-h3 mb-2">Nenhum agente encontrado</h2>
            <p className="text-body text-neutral-text-secondary mb-6">Crie seu primeiro agente para começar</p>
            <Button onClick={openCreate}>+ Agente</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 hover:border-primary transition-all duration-fast cursor-pointer" onClick={() => openNewConversationForAgent(agent)}>
                <h3 className="text-h3 mb-2">{agent.nome}</h3>
                {agent.descricao && (
                  <p className="text-body text-neutral-text-secondary mb-4 line-clamp-2">{agent.descricao}</p>
                )}
                <div className="text-small text-neutral-text-secondary">Modelo: {agent.modelo}</div>
                <div className="flex gap-2 mt-4 items-center flex-nowrap">
                  <Button variant="secondary" className="!h-9 !px-3 !py-0 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); openConversations(agent) }}>
                    <MessageSquare size={16} /> Conversas
                  </Button>
                  <Button variant="secondary" aria-label="Editar" title="Editar" className="!h-9 !w-9 !p-0 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); openEdit(agent) }}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="secondary" aria-label="Excluir" title="Excluir" className="!h-9 !w-9 !p-0 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); openDelete(agent) }}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Modal Editar Agente */}


      {/* Modal Excluir */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-h3 mb-4">Excluir Agente</h2>
            <p className="text-body text-neutral-text-secondary mb-4">Tem certeza que deseja excluir &quot;{selected?.nome}&quot;?</p>
            {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-3">{error}</div>)}
            <div className="flex gap-3">
              <Button onClick={handleDelete} className="flex-1">Excluir</Button>
              <Button type="button" variant="secondary" onClick={() => { setDeleteModal(false); setSelected(null); setError('') }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conversas do Agente */}
      {conversationsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3">Conversas de {selected?.nome}</h2>
              <Button variant="secondary" onClick={() => { setConversationsModal(false); setSelected(null); setAgentConversations([]) }}>Fechar</Button>
            </div>
            <div className="flex gap-2 mb-4">
              <Input value={newConvTitle} onChange={(e) => setNewConvTitle(e.target.value)} />
              <Button onClick={handleCreateConversation}>Nova Conversa</Button>
            </div>
            {convLoading ? (
              <div className="text-neutral-text-secondary">Carregando...</div>
            ) : agentConversations.length === 0 ? (
              <div className="text-neutral-text-secondary">Nenhuma conversa</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {agentConversations.map((c) => (
                  <div key={c.id} className="p-3 border border-neutral-border dark:border-neutral-border-dark rounded-md flex items-center justify-between">
                    <div>
                      <div className="text-body font-semibold">{c.titulo}</div>
                      <div className="text-small text-neutral-text-secondary">Criada: {new Date(c.criada_em || c.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/chat?customAiConversationId=${c.id}&customAiId=${selected?.id}`)}>Abrir</Button>
                    </div>
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