import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tenantsAPI, customAIsAPI } from '../services/api'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'
import ChatComponent from '../components/ChatComponent'

export default function AgentsCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', tenant_id: '', descricao: '', sistema_prompt: '', modelo: 'claude-opus-4-1', temperatura: 0.7, max_tokens: 2048 })
  const [error, setError] = useState('')
  const [createdAgent, setCreatedAgent] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadOrgs = useCallback(async () => {
    try {
      const res = await tenantsAPI.getMine()
      const list = res.data || []
      if (!form.tenant_id && list.length > 0) {
        setForm((f) => ({ ...f, tenant_id: list[0].id }))
      }
    } catch (e) { void e }
  }, [form.tenant_id])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    if (!form.nome || !form.tenant_id || !form.sistema_prompt) {
      setError('Nome, Organização e Prompt do Sistema são obrigatórios')
      setSaving(false)
      return
    }
    try {
      const res = await customAIsAPI.create({
        nome: form.nome,
        descricao: form.descricao,
        sistema_prompt: form.sistema_prompt,
        tenant_id: form.tenant_id,
        modelo: form.modelo,
        temperatura: form.temperatura,
        max_tokens: form.max_tokens,
      })
      const agent = res.data.custom_ai
      setCreatedAgent(agent)
      try {
        const conv = await customAIsAPI.createConversation(agent.id, { tenant_id: form.tenant_id, titulo: 'Teste' })
        setConversationId(conv.data.conversation.id)
      } catch {
        // se falhar, o chat criará na primeira tentativa
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar agente')
    } finally {
      setSaving(false)
    }
  }

  const ensureTestConversation = async () => {
    if (!createdAgent) {
      if (!form.nome || !form.tenant_id || !form.sistema_prompt) return null
      try {
        const res = await customAIsAPI.create({ nome: form.nome, descricao: form.descricao, sistema_prompt: form.sistema_prompt, tenant_id: form.tenant_id, modelo: form.modelo, temperatura: form.temperatura, max_tokens: form.max_tokens })
        setCreatedAgent(res.data.custom_ai)
      } catch (e) {
        return null
      }
    }
    if (!conversationId && createdAgent) {
      try {
        const conv = await customAIsAPI.createConversation(createdAgent.id, { tenant_id: form.tenant_id, titulo: 'Teste' })
        setConversationId(conv.data.conversation.id)
      } catch (e) {
        return null
      }
    }
    return { agentId: createdAgent?.id, convId: conversationId }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)
    const userContent = input.trim()
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: userContent }])
    setInput('')
    try {
      const ctx = await ensureTestConversation()
      if (!ctx) throw new Error('Não foi possível iniciar teste')
      await customAIsAPI.update(ctx.agentId, { sistema_prompt: form.sistema_prompt, descricao: form.descricao, nome: form.nome, modelo: form.modelo, temperatura: form.temperatura, max_tokens: form.max_tokens })
      const res = await customAIsAPI.sendMessage(ctx.convId, { message: userContent, custom_ai_id: ctx.agentId })
      const content = res.data.assistant_message || 'Sem resposta'
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content }])
    } catch (err) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: err.response?.data?.error || 'Erro ao enviar', error: true }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Topbar title="Novo Agente">
        <Button variant="secondary" onClick={() => navigate('/agents')}>Cancelar</Button>
      </Topbar>

      <div className="flex-1 overflow-hidden p-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <div className="rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary p-6 h-full overflow-y-auto flex flex-col">
            <form onSubmit={handleSave} className="space-y-4 flex-1 flex flex-col">
              <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-caption text-neutral-text-secondary mb-2">Prompt do Sistema</label>
                <textarea value={form.sistema_prompt} onChange={(e) => setForm({ ...form, sistema_prompt: e.target.value })} className="w-full flex-1 px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors font-mono text-sm resize-none" required />
              </div>
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Modelo</label>
                <select
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="claude-opus-4-1">Claude Opus 4.1</option>
                  <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                </select>
              </div>
              {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
              </div>
              {createdAgent && (
                <div className="text-small text-neutral-text-secondary text-center">Agente criado: {createdAgent.nome}</div>
              )}
            </form>
          </div>
          <div className="rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-neutral-border dark:border-neutral-border-dark bg-neutral-light-secondary dark:bg-neutral-dark">
              <h3 className="text-body font-semibold">Teste seu Agente</h3>
              <p className="text-caption text-neutral-text-secondary">As alterações são aplicadas automaticamente ao testar.</p>
            </div>
            <div className="flex-1 min-h-0">
              <ChatComponent
                messages={messages}
                loading={false}
                input={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                onSubmit={handleSend}
                placeholder="Teste seu agente aqui..."
                submitLabel="Enviar"
                messagesWidthClass="w-full"
                inputWidthClass="w-full"
                canSubmit={!!input.trim()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}