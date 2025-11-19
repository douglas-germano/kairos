import { useState } from 'react'
import { TopbarSlot } from '../components/Layout'
import Button from '../components/Button'
import { Download, Sparkles, Image as ImageIcon } from 'lucide-react'
import axios from 'axios'
import useAuth from '../contexts/useAuth'

export default function Images() {
    const { user } = useAuth()
    const token = localStorage.getItem('token')
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [generatedImage, setGeneratedImage] = useState(null)
    const [error, setError] = useState(null)

    const handleGenerate = async (e) => {
        e.preventDefault()
        if (!prompt.trim() || loading) return

        setLoading(true)
        setError(null)
        setGeneratedImage(null)

        try {
            const res = await axios.post(
                'http://localhost:5001/api/v1/images/create',
                {
                    prompt: prompt,
                    provider: 'google', // Nano Banana
                    width: 1024,
                    height: 1024
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            if (res.data && res.data.image_url) {
                setGeneratedImage(res.data.image_url)
            } else {
                throw new Error('Nenhuma imagem retornada')
            }
        } catch (err) {
            console.error(err)
            setError(err.response?.data?.error || err.message || 'Erro ao gerar imagem')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = () => {
        if (!generatedImage) return
        const link = document.createElement('a')
        link.href = generatedImage
        link.download = `nano-banana-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="h-full flex flex-col bg-neutral-light dark:bg-neutral-dark">
            <TopbarSlot title="Imagens" subtitle="Crie imagens com Nano Banana (Gemini)">
                <div />
            </TopbarSlot>

            <div className="flex-1 p-lg overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Input Section */}
                    <div className="bg-neutral-light-secondary dark:bg-neutral-dark-secondary p-6 rounded-lg border border-neutral-border dark:border-neutral-border-dark">
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-small font-medium mb-2 text-neutral-text">Prompt da Imagem</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Descreva a imagem que você quer criar..."
                                    className="w-full px-4 py-3 rounded-md bg-neutral-light dark:bg-neutral-dark border border-neutral-border dark:border-neutral-border-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none h-32"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading || !prompt.trim()}>
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Sparkles size={18} className="animate-spin" /> Gerando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles size={18} /> Gerar Imagem
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Result Section */}
                    {generatedImage && (
                        <div className="bg-neutral-light-secondary dark:bg-neutral-dark-secondary p-6 rounded-lg border border-neutral-border dark:border-neutral-border-dark flex flex-col items-center space-y-4">
                            <div className="relative group w-full aspect-square max-w-lg bg-neutral-light dark:bg-neutral-dark rounded-md overflow-hidden flex items-center justify-center border border-neutral-border dark:border-neutral-border-dark">
                                <img
                                    src={generatedImage}
                                    alt="Generated"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={handleDownload}>
                                    <Download size={18} className="mr-2" /> Baixar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!generatedImage && !loading && !error && (
                        <div className="text-center py-12 text-neutral-text-secondary">
                            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Suas criações aparecerão aqui</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
