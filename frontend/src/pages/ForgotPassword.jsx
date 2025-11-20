import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import Button from '../components/Button'
import Input from '../components/Input'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await authAPI.forgotPassword({ email })
            navigate('/verify-code', { state: { email } })
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao enviar código. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-light dark:bg-neutral-dark p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-h2 font-bold text-neutral-text dark:text-neutral-text-dark">Recuperar Senha</h2>
                    <p className="mt-2 text-body text-neutral-text-secondary">
                        Digite seu email para receber um código de verificação.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-small text-center">{error}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Código'}
                    </Button>

                    <div className="text-center">
                        <Link to="/login" className="text-primary hover:text-primary-dark text-small flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Voltar para Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
