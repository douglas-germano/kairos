import { Sparkles, FileText, Languages, PenLine } from 'lucide-react'
import Button from './Button'
import { useState } from 'react'

export default function AIToolbar({ editor, onAIAction }) {
    const [showTranslateModal, setShowTranslateModal] = useState(false)
    const [targetLanguage, setTargetLanguage] = useState('inglês')
    const [loading, setLoading] = useState(false)

    const hasSelection = editor?.state.selection.empty === false

    const handleImprove = async () => {
        if (!hasSelection) return
        setLoading(true)
        try {
            const { from, to } = editor.state.selection
            const text = editor.state.doc.textBetween(from, to)
            await onAIAction('improve', text)
        } finally {
            setLoading(false)
        }
    }

    const handleContinue = async () => {
        setLoading(true)
        try {
            const context = editor.getText()
            await onAIAction('continue', context)
        } finally {
            setLoading(false)
        }
    }

    const handleSummarize = async () => {
        if (!hasSelection) return
        setLoading(true)
        try {
            const { from, to } = editor.state.selection
            const text = editor.state.doc.textBetween(from, to)
            await onAIAction('summarize', text)
        } finally {
            setLoading(false)
        }
    }

    const handleTranslate = async () => {
        if (!hasSelection) {
            setShowTranslateModal(false)
            return
        }
        setLoading(true)
        try {
            const { from, to } = editor.state.selection
            const text = editor.state.doc.textBetween(from, to)
            await onAIAction('translate', text, targetLanguage)
            setShowTranslateModal(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="sticky top-[72px] z-30 border-b border-neutral-border dark:border-neutral-border-dark bg-purple-50 dark:bg-purple-900/20">
                <div className="px-xl py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 shrink-0">
                            <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">Ferramentas de IA</span>
                        </div>
                        <div className="flex gap-2 flex-wrap flex-1">
                            <Button
                                variant="secondary"
                                onClick={handleImprove}
                                disabled={!hasSelection || loading}
                                className="flex items-center gap-2 min-w-[160px]"
                                title="Melhora o texto selecionado"
                            >
                                <PenLine size={16} />
                                Melhorar Texto
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleContinue}
                                disabled={loading}
                                className="flex items-center gap-2 min-w-[160px]"
                                title="Continua escrevendo baseado no contexto"
                            >
                                <Sparkles size={16} />
                                Continuar Escrevendo
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleSummarize}
                                disabled={!hasSelection || loading}
                                className="flex items-center gap-2 min-w-[160px]"
                                title="Resume o texto selecionado"
                            >
                                <FileText size={16} />
                                Resumir
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowTranslateModal(true)}
                                disabled={!hasSelection || loading}
                                className="flex items-center gap-2 min-w-[160px]"
                                title="Traduz o texto selecionado"
                            >
                                <Languages size={16} />
                                Traduzir
                            </Button>
                        </div>
                    </div>
                    {loading && (
                        <div className="mt-2 text-sm text-purple-600 dark:text-purple-400">
                            Processando com IA...
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Tradução */}
            {showTranslateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-light dark:bg-neutral-dark-secondary border border-neutral-border dark:border-neutral-border-dark rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-h3 mb-4">Traduzir Texto</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-caption text-neutral-text-secondary mb-2">
                                    Idioma de destino
                                </label>
                                <select
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark text-body text-neutral-text"
                                >
                                    <option value="inglês">Inglês</option>
                                    <option value="espanhol">Espanhol</option>
                                    <option value="francês">Francês</option>
                                    <option value="alemão">Alemão</option>
                                    <option value="italiano">Italiano</option>
                                    <option value="português">Português</option>
                                    <option value="japonês">Japonês</option>
                                    <option value="chinês">Chinês</option>
                                    <option value="coreano">Coreano</option>
                                    <option value="russo">Russo</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={handleTranslate} className="flex-1" disabled={loading}>
                                    {loading ? 'Traduzindo...' : 'Traduzir'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowTranslateModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
