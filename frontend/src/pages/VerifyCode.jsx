import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import Button from '../components/Button'
import Input from '../components/Input'
import { ArrowLeft } from 'lucide-react'

export default function VerifyCode() {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const location = useLocation()
    const email = location.state?.email

    useEffect(() => {
        if (!email) {
            navigate('/forgot-password')
        }
    }, [email, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await authAPI.verifyCode({ email, code })
            if (res.data.valid) {
                navigate('/reset-password', { state: { email, code } })
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Código inválido ou expirado.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-light dark:bg-neutral-dark p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-h2 font-bold text-neutral-text dark:text-neutral-text-dark">Verificar Código</h2>
                    <p className="mt-2 text-body text-neutral-text-secondary">
                        Digite o código de 6 dígitos enviado para {email}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Código de Verificação"
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="text-center tracking-widest text-lg"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-small text-center">{error}</div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                        {loading ? 'Verificando...' : 'Verificar'}
                    </Button>

                    <div className="text-center">
                        <Link to="/forgot-password" className="text-primary hover:text-primary-dark text-small flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Voltar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
