import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customAIsAPI } from '../services/api'
import Button from '../components/Button'
import Topbar from '../components/Topbar'
import Input from '../components/Input'
import ChatComponent from '../components/ChatComponent'

const MODELS = [
    { value: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
]

export default function AgentsEdit() {
    const { agentId } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState({ nome: '', tenant_id: '', descricao: '', sistema_prompt: '', modelo: 'claude-opus-4-1', temperatura: 0.7, max_tokens: 2048 })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Chat Preview State
    const [conversationId, setConversationId] = useState(null)
    const [previewMessages, setPreviewMessages] = useState([])
    const [previewInput, setPreviewInput] = useState('')
    const [previewSending, setPreviewSending] = useState(false)

    const loadAgent = useCallback(async () => {
        try {
            setLoading(true)
            const res = await customAIsAPI.get(agentId)
            const data = res.data || {}
            setForm({
                nome: data.nome || '',
                tenant_id: data.tenant_id || '',
                descricao: data.descricao || '',
                sistema_prompt: data.sistema_prompt || '',
                modelo: data.modelo || 'claude-opus-4-1',
                temperatura: data.temperatura ?? 0.7,
                max_tokens: data.max_tokens ?? 2048,
            })
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao carregar agente')
        } finally {
            setLoading(false)
        }
    }, [agentId])

    useEffect(() => {
        if (agentId) loadAgent()
    }, [loadAgent, agentId])

    const handleSave = async (e) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        if (!form.nome || !form.sistema_prompt) {
            setError('Nome e Prompt do Sistema são obrigatórios')
            setSaving(false)
            return
        }
        try {
            await customAIsAPI.update(agentId, {
                nome: form.nome,
                descricao: form.descricao,
                sistema_prompt: form.sistema_prompt,
                modelo: form.modelo,
                temperatura: form.temperatura,
                max_tokens: form.max_tokens,
            })
            // No redirect, just success indication (could add toast later, for now button state resets)
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar agente')
        } finally {
            setSaving(false)
        }
    }

    const ensureTestConversation = async () => {
        if (!conversationId) {
            try {
                // Create a temporary conversation for testing
                const conv = await customAIsAPI.createConversation(agentId, { tenant_id: form.tenant_id, titulo: 'Teste de Edição' })
                setConversationId(conv.data.conversation.id)
                return conv.data.conversation.id
            } catch (e) {
                return null
            }
        }
        return conversationId
    }

    const handlePreviewSend = async () => {
        if (!previewInput.trim()) return
        setPreviewSending(true)
        const userContent = previewInput.trim()
        setPreviewMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: userContent }])
        setPreviewInput('')

        try {
            // First, temporarily update the agent with current form values so the test reflects changes
            // Note: This saves the changes to the DB. If we wanted "unsaved" preview, backend would need to support ephemeral params.
            // For now, we assume "Test" implies saving or we accept that testing saves the current state.
            // To avoid saving unwanted changes, we could pass params to sendMessage, but backend sendMessage reads from DB.
            // Let's save first (auto-save behavior for test) or warn user. 
            // Given the UX, let's just update the agent.
            await customAIsAPI.update(agentId, {
                nome: form.nome,
                descricao: form.descricao,
                sistema_prompt: form.sistema_prompt,
                modelo: form.modelo,
                temperatura: form.temperatura,
                max_tokens: form.max_tokens,
            })

            const convId = await ensureTestConversation()
            if (!convId) throw new Error('Não foi possível iniciar conversa de teste')

            const res = await customAIsAPI.sendMessage(convId, { message: userContent, custom_ai_id: agentId })
            const content = res.data.assistant_message || 'Sem resposta'
            setPreviewMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content }])
        } catch (err) {
            setPreviewMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: err.response?.data?.error || 'Erro ao enviar', error: true }])
        } finally {
            setPreviewSending(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full text-neutral-text-secondary">Carregando...</div>
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <Topbar title="Editar Agente" subtitle={form.nome}>
                <Button variant="secondary" onClick={() => navigate('/agents')}>Voltar</Button>
            </Topbar>

            <div className="flex-1 overflow-hidden p-xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Form Column */}
                    <div className="rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary p-6 h-full overflow-y-auto flex flex-col">
                        <form onSubmit={handleSave} className="space-y-4 flex-1 flex flex-col">
                            <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />

                            <div>
                                <label className="block text-caption text-neutral-text-secondary mb-2">Descrição</label>
                                <textarea
                                    value={form.descricao}
                                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-caption text-neutral-text-secondary mb-2">Prompt do Sistema</label>
                                <textarea
                                    value={form.sistema_prompt}
                                    onChange={(e) => setForm({ ...form, sistema_prompt: e.target.value })}
                                    className="w-full flex-1 px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors font-mono text-sm resize-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-caption text-neutral-text-secondary mb-2">Modelo</label>
                                <select
                                    value={form.modelo}
                                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text focus:outline-none focus:border-primary transition-colors appearance-none"
                                >
                                    {MODELS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            {error && (<div className="text-small text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>)}

                            <div className="pt-2">
                                <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Salvando…' : 'Salvar Alterações'}</Button>
                            </div>
                        </form>
                    </div>

                    {/* Preview Column */}
                    <div className="flex flex-col h-full rounded-xl border border-neutral-border dark:border-neutral-border-dark bg-neutral-light dark:bg-neutral-dark-secondary overflow-hidden">
                        <div className="p-4 border-b border-neutral-border dark:border-neutral-border-dark bg-neutral-light-secondary dark:bg-neutral-dark">
                            <h3 className="text-body font-semibold">Teste seu Agente</h3>
                            <p className="text-caption text-neutral-text-secondary">As alterações são aplicadas automaticamente ao testar.</p>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ChatComponent
                                messages={previewMessages}
                                loading={previewSending}
                                input={previewInput}
                                onChange={(e) => setPreviewInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handlePreviewSend()
                                    }
                                }}
                                onSubmit={handlePreviewSend}
                                placeholder="Digite uma mensagem para testar..."
                                submitLabel="Enviar"
                                messagesWidthClass="w-full"
                                inputWidthClass="w-full"
                                canSubmit={!!previewInput.trim()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
