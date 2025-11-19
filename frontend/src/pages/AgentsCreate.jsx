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
    <div className="h-full flex flex-col">
      <Topbar title="Novo Agente" />

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text" />
              </div>
              <div>
                <label className="block text-caption text-neutral-text-secondary mb-2">Prompt do Sistema</label>
                <textarea value={form.sistema_prompt} onChange={(e) => setForm({ ...form, sistema_prompt: e.target.value })} rows={8} className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-caption text-neutral-text-secondary mb-2">Modelo</label>
                  <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-caption text-neutral-text-secondary mb-2">Temperatura</label>
                  <Input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-caption text-neutral-text-secondary mb-2">Max Tokens</label>
                  <Input type="number" value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })} />
                </div>
              </div>
              {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/agents')}>Cancelar</Button>
              </div>
              {createdAgent && (
                <div className="text-small text-neutral-text-secondary">Agente criado: {createdAgent.nome}</div>
              )}
            </form>
          </div>
          <div className="rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary flex flex-col min-h-0">
            <ChatComponent
              messages={previewMessages}
              loading={false}
              input={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handlePreviewSend()
                }
              }}
              onSubmit={handlePreviewSend}
              placeholder="Teste seu agente aqui..."
              submitLabel="Enviar"
              messagesWidthClass="w-full"
              inputWidthClass="w-full"
              canSubmit={!!previewInput.trim()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}